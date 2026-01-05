import type { ModelAccount, Position, Trade } from '@/types';
import { canSellPosition, calculateBuyQuantity, validateBuyOrder, validateSellOrder, calculateCommission } from './rules';

/**
 * 交易引擎类
 * 负责执行交易、管理持仓、计算盈亏
 */
export class TradingEngine {
  private accounts: Map<string, ModelAccount> = new Map();
  private readonly initialCapital: number = 100000;

  constructor(initialCapital: number = 100000) {
    this.initialCapital = initialCapital;
  }

  /**
   * 创建或获取模型账户
   */
  getOrCreateAccount(model: string): ModelAccount {
    if (!this.accounts.has(model)) {
      this.accounts.set(model, {
        model,
        initialCapital: this.initialCapital,
        currentCapital: this.initialCapital,
        positions: [],
        trades: [],
        totalValue: this.initialCapital,
        profit: 0,
        profitRate: 0,
      });
    }
    return this.accounts.get(model)!;
  }

  /**
   * 获取账户信息
   */
  getAccount(model: string): ModelAccount | undefined {
    return this.accounts.get(model);
  }

  /**
   * 获取所有账户
   */
  getAllAccounts(): ModelAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * 执行买入操作
   */
  executeBuy(
    model: string,
    stock: string,
    quantity: number,
    price: number,
    date: string,
    timestamp?: string
  ): {
    success: boolean;
    trade?: Trade;
    error?: string;
  } {
    const account = this.getOrCreateAccount(model);

    // 验证订单
    const validation = validateBuyOrder(stock, quantity, price, account.currentCapital);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 计算交易金额和手续费
    const amount = quantity * price;
    const commission = calculateCommission(amount, 'buy');
    const totalAmount = amount + commission;

    // 检查资金是否充足（包括手续费）
    if (totalAmount > account.currentCapital) {
      return { success: false, error: `资金不足（含手续费）: 需要${totalAmount.toFixed(2)}元` };
    }

    // 创建交易记录
    const trade: Trade = {
      id: `${model}-${stock}-buy-${Date.now()}`,
      model,
      stock,
      type: 'buy',
      price,
      quantity,
      date,
      timestamp: timestamp || new Date().toISOString(),
    };

    // 更新账户现金
    account.currentCapital -= totalAmount;

    // 更新持仓
    const existingPosition = account.positions.find(p => p.stock === stock);
    if (existingPosition) {
      // 加仓：计算新的平均成本
      const oldCost = existingPosition.avgPrice * existingPosition.quantity;
      const newCost = price * quantity;
      const totalQuantity = existingPosition.quantity + quantity;
      existingPosition.avgPrice = (oldCost + newCost) / totalQuantity;
      existingPosition.quantity = totalQuantity;
    } else {
      // 新建持仓
      account.positions.push({
        stock,
        quantity,
        buyDate: date,
        avgPrice: price,
      });
    }

    // 记录交易
    account.trades.push(trade);

    return { success: true, trade };
  }

  /**
   * 执行卖出操作
   */
  executeSell(
    model: string,
    stock: string,
    quantity: number,
    price: number,
    date: string,
    timestamp?: string
  ): {
    success: boolean;
    trade?: Trade;
    error?: string;
  } {
    const account = this.getOrCreateAccount(model);
    const position = account.positions.find(p => p.stock === stock);

    // 验证订单
    const validation = validateSellOrder(stock, quantity, position, date);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 计算交易金额和手续费
    const amount = quantity * price;
    const commission = calculateCommission(amount, 'sell');
    const netAmount = amount - commission;

    // 创建交易记录
    const trade: Trade = {
      id: `${model}-${stock}-sell-${Date.now()}`,
      model,
      stock,
      type: 'sell',
      price,
      quantity,
      date,
      timestamp: timestamp || new Date().toISOString(),
    };

    // 更新账户现金
    account.currentCapital += netAmount;

    // 更新持仓
    if (position!) {
      position.quantity -= quantity;

      // 如果持仓全部卖出，从列表中移除
      if (position.quantity === 0) {
        const index = account.positions.findIndex(p => p.stock === stock);
        if (index !== -1) {
          account.positions.splice(index, 1);
        }
      }
    }

    // 记录交易
    account.trades.push(trade);

    return { success: true, trade };
  }

