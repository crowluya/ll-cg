/**
 * AI 代理类
 *
 * Phase 4.2: AI 代理类实现
 *
 * 负责管理单个 AI 模型的账户状态和交易决策
 */

import { getAIDecision, validateAIDecision } from './decision';
import { validateDecisionWithContext, type ValidationContext } from './schema';
import { formatDate } from '@/lib/utils/date';
import type { AIModelKey, AIDecision, Account, Position, Trade, StockData, RealtimeQuote, IntradayPoint } from '@/types';

// 交易配置接口
export interface AgentConfig {
  maxPositionRatio?: number;   // 单票持仓上限（比例 0-1）
  thinkInterval?: number;       // 思考间隔（秒）
}

// 市场数据接口
export interface MarketData {
  stockCode: string;
  historyData: StockData[];
  currentPosition?: Position;
  availableCapital: number;
  currentDate: string;
  realtimeQuotes?: Map<string, RealtimeQuote>;  // 实时行情（可选）
  intradayData?: IntradayPoint[];                // 分时数据（可选）
}

// 更新账户的交易参数
interface TradeUpdate {
  type: 'buy' | 'sell';
  stock: string;
  price: number;
  quantity: number;
  timestamp: string;
  reason?: string;
}

/**
 * AI 代理类
 * 管理单个 AI 模型的交易账户和决策
 */
export class AIAgent {
  private readonly id: string;
  private readonly model: AIModelKey;
  private readonly config: Required<AgentConfig>;
  private cash: number;
  private positions: Map<string, Position>;  // stock -> Position
  private trades: Trade[];
  private initialCapital: number;

  /**
   * 创建 AI 代理实例
   * @param id 代理唯一标识
   * @param model AI 模型键
   * @param initialCapital 初始资金
   * @param config 交易配置
   */
  constructor(
    id: string,
    model: AIModelKey,
    initialCapital: number = 100000,
    config: AgentConfig = {}
  ) {
    this.id = id;
    this.model = model;
    this.initialCapital = initialCapital;
    this.cash = initialCapital;
    this.positions = new Map();
    this.trades = [];

    // 默认配置
    this.config = {
      maxPositionRatio: config.maxPositionRatio ?? 0.5,
      thinkInterval: config.thinkInterval ?? 10,
    };
  }

  /**
   * 获取代理 ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * 获取使用的模型
   */
  getModel(): AIModelKey {
    return this.model;
  }

  /**
   * AI 思考并做出交易决策
   * @param marketData 市场数据
   * @returns AI 决策
   */
  async think(marketData: MarketData): Promise<AIDecision> {
    try {
      // 调用 AI 获取决策
      const decision = await getAIDecision(this.model, marketData);

      // 使用增强验证（结合上下文）
      const context: ValidationContext = {
        availableCapital: marketData.availableCapital,
        currentPosition: marketData.currentPosition,
        currentDate: marketData.currentDate,
        maxPositionRatio: this.config.maxPositionRatio,
      };

      // 获取当前价格（如果可用）
      if (marketData.historyData.length > 0) {
        context.currentPrice = marketData.historyData[marketData.historyData.length - 1].close;
      }

      const validation = validateDecisionWithContext(decision, context);

      if (!validation.valid) {
        return {
          action: 'hold',
          reason: `决策验证失败: ${validation.errors.join(', ')}`,
        };
      }

      // 记录警告（如果有）
      if (validation.warnings.length > 0) {
        console.warn(`[AIAgent:${this.id}] Decision warnings:`, validation.warnings);
      }

      // 验证通过，执行决策并更新账户
      this.executeDecision(decision, marketData);

      return decision;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      return {
        action: 'hold',
        reason: `AI 调用失败: ${errorMsg}`,
      };
    }
  }

  /**
   * 执行决策并更新账户
   * @param decision AI 决策
   * @param marketData 市场数据
   */
  private executeDecision(decision: AIDecision, marketData: MarketData): void {
    if (decision.action === 'hold') {
      return;
    }

    const { stock, quantity } = decision;
    if (!stock || !quantity) {
      return;
    }

    // 获取当前价格（使用最新收盘价）
    if (marketData.historyData.length === 0) {
      console.warn('[AIAgent] executeDecision: historyData is empty, cannot execute trade');
      return;
    }
    const latestData = marketData.historyData[marketData.historyData.length - 1];
    const price = latestData.close;

    if (decision.action === 'buy') {
      this.updateAccount({
        type: 'buy',
        stock,
        price,
        quantity,
        timestamp: new Date().toISOString(),
        reason: decision.reason,
      });
    } else if (decision.action === 'sell') {
      this.updateAccount({
        type: 'sell',
        stock,
        price,
        quantity,
        timestamp: new Date().toISOString(),
        reason: decision.reason,
      });
    }
  }

