import type { BacktestConfig, BacktestResult, StockData } from '@/types';
import { getTradingEngine } from '@/lib/trading/engine';
import { getAccountManager } from '@/lib/trading/account';
import { getBatchAIDecisions } from '@/lib/ai/decision';
import { fetchStockData } from '@/lib/data/sina-api';
import { getTradingDays } from '@/lib/trading/rules';
import { saveTrade, savePositionSnapshot, saveAccountSnapshot, saveAIDecision } from '@/lib/db/queries';

/**
 * 回测执行进度回调
 */
export interface BacktestProgress {
  currentDate: string;
  completedDays: number;
  totalDays: number;
  currentResults: Map<string, BacktestResult>;
}

/**
 * 回测执行器
 */
export class BacktestRunner {
  private engine = getTradingEngine();
  private accountManager = getAccountManager();
  private progressCallback?: (progress: BacktestProgress) => void;

  constructor(onProgress?: (progress: BacktestProgress) => void) {
    this.progressCallback = onProgress;
  }

  /**
   * 运行回测
   */
  async run(config: BacktestConfig): Promise<Map<string, BacktestResult>> {
    // 重置引擎和账户
    this.engine.resetAll();
    this.accountManager.resetAll();

    // 初始化模型账户
    for (const model of config.models) {
      this.accountManager.createAccount(model);
    }

    // 获取交易日列表
    const tradingDays = getTradingDays(config.startDate, config.endDate);
    const totalDays = tradingDays.length;

    // 获取股票数据
    const stockDataMap = new Map<string, StockData[]>();
    for (const stock of config.stocks) {
      try {
        const data = await fetchStockData(stock, totalDays + config.historyDays);
        stockDataMap.set(stock, data);
      } catch (error) {
        console.error(`Failed to fetch data for ${stock}:`, error);
      }
    }

    const results = new Map<string, BacktestResult>();

    // 逐日回测
    for (let i = 0; i < tradingDays.length; i++) {
      const currentDate = tradingDays[i];
      const completedDays = i + 1;

      // 更新进度
      if (this.progressCallback) {
        this.progressCallback({
          currentDate,
          completedDays,
          totalDays,
          currentResults: results,
        });
      }

      // 为每个模型执行决策
      for (const model of config.models) {
        await this.runModelDay(model, currentDate, config, stockDataMap);
      }

      // 保存账户快照
      await this.accountManager.saveAllAccountSnapshots(currentDate);
    }

    // 生成最终结果
    for (const model of config.models) {
      results.set(model, this.generateResult(model, config.stocks, stockDataMap));
    }

    return results;
  }

  /**
   * 为单个模型执行单日决策
   */
  private async runModelDay(
    model: string,
    currentDate: string,
    config: BacktestConfig,
    stockDataMap: Map<string, StockData[]>
  ): Promise<void> {
    const account = this.engine.getAccount(model);
    if (!account) return;

    // 获取当前价格
    const currentPrices = new Map<string, number>();
    for (const [stock, data] of stockDataMap.entries()) {
      const currentData = data.find(d => d.date === currentDate);
      if (currentData) {
        currentPrices.set(stock, currentData.close);
      }
    }

    // 更新账户价值
    this.engine.updateAccount(model, currentPrices);

    // 检查是否在交易时间
    // 简化处理：每个交易日执行一次决策
    for (const stock of config.stocks) {
      const historyData = stockDataMap.get(stock);
      if (!historyData) continue;

      // 获取截止当前日期的历史数据
      const historyUntilNow = historyData.filter(d => d.date <= currentDate);

      if (historyUntilNow.length < config.historyDays) {
        continue; // 历史数据不足
      }

      // 获取历史数据（用于AI决策）
      const inputHistoryData = historyUntilNow.slice(-config.historyDays);

      // 获取当前持仓
      const currentPosition = this.engine.getPosition(model, stock);

      // 调用AI决策
      try {
        const decisions = await getBatchAIDecisions([model as any], {
          stockCode: stock,
          historyData: inputHistoryData,
          currentPosition,
          availableCapital: account.currentCapital,
          currentDate,
        });

        const decision = decisions.get(model as any);
        if (!decision) continue;

        // 保存AI决策记录
        await saveAIDecision({
          id: `${model}-${stock}-${currentDate}-${Date.now()}`,
          model,
          stock,
          decisionTime: new Date(currentDate),
          inputData: {
            historyData: inputHistoryData,
            currentPosition,
            availableCapital: account.currentCapital,
            currentDate,
          },
          outputDecision: decision,
          executionResult: {
            executed: false,
          },
        });

        // 执行决策
        await this.executeDecision(model, stock, decision, currentDate, currentPrices, historyUntilNow);

      } catch (error) {
        console.error(`AI decision failed for ${model} on ${currentDate}:`, error);
      }
    }
  }

