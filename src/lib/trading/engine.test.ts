/**
 * 交易引擎单元测试
 * 测试文件: src/lib/trading/engine.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TradingEngine, resetTradingEngine } from './engine';

describe('TradingEngine', () => {
  let engine: TradingEngine;

  beforeEach(() => {
    engine = new TradingEngine(100000);
    resetTradingEngine();
  });

  // ============= 初始化测试 =============

  describe('初始化', () => {
    it('账户初始资金为100000', () => {
      const account = engine.getOrCreateAccount('deepseek');
      expect(account.initialCapital).toBe(100000);
      expect(account.currentCapital).toBe(100000);
    });

    it('初始持仓为空', () => {
      const account = engine.getOrCreateAccount('deepseek');
      expect(account.positions).toEqual([]);
      expect(account.trades).toEqual([]);
    });

    it('自定义初始资金', () => {
      const customEngine = new TradingEngine(200000);
      const account = customEngine.getOrCreateAccount('deepseek');
      expect(account.initialCapital).toBe(200000);
    });
  });

  // ============= executeBuy 测试 =============

  describe('executeBuy', () => {
    it('买入成功：资金减少，持仓增加', () => {
      const result = engine.executeBuy('deepseek', 'sz000001', 100, 10.5, '2024-01-02');

      expect(result.success).toBe(true);
      expect(result.trade).toBeDefined();
      expect(result.trade?.type).toBe('buy');

      const account = engine.getAccount('deepseek')!;
      expect(account.currentCapital).toBeLessThan(100000);
      expect(account.positions).toHaveLength(1);
      expect(account.positions[0].stock).toBe('sz000001');
      expect(account.positions[0].quantity).toBe(100);
    });

    it('买入成功：创建交易记录', () => {
      const result = engine.executeBuy('deepseek', 'sz000001', 100, 10.5, '2024-01-02');

      expect(result.success).toBe(true);
      expect(result.trade?.id).toContain('buy');
      expect(result.trade?.model).toBe('deepseek');
      expect(result.trade?.stock).toBe('sz000001');
      expect(result.trade?.price).toBe(10.5);
      expect(result.trade?.quantity).toBe(100);
    });

    it('买入失败：资金不足', () => {
      const result = engine.executeBuy('deepseek', 'sz000001', 10000, 10.5, '2024-01-02');

      expect(result.success).toBe(false);
      expect(result.error).toContain('资金不足');
    });

    it('买入失败：数量不是100的整数倍', () => {
      const result = engine.executeBuy('deepseek', 'sz000001', 150, 10.5, '2024-01-02');

      expect(result.success).toBe(false);
      expect(result.error).toContain('100的整数倍');
    });

    it('买入失败：数量为0', () => {
      const result = engine.executeBuy('deepseek', 'sz000001', 0, 10.5, '2024-01-02');

      expect(result.success).toBe(false);
    });

    it('加仓：计算新的平均成本', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');
      engine.executeBuy('deepseek', 'sz000001', 100, 12.0, '2024-01-03');

      const position = engine.getPosition('deepseek', 'sz000001')!;
      expect(position.quantity).toBe(200);
      expect(position.avgPrice).toBe(11.0); // (100*10 + 100*12) / 200
    });

    it('买入多只股票', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');
      engine.executeBuy('deepseek', 'sz000002', 100, 20.0, '2024-01-02');

      const account = engine.getAccount('deepseek')!;
      expect(account.positions).toHaveLength(2);
    });
  });

  // ============= executeSell 测试 =============

  describe('executeSell', () => {
    beforeEach(() => {
      // 先买入，建立持仓
      engine.executeBuy('deepseek', 'sz000001', 1000, 10.0, '2024-01-02');
    });

    it('卖出成功：持仓减少，资金增加', () => {
      const accountBefore = engine.getAccount('deepseek')!;
      const capitalBefore = accountBefore.currentCapital;

      const result = engine.executeSell('deepseek', 'sz000001', 500, 11.0, '2024-01-03');

      expect(result.success).toBe(true);

      const accountAfter = engine.getAccount('deepseek')!;
      expect(accountAfter.currentCapital).toBeGreaterThan(capitalBefore);

      const position = engine.getPosition('deepseek', 'sz000001')!;
      expect(position.quantity).toBe(500);
    });

    it('卖出成功：创建交易记录', () => {
      const result = engine.executeSell('deepseek', 'sz000001', 500, 11.0, '2024-01-03');

      expect(result.success).toBe(true);
      expect(result.trade).toBeDefined();
      expect(result.trade?.type).toBe('sell');
      expect(result.trade?.quantity).toBe(500);
    });

    it('卖出失败：无持仓', () => {
      const result = engine.executeSell('gemini', 'sz000002', 100, 11.0, '2024-01-03');

      expect(result.success).toBe(false);
      expect(result.error).toContain('无持仓');
    });

    it('卖出失败：违反T+1规则', () => {
      const result = engine.executeSell('deepseek', 'sz000001', 500, 11.0, '2024-01-02');

      expect(result.success).toBe(false);
      expect(result.error).toContain('T+1');
    });

    it('卖出失败：数量超过持仓', () => {
      const result = engine.executeSell('deepseek', 'sz000001', 1500, 11.0, '2024-01-03');

      expect(result.success).toBe(false);
      expect(result.error).toContain('超过持仓');
    });

    it('全部卖出：持仓移除', () => {
      engine.executeSell('deepseek', 'sz000001', 1000, 11.0, '2024-01-03');

      const position = engine.getPosition('deepseek', 'sz000001');
      expect(position).toBeUndefined();
    });
  });

  // ============= getPositions 测试 =============

  describe('getPositions', () => {
    it('返回所有持仓', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');
      engine.executeBuy('deepseek', 'sz000002', 200, 20.0, '2024-01-02');

      const positions = engine.getPositions('deepseek');
      expect(positions).toHaveLength(2);
    });

    it('空账户返回空数组', () => {
      const positions = engine.getPositions('deepseek');
      expect(positions).toEqual([]);
    });
  });

  // ============= getPosition 测试 =============

  describe('getPosition', () => {
    it('返回指定股票持仓', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');

      const position = engine.getPosition('deepseek', 'sz000001');
      expect(position).toBeDefined();
      expect(position?.stock).toBe('sz000001');
    });

    it('不存在的股票返回undefined', () => {
      const position = engine.getPosition('deepseek', 'sz000002');
      expect(position).toBeUndefined();
    });
  });

  // ============= getAccountValue 测试 =============

  describe('getAccountValue', () => {
    it('空仓时账户价值等于现金', () => {
      // 先创建账户
      engine.getOrCreateAccount('deepseek');
      const value = engine.getAccountValue('deepseek', new Map());
      expect(value).toBe(100000);
    });

    it('有持仓时账户价值=现金+持仓市值', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');

      const currentPrices = new Map([['sz000001', 11.0]]);
      const value = engine.getAccountValue('deepseek', currentPrices);

      // 100000初始 - 1000(买入金额) - 手续费 ≈ 98995 现金
      // 持仓价值: 100 * 11 = 1100
      // 总价值 ≈ 98995 + 1100 = 100095
      expect(value).toBeCloseTo(100095, 0);
    });

    it('多只股票持仓计算正确', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');
      engine.executeBuy('deepseek', 'sz000002', 200, 20.0, '2024-01-02');

      const currentPrices = new Map([
        ['sz000001', 11.0],
        ['sz000002', 22.0],
      ]);
      const value = engine.getAccountValue('deepseek', currentPrices);

      expect(value).toBeGreaterThan(100000); // 应该盈利
    });
  });

  // ============= getProfit 测试 =============

  describe('getProfit', () => {
    it('盈利计算正确', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');

      const currentPrices = new Map([['sz000001', 11.0]]);
      const profit = engine.getProfit('deepseek', currentPrices);

      expect(profit.profit).toBeGreaterThan(0);
    });

    it('亏损计算正确', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');

      const currentPrices = new Map([['sz000001', 9.0]]);
      const profit = engine.getProfit('deepseek', currentPrices);

      expect(profit.profit).toBeLessThan(0);
    });

    it('盈利率计算正确', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');

      const currentPrices = new Map([['sz000001', 12.0]]);
      const profit = engine.getProfit('deepseek', currentPrices);

      const expectedRate = (profit.profit / 100000) * 100;
      expect(profit.profitRate).toBeCloseTo(expectedRate, 1);
    });

    it('空账户返回零盈亏', () => {
      const profit = engine.getProfit('gemini', new Map());
      expect(profit.profit).toBe(0);
      expect(profit.profitRate).toBe(0);
    });
  });

  // ============= updateAccount 测试 =============

  describe('updateAccount', () => {
    it('更新账户状态', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');

      const currentPrices = new Map([['sz000001', 11.0]]);
      const updatedAccount = engine.updateAccount('deepseek', currentPrices);

      expect(updatedAccount.totalValue).toBeDefined();
      expect(updatedAccount.profit).toBeDefined();
      expect(updatedAccount.profitRate).toBeDefined();
    });
  });

  // ============= getTrades 测试 =============

  describe('getTrades', () => {
    it('返回指定模型交易记录', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');
      engine.executeSell('deepseek', 'sz000001', 50, 11.0, '2024-01-03');

      const trades = engine.getTrades('deepseek');
      expect(trades).toHaveLength(2);
      expect(trades[0].type).toBe('buy');
      expect(trades[1].type).toBe('sell');
    });
  });

  // ============= getTradeStats 测试 =============

  describe('getTradeStats', () => {
    it('统计交易数据', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');
      engine.executeBuy('deepseek', 'sz000002', 200, 20.0, '2024-01-02');
      engine.executeSell('deepseek', 'sz000001', 50, 11.0, '2024-01-03');

      const stats = engine.getTradeStats('deepseek');

      expect(stats.totalTrades).toBe(3);
      expect(stats.buyTrades).toBe(2);
      expect(stats.sellTrades).toBe(1);
      expect(stats.totalBuyAmount).toBe(5000); // 100*10 + 200*20
      expect(stats.totalSellAmount).toBe(550); // 50*11
    });

    it('计算平均价格', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');
      engine.executeBuy('deepseek', 'sz000001', 100, 12.0, '2024-01-03');

      const stats = engine.getTradeStats('deepseek');
      expect(stats.avgBuyPrice).toBe(11.0); // (10 + 12) / 2
    });
  });

  // ============= resetAccount 测试 =============

  describe('resetAccount', () => {
    it('重置账户', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');

      engine.resetAccount('deepseek');

      const account = engine.getAccount('deepseek');
      expect(account).toBeUndefined();
    });
  });

  // ============= 多模型测试 =============

  describe('多模型', () => {
    it('不同模型独立账户', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');
      engine.executeBuy('gemini', 'sz000002', 200, 20.0, '2024-01-02');

      const deepseekPositions = engine.getPositions('deepseek');
      const geminiPositions = engine.getPositions('gemini');

      expect(deepseekPositions).toHaveLength(1);
      expect(geminiPositions).toHaveLength(1);
      expect(deepseekPositions[0].stock).toBe('sz000001');
      expect(geminiPositions[0].stock).toBe('sz000002');
    });

    it('获取所有账户', () => {
      engine.executeBuy('deepseek', 'sz000001', 100, 10.0, '2024-01-02');
      engine.executeBuy('gemini', 'sz000002', 200, 20.0, '2024-01-02');

      const allAccounts = engine.getAllAccounts();
      expect(allAccounts).toHaveLength(2);
    });
  });
});