  /**
   * 获取当前账户状态
   * @param currentPrices 当前股价映射（可选）
   * @returns 账户信息
   */
  getAccount(currentPrices?: Map<string, number>): Account {
    const positionsArray = Array.from(this.positions.values());

    // 计算持仓市值 - 修复：使用当前价格而非成本价
    let marketValue = 0;
    const extendedPositions = positionsArray.map(pos => {
      // 优先使用传入的当前价格，否则使用成本价作为fallback
      const currentPrice = currentPrices?.get(pos.stock) ?? pos.avgPrice;
      const positionMarketValue = pos.quantity * currentPrice;
      const profit = positionMarketValue - (pos.quantity * pos.avgPrice);
      const profitRate = pos.avgPrice > 0 ? (profit / (pos.quantity * pos.avgPrice)) * 100 : 0;

      marketValue += positionMarketValue;

      return {
        ...pos,
        stockName: pos.stock, // 简化处理，实际应查询股票名称
        currentPrice,
        availableToday: pos.quantity, // 简化 T+1 处理
        marketValue: positionMarketValue,
        profit,
        profitRate,
      };
    });

    const totalValue = this.cash + marketValue;
    const profit = totalValue - this.initialCapital;
    const profitRate = this.initialCapital > 0 ? (profit / this.initialCapital) * 100 : 0;

    return {
      agentId: this.id,
      initialCapital: this.initialCapital,
      cash: this.cash,
      positions: extendedPositions,
      totalValue,
      marketValue,
      profit,
      profitRate,
      dailyProfit: 0, // TODO: 需要历史数据计算
      dailyProfitRate: 0, // TODO: 需要历史数据计算
    };
  }

  /**
   * 更新账户（执行交易）
   * @param tradeUpdate 交易更新参数
   */
  updateAccount(tradeUpdate: TradeUpdate): void {
    const { type, stock, price, quantity, timestamp, reason } = tradeUpdate;

    // 创建交易记录（使用更可靠的 ID 生成）
    const tradeId = `${this.id}-${stock}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
    const trade: Trade = {
      id: tradeId,
      model: this.model,
      stock,
      stockName: stock, // 简化处理
      type,
      price,
      quantity,
      date: timestamp.split('T')[0],
      timestamp,
      reason,
    };
    this.trades.push(trade);

    if (type === 'buy') {
      // 扣除现金
      const cost = price * quantity;
      this.cash -= cost;

      // 更新持仓
      const existing = this.positions.get(stock);
      if (existing) {
        // 加仓：计算新的平均成本
        const totalValue = existing.quantity * existing.avgPrice + quantity * price;
        const totalQuantity = existing.quantity + quantity;
        existing.avgPrice = totalValue / totalQuantity;
        existing.quantity = totalQuantity;
      } else {
        // 新建持仓
        this.positions.set(stock, {
          stock,
          quantity,
          buyDate: timestamp.split('T')[0],
          avgPrice: price,
        });
      }
    } else if (type === 'sell') {
      // 增加现金
      const proceeds = price * quantity;
      this.cash += proceeds;

      // 更新持仓
      const existing = this.positions.get(stock);
      if (existing) {
        existing.quantity -= quantity;
        if (existing.quantity <= 0) {
          // 全部卖出，移除持仓
          this.positions.delete(stock);
        }
      }
    }
  }

  /**
   * 重置代理到初始状态
   * @param newInitialCapital 新的初始资金（可选）
   */
  reset(newInitialCapital?: number): void {
    if (newInitialCapital !== undefined) {
      this.initialCapital = newInitialCapital;
    }
    this.cash = this.initialCapital;
    this.positions.clear();
    this.trades = [];
  }

  /**
   * 获取交易历史
   * @returns 交易记录列表
   */
  getTrades(): Trade[] {
    return [...this.trades];
  }

  /**
   * 获取配置
   * @returns 代理配置
   */
  getConfig(): Required<AgentConfig> {
    return { ...this.config };
  }
}
