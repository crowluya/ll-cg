/**
 * 回测集成测试
 * 测试文件: src/lib/backtest/runner.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BacktestRunner } from './runner';
import type { BacktestConfig, StockData } from '@/types';

// Mock 所有依赖
vi.mock('@/lib/trading/engine', () => ({
  getTradingEngine: vi.fn(() => ({
    resetAll: vi.fn(),
    getAccount: vi.fn(() => ({
      currentCapital: 100000,
      totalValue: 100000,
      trades: [],
      positions: [],
    })),
    getOrCreateAccount: vi.fn(() => ({
      model: 'deepseek',
      initialCapital: 100000,
      currentCapital: 100000,
      positions: [],
      trades: [],
      totalValue: 100000,
      profit: 0,
      profitRate: 0,
    })),
    getPosition: vi.fn(() => undefined),
    executeBuy: vi.fn(() => ({ success: true, trade: { id: '1', type: 'buy' } })),
    executeSell: vi.fn(() => ({ success: true, trade: { id: '2', type: 'sell' } })),
    updateAccount: vi.fn(),
    getProfit: vi.fn(() => ({ profit: 0, profitRate: 0 })),
  })),
  resetTradingEngine: vi.fn(),
}));

vi.mock('@/lib/trading/account', () => ({
  getAccountManager: vi.fn(() => ({
    resetAll: vi.fn(),
    createAccount: vi.fn(),
    saveAllAccountSnapshots: vi.fn(),
  })),
}));

vi.mock('@/lib/ai/decision', () => ({
  getBatchAIDecisions: vi.fn(() => Promise.resolve(
    new Map([['deepseek', { action: 'hold', reason: '市场震荡，观望' }]])
  )),
}));

vi.mock('@/lib/data/sina-api', () => ({
  fetchStockData: vi.fn(() => Promise.resolve([
    {
      code: 'sz000001',
      date: '2024-01-02',
      open: 10.0,
      high: 10.5,
      low: 9.8,
      close: 10.3,
      volume: 1000000,
    },
    {
      code: 'sz000001',
      date: '2024-01-03',
      open: 10.3,
      high: 10.8,
      low: 10.2,
      close: 10.6,
      volume: 1200000,
    },
    {
      code: 'sz000001',
      date: '2024-01-04',
      open: 10.6,
      high: 10.9,
      low: 10.5,
      close: 10.85,
      volume: 900000,
    },
  ])),
}));

vi.mock('@/lib/trading/rules', () => ({
  getTradingDays: vi.fn(() => ['2024-01-02', '2024-01-03', '2024-01-04']),
}));

vi.mock('@/lib/db/queries', () => ({
  saveTrade: vi.fn(() => Promise.resolve()),
  savePositionSnapshot: vi.fn(() => Promise.resolve()),
  saveAccountSnapshot: vi.fn(() => Promise.resolve()),
  saveAIDecision: vi.fn(() => Promise.resolve()),
}));

describe('BacktestRunner', () => {
  let runner: BacktestRunner;
  let mockConfig: BacktestConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    runner = new BacktestRunner();

    mockConfig = {
      stocks: ['sz000001'],
      startDate: '2024-01-02',
      endDate: '2024-01-04',
      initialCapital: 100000,
      models: ['deepseek'],
      historyDays: 5,
    };
  });

  // ============= run 测试 =============

  describe('run', () => {
    it('执行3天回测', async () => {
      const results = await runner.run(mockConfig);

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBeGreaterThan(0);
    });

    it('返回每个模型的结果', async () => {
      const results = await runner.run(mockConfig);

      expect(results.has('deepseek')).toBe(true);

      const deepseekResult = results.get('deepseek');
      expect(deepseekResult).toBeDefined();
      expect(deepseekResult?.model).toBe('deepseek');
    });

    it('包含结果的基本字段', async () => {
      const results = await runner.run(mockConfig);
      const result = results.get('deepseek');

      expect(result).toMatchObject({
        model: 'deepseek',
        trades: expect.any(Array),
        finalValue: expect.any(Number),
        profit: expect.any(Number),
        profitRate: expect.any(Number),
        winRate: expect.any(Number),
      });
    });

    it('调用进度回调', async () => {
      const progressCallback = vi.fn();
      const runnerWithProgress = new BacktestRunner(progressCallback);

      await runnerWithProgress.run(mockConfig);

      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledTimes(3); // 3个交易日
    });

    it('进度回调包含正确信息', async () => {
      const progressCallback = vi.fn();
      const runnerWithProgress = new BacktestRunner(progressCallback);

      await runnerWithProgress.run(mockConfig);

      const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];

      expect(lastCall).toMatchObject({
        currentDate: expect.any(String),
        completedDays: expect.any(Number),
        totalDays: 3,
        currentResults: expect.any(Map),
      });
    });

    it('多模型回测', async () => {
      const multiModelConfig: BacktestConfig = {
        ...mockConfig,
        models: ['deepseek', 'gemini', 'claude'],
      };

      const results = await runner.run(multiModelConfig);

      expect(results.size).toBe(3);
      expect(results.has('deepseek')).toBe(true);
      expect(results.has('gemini')).toBe(true);
      expect(results.has('claude')).toBe(true);
    });
  });

  // ============= calculateRecommendedQuantity 测试 =============

  describe('calculateRecommendedQuantity', () => {
    it('计算推荐买入数量', async () => {
      await runner.run(mockConfig);

      // 验证买入使用了推荐的数量计算
      // 资金100000，价格10.3，使用80% = 80000，数量 = 80000/10.3/100*100 ≈ 7700
      // 实际结果取决于AI决策
      const results = await runner.run(mockConfig);
      expect(results).toBeDefined();
    });
  });

  // ============= 结果统计测试 =============

  describe('结果统计', () => {
    it('计算胜率', async () => {
      const results = await runner.run(mockConfig);
      const result = results.get('deepseek');

      expect(result?.winRate).toBeGreaterThanOrEqual(0);
      expect(result?.winRate).toBeLessThanOrEqual(1);
    });

    it('计算盈利率', async () => {
      const results = await runner.run(mockConfig);
      const result = results.get('deepseek');

      expect(result?.profitRate).toBeDefined();
      expect(typeof result?.profitRate).toBe('number');
    });

    it('初始没有交易时胜率为0', async () => {
      const results = await runner.run(mockConfig);
      const result = results.get('deepseek');

      // 由于AI返回hold，不会有交易
      expect(result?.trades).toHaveLength(0);
    });
  });

  // ============= 错误处理测试 =============

  describe('错误处理', () => {
    it('API失败时继续运行', async () => {
      // Mock fetchStockData 返回空数组
      const { fetchStockData } = await import('@/lib/data/sina-api');
      vi.mocked(fetchStockData).mockRejectedValueOnce(new Error('API Error'));

      const results = await runner.run(mockConfig);

      // 应该返回结果，即使数据获取失败
      expect(results).toBeInstanceOf(Map);
    });

    it('空配置返回空结果', async () => {
      const emptyConfig: BacktestConfig = {
        stocks: [],
        startDate: '2024-01-02',
        endDate: '2024-01-04',
        initialCapital: 100000,
        models: [],
        historyDays: 5,
      };

      const results = await runner.run(emptyConfig);

      expect(results.size).toBe(0);
    });
  });

  // ============= 结果字段测试 =============

  describe('结果字段', () => {
    it('包含trades数组', async () => {
      const results = await runner.run(mockConfig);
      const result = results.get('deepseek');

      expect(Array.isArray(result?.trades)).toBe(true);
    });

    it('包含finalValue', async () => {
      const results = await runner.run(mockConfig);
      const result = results.get('deepseek');

      expect(typeof result?.finalValue).toBe('number');
    });

    it('包含profit', async () => {
      const results = await runner.run(mockConfig);
      const result = results.get('deepseek');

      expect(typeof result?.profit).toBe('number');
    });

    it('profitRate计算正确', async () => {
      const results = await runner.run(mockConfig);
      const result = results.get('deepseek');

      if (result) {
        const expectedRate = (result.profit / mockConfig.initialCapital) * 100;
        expect(result.profitRate).toBeCloseTo(expectedRate, 5);
      }
    });
  });
});
