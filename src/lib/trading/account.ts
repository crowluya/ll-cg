import type { ModelAccount, Position, Trade } from '@/types';
import { saveTrade, savePositionSnapshot, saveAccountSnapshot } from '@/lib/db/queries';
import { getTradingEngine } from './engine';

/**
 * 模型账户管理器
 * 负责管理多个AI模型的交易账户
 */
export class ModelAccountManager {
  private readonly initialCapital: number;
  private readonly enablePersistence: boolean;

  constructor(initialCapital: number = 100000, enablePersistence: boolean = true) {
    this.initialCapital = initialCapital;
    this.enablePersistence = enablePersistence;
  }

  /**
   * 创建模型账户
   */
  createAccount(model: string): ModelAccount {
    const engine = getTradingEngine();
    return engine.getOrCreateAccount(model);
  }

  /**
   * 获取账户信息
   */
  getAccount(model: string): ModelAccount | undefined {
    const engine = getTradingEngine();
    return engine.getAccount(model);
  }

  /**
   * 获取所有账户
   */
  getAllAccounts(): ModelAccount[] {
    const engine = getTradingEngine();
    return engine.getAllAccounts();
  }

  /**
   * 更新账户现金
   */
  updateCash(model: string, amount: number): void {
    const account = this.getAccount(model);
    if (account) {
      account.currentCapital = amount;
    }
  }

  /**
   * 添加持仓
   */
  addPosition(model: string, position: Position): void {
    const account = this.getAccount(model);
    if (account) {
      const existingIndex = account.positions.findIndex(p => p.stock === position.stock);

      if (existingIndex !== -1) {
        // 已有持仓，更新
        const existing = account.positions[existingIndex];
        const totalCost = existing.avgPrice * existing.quantity + position.avgPrice * position.quantity;
        const totalQuantity = existing.quantity + position.quantity;
        existing.avgPrice = totalCost / totalQuantity;
        existing.quantity = totalQuantity;
      } else {
        // 新建持仓
        account.positions.push(position);
      }
    }
  }

  /**
   * 减少持仓
   */
  removePosition(model: string, stock: string, quantity: number): void {
    const account = this.getAccount(model);
    if (account) {
      const position = account.positions.find(p => p.stock === stock);
      if (position) {
        position.quantity -= quantity;

        // 如果持仓为0，移除
        if (position.quantity <= 0) {
          const index = account.positions.findIndex(p => p.stock === stock);
          if (index !== -1) {
            account.positions.splice(index, 1);
          }
        }
      }
    }
  }

  /**
   * 保存账户快照到数据库
   */
  async saveAccountSnapshot(model: string, date: string): Promise<void> {
    if (!this.enablePersistence) return;

    const account = this.getAccount(model);
    if (!account) return;

    await saveAccountSnapshot({
      id: `${model}-${date}-${Date.now()}`,
      model,
      date,
      cash: account.currentCapital,
      totalValue: account.totalValue,
      profit: account.profit,
      profitRate: account.profitRate,
      positionsData: account.positions,
    });
  }

  /**
   * 批量保存所有账户快照
   */
  async saveAllAccountSnapshots(date: string): Promise<void> {
    if (!this.enablePersistence) return;

    const accounts = this.getAllAccounts();

    for (const account of accounts) {
      await this.saveAccountSnapshot(account.model, date);
    }
  }

  /**
   * 获取账户历史快照
   */
  async getAccountHistory(model: string, startDate?: string, endDate?: string): Promise<any[]> {
    if (!this.enablePersistence) return [];

    const { getAccountSnapshots } = await import('@/lib/db/queries');
    const snapshots = await getAccountSnapshots({
      model,
      startDate,
      endDate,
      limit: 1000,
    });

    return snapshots;
  }

  /**
   * 重置模型账户
   */
  resetAccount(model: string): void {
    const engine = getTradingEngine();
    engine.resetAccount(model);
  }

  /**
   * 重置所有账户
   */
  resetAll(): void {
    const engine = getTradingEngine();
    engine.resetAll();
  }

  /**
   * 获取账户排名（按盈亏率）
   */
  getRanking(): Array<{
    model: string;
    profit: number;
    profitRate: number;
    rank: number;
  }> {
    const accounts = this.getAllAccounts();

    return accounts
      .map((account, index) => ({
        model: account.model,
        profit: account.profit,
        profitRate: account.profitRate,
        rank: 0,
      }))
      .sort((a, b) => b.profitRate - a.profitRate)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  /**
   * 获取账户统计摘要
   */
  getSummary(): {
    totalAccounts: number;
    totalProfit: number;
    avgProfitRate: number;
    bestModel: string | null;
    worstModel: string | null;
    profitableModels: number;
    losingModels: number;
  } {
    const accounts = this.getAllAccounts();

    if (accounts.length === 0) {
      return {
        totalAccounts: 0,
        totalProfit: 0,
        avgProfitRate: 0,
        bestModel: null,
        worstModel: null,
        profitableModels: 0,
        losingModels: 0,
      };
    }

    const totalProfit = accounts.reduce((sum, acc) => sum + acc.profit, 0);
    const avgProfitRate = totalProfit / accounts.length;

    const sorted = [...accounts].sort((a, b) => b.profitRate - a.profitRate);
    const bestModel = sorted[0]?.model || null;
    const worstModel = sorted[sorted.length - 1]?.model || null;

    const profitableModels = accounts.filter(acc => acc.profit > 0).length;
    const losingModels = accounts.filter(acc => acc.profit < 0).length;

    return {
      totalAccounts: accounts.length,
      totalProfit,
      avgProfitRate,
      bestModel,
      worstModel,
      profitableModels,
      losingModels,
    };
  }
}

// 全局账户管理器实例
let globalAccountManager: ModelAccountManager | null = null;

/**
 * 获取全局账户管理器
 */
export function getAccountManager(): ModelAccountManager {
  if (!globalAccountManager) {
    globalAccountManager = new ModelAccountManager();
  }
  return globalAccountManager;
}

/**
 * 重置全局账户管理器
 */
export function resetAccountManager(): void {
  globalAccountManager = null;
}