  /**
   * 执行AI决策
   */
  private async executeDecision(
    model: string,
    stock: string,
    decision: any,
    date: string,
    currentPrices: Map<string, number>,
    historyData: StockData[]
  ): Promise<void> {
    const currentPrice = currentPrices.get(stock) || historyData[historyData.length - 1]?.close || 0;

    if (decision.action === 'buy') {
      const quantity = decision.quantity || this.calculateRecommendedQuantity(
        this.engine.getAccount(model)?.currentCapital || 0,
        currentPrice
      );

      const result = this.engine.executeBuy(model, stock, quantity, currentPrice, date);

      if (result.success && result.trade) {
        await saveTrade(result.trade);
      }
    } else if (decision.action === 'sell') {
      const position = this.engine.getPosition(model, stock);
      if (!position) return;

      const quantity = decision.quantity || position.quantity;
      const result = this.engine.executeSell(model, stock, quantity, currentPrice, date);

      if (result.success && result.trade) {
        await saveTrade(result.trade);
      }
    }
  }

  /**
   * 计算推荐买入数量
   */
  private calculateRecommendedQuantity(capital: number, price: number): number {
    // 使用资金的80%用于单笔交易
    const useCapital = capital * 0.8;
    return Math.floor(useCapital / price / 100) * 100;
  }

  /**
   * 生成回测结果
   */
  private generateResult(
    model: string,
    stocks: string[],
    stockDataMap: Map<string, StockData[]>
  ): BacktestResult {
    const account = this.engine.getAccount(model);
    if (!account) {
      return {
        model,
        trades: [],
        finalValue: 0,
        profit: 0,
        profitRate: 0,
        winRate: 0,
      };
    }

    // 获取最新价格
    const currentPrices = new Map<string, number>();
    for (const [stock, data] of stockDataMap.entries()) {
      if (data.length > 0) {
        currentPrices.set(stock, data[data.length - 1].close);
      }
    }

    // 计算盈亏
    const { profit, profitRate } = this.engine.getProfit(model, currentPrices);

    // 计算胜率
    const trades = account.trades;
    let winCount = 0;
    let lossCount = 0;

    // 按股票配对买卖交易计算盈亏
    const buyTrades = new Map<string, { price: number; quantity: number }>();

    for (const trade of trades) {
      if (trade.type === 'buy') {
        buyTrades.set(trade.stock, { price: trade.price, quantity: trade.quantity });
      } else if (trade.type === 'sell') {
        const buyTrade = buyTrades.get(trade.stock);
        if (buyTrade) {
          const profit = (trade.price - buyTrade.price) * buyTrade.quantity;
          if (profit > 0) {
            winCount++;
          } else if (profit < 0) {
            lossCount++;
          }
          buyTrades.delete(trade.stock);
        }
      }
    }

    const totalCompletedTrades = winCount + lossCount;
    const winRate = totalCompletedTrades > 0 ? winCount / totalCompletedTrades : 0;

    // 计算夏普比率（简化版）
    const returns = this.calculateDailyReturns(model, stocks, stockDataMap);
    const sharpeRatio = this.calculateSharpeRatio(returns);

    // 计算最大回撤
    const maxDrawdown = this.calculateMaxDrawdown(model, stocks, stockDataMap);

    return {
      model,
      trades: account.trades,
      finalValue: account.totalValue,
      profit,
      profitRate,
      winRate,
      sharpeRatio,
      maxDrawdown,
    };
  }

  /**
   * 计算每日收益率序列
   */
  private calculateDailyReturns(
    model: string,
    stocks: string[],
    stockDataMap: Map<string, StockData[]>
  ): number[] {
    // 简化实现：返回空数组
    // 实际实现需要追踪每日账户价值
    return [];
  }

  /**
   * 计算夏普比率
   */
  private calculateSharpeRatio(returns: number[]): number | undefined {
    if (returns.length < 2) return undefined;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    // 假设无风险利率为0
    return avgReturn / stdDev * Math.sqrt(252); // 年化
  }

  /**
   * 计算最大回撤
   */
  private calculateMaxDrawdown(
    model: string,
    stocks: string[],
    stockDataMap: Map<string, StockData[]>
  ): number {
    // 简化实现：返回0
    // 实际实现需要追踪账户价值峰值和回撤
    return 0;
  }
}

/**
 * 运行回测的便捷函数
 */
export async function runBacktest(
  config: BacktestConfig,
  onProgress?: (progress: BacktestProgress) => void
): Promise<Map<string, BacktestResult>> {
  const runner = new BacktestRunner(onProgress);
  return runner.run(config);
}