  /**
   * 获取模型当前持仓
   */
  getPositions(model: string): Position[] {
    const account = this.getAccount(model);
    return account?.positions || [];
  }

  /**
   * 获取指定股票的持仓
   */
  getPosition(model: string, stock: string): Position | undefined {
    const positions = this.getPositions(model);
    return positions.find(p => p.stock === stock);
  }

  /**
   * 计算账户总价值
   */
  getAccountValue(model: string, currentPrices: Map<string, number>): number {
    const account = this.getAccount(model);
    if (!account) return 0;

    let totalValue = account.currentCapital;

    for (const position of account.positions) {
      const currentPrice = currentPrices.get(position.stock) || position.avgPrice;
      totalValue += position.quantity * currentPrice;
    }

    return totalValue;
  }

  /**
   * 计算盈亏
   */
  getProfit(model: string, currentPrices: Map<string, number>): {
    profit: number;
    profitRate: number;
  } {
    const account = this.getAccount(model);
    if (!account) {
      return { profit: 0, profitRate: 0 };
    }

    const totalValue = this.getAccountValue(model, currentPrices);
    const profit = totalValue - account.initialCapital;
    const profitRate = (profit / account.initialCapital) * 100;

    return { profit, profitRate };
  }

  /**
   * 更新账户状态
   */
  updateAccount(model: string, currentPrices: Map<string, number>): ModelAccount {
    const account = this.getOrCreateAccount(model);
    const totalValue = this.getAccountValue(model, currentPrices);
    const profit = totalValue - account.initialCapital;
    const profitRate = (profit / account.initialCapital) * 100;

    account.totalValue = totalValue;
    account.profit = profit;
    account.profitRate = profitRate;

    return account;
  }

  /**
   * 更新所有账户状态
   */
  updateAllAccounts(currentPrices: Map<string, number>): ModelAccount[] {
    const updatedAccounts: ModelAccount[] = [];

    for (const model of this.accounts.keys()) {
      updatedAccounts.push(this.updateAccount(model, currentPrices));
    }

    return updatedAccounts;
  }

  /**
   * 获取交易历史
   */
  getTrades(model: string): Trade[] {
    const account = this.getAccount(model);
    return account?.trades || [];
  }

  /**
   * 获取所有交易历史
   */
  getAllTrades(): Trade[] {
    const allTrades: Trade[] = [];

    for (const account of this.accounts.values()) {
      allTrades.push(...account.trades);
    }

    return allTrades.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * 重置账户
   */
  resetAccount(model: string): void {
    this.accounts.delete(model);
  }

  /**
   * 重置所有账户
   */
  resetAll(): void {
    this.accounts.clear();
  }

  /**
   * 计算交易统计
   */
  getTradeStats(model: string): {
    totalTrades: number;
    buyTrades: number;
    sellTrades: number;
    totalBuyAmount: number;
    totalSellAmount: number;
    avgBuyPrice: number;
    avgSellPrice: number;
  } {
    const trades = this.getTrades(model);

    const buyTrades = trades.filter(t => t.type === 'buy');
    const sellTrades = trades.filter(t => t.type === 'sell');

    const totalBuyAmount = buyTrades.reduce((sum, t) => sum + t.price * t.quantity, 0);
    const totalSellAmount = sellTrades.reduce((sum, t) => sum + t.price * t.quantity, 0);

    const totalBuyQuantity = buyTrades.reduce((sum, t) => sum + t.quantity, 0);
    const totalSellQuantity = sellTrades.reduce((sum, t) => sum + t.quantity, 0);

    return {
      totalTrades: trades.length,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      totalBuyAmount,
      totalSellAmount,
      avgBuyPrice: totalBuyQuantity > 0 ? totalBuyAmount / totalBuyQuantity : 0,
      avgSellPrice: totalSellQuantity > 0 ? totalSellAmount / totalSellQuantity : 0,
    };
  }
}

// 创建全局交易引擎实例
let globalEngine: TradingEngine | null = null;

/**
 * 获取全局交易引擎实例
 */
export function getTradingEngine(): TradingEngine {
  if (!globalEngine) {
    globalEngine = new TradingEngine();
  }
  return globalEngine;
}

/**
 * 重置全局交易引擎
 */
export function resetTradingEngine(): void {
  globalEngine = null;
}
