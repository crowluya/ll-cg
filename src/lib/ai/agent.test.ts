/**
 * AIAgent 类单元测试
 * 测试文件: src/lib/ai/agent.test.ts
 *
 * Phase 4.1: AI 代理类基础测试
 * 修复: 价格计算使用当前价格而非成本价
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AIModelKey } from '@/types';

// Mock client 模块
vi.mock('./client', () => ({
  callOpenRouter: vi.fn(),
  streamOpenRouter: vi.fn(),
  getModelId: vi.fn((key: string) => key),
  isApiKeyConfigured: vi.fn(() => true),
}));

// Mock decision 模块
vi.mock('./decision', () => ({
  getAIDecision: vi.fn(),
  validateAIDecision: vi.fn(),
  formatDecision: vi.fn(),
}));

// Mock schema 模块（用于 validateDecisionWithContext）
vi.mock('./schema', () => ({
  validateDecisionWithContext: vi.fn(),
}));

import { AIAgent } from './agent';
import { getAIDecision, validateAIDecision } from './decision';
import { validateDecisionWithContext } from './schema';
import type { AIDecision, Account, Position, StockData } from '@/types';

describe('AIAgent', () => {
  // 测试数据
  const mockModel: AIModelKey = 'deepseek';
  const mockInitialCapital = 100000;

  const mockDecision: AIDecision = {
    action: 'buy',
    stock: 'sz000001',
    quantity: 100,
    reason: '技术面强势突破',
    confidence: 0.85,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // 默认 mock validateDecisionWithContext 返回有效
    vi.mocked(getAIDecision).mockResolvedValue(mockDecision);
    vi.mocked(validateAIDecision).mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
    });
    // Mock validateDecisionWithContext (从 schema 导入)
    vi.mocked(validateDecisionWithContext).mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
    });
  });

  // ============= 构造函数测试 =============

  describe('constructor', () => {
    it('应该正确创建 AIAgent 实例', () => {
      const agent = new AIAgent('agent-1', mockModel, mockInitialCapital);

      expect(agent.getId()).toBe('agent-1');
      expect(agent.getModel()).toBe(mockModel);
      expect(agent.getAccount().cash).toBe(mockInitialCapital);
      expect(agent.getAccount().positions).toEqual([]);
      expect(agent.getAccount().initialCapital).toBe(mockInitialCapital);
    });

    it('应该使用默认配置', () => {
      const agent = new AIAgent('agent-1', mockModel, mockInitialCapital);
      const config = agent.getConfig();

      expect(config.maxPositionRatio).toBe(0.5);
      expect(config.thinkInterval).toBe(10);
    });

    it('应该接受自定义配置', () => {
      const customConfig = {
        maxPositionRatio: 0.3,
        thinkInterval: 5,
      };
      const agent = new AIAgent('agent-1', mockModel, mockInitialCapital, customConfig);
      const config = agent.getConfig();

      expect(config.maxPositionRatio).toBe(0.3);
      expect(config.thinkInterval).toBe(5);
    });
  });

  // ============= 价格计算修复测试 =============

  describe('价格计算修复', () => {
    let agent: AIAgent;

    beforeEach(() => {
      agent = new AIAgent('test-agent', mockModel, mockInitialCapital);
    });

    it('getAccount 使用当前价格计算市值而非成本价', () => {
      // 模拟买入操作
      agent.updateAccount({
        type: 'buy',
        stock: 'sz000001',
        price: 10.0,
        quantity: 1000,
        timestamp: '2024-01-02T10:00:00Z',
        reason: '测试买入',
      });

      // 设置当前价格（上涨了）
      const currentPrices = new Map([
        ['sz000001', 12.0], // 从10.0涨到12.0
      ]);

      const account = agent.getAccount(currentPrices);

      // 验证使用当前价格计算
      expect(account.positions[0].currentPrice).toBe(12.0);
      expect(account.positions[0].marketValue).toBe(12000); // 1000 * 12.0
      expect(account.positions[0].profit).toBe(2000); // 12000 - 10000
      expect(account.positions[0].profitRate).toBe(20); // 2000/10000 * 100

      // 验证总账户价值
      expect(account.marketValue).toBe(12000);
      expect(account.totalValue).toBe(account.cash + 12000);
      expect(account.profit).toBe(account.totalValue - mockInitialCapital);
    });

    it('无当前价格时使用成本价作为fallback', () => {
      agent.updateAccount({
        type: 'buy',
        stock: 'sz000001',
        price: 10.0,
        quantity: 1000,
        timestamp: '2024-01-02T10:00:00Z',
        reason: '测试买入',
      });

      // 不传入当前价格
      const account = agent.getAccount();

      // 验证使用成本价作为fallback
      expect(account.positions[0].currentPrice).toBe(10.0);
      expect(account.positions[0].marketValue).toBe(10000);
      expect(account.positions[0].profit).toBe(0); // 成本价时无盈亏
      expect(account.positions[0].profitRate).toBe(0);
    });

    it('多只股票的价格计算', () => {
      // 买入多只股票
      agent.updateAccount({
        type: 'buy',
        stock: 'sz000001',
        price: 10.0,
        quantity: 1000,
        timestamp: '2024-01-02T10:00:00Z',
        reason: '买入股票1',
      });

      agent.updateAccount({
        type: 'buy',
        stock: 'sz000002',
        price: 20.0,
        quantity: 500,
        timestamp: '2024-01-02T10:00:00Z',
        reason: '买入股票2',
      });

      // 设置不同的当前价格
      const currentPrices = new Map([
        ['sz000001', 12.0], // 涨20%
        ['sz000002', 18.0], // 跌10%
      ]);

      const account = agent.getAccount(currentPrices);

      // 验证各股票计算
      const pos1 = account.positions.find(p => p.stock === 'sz000001')!;
      const pos2 = account.positions.find(p => p.stock === 'sz000002')!;

      expect(pos1.currentPrice).toBe(12.0);
      expect(pos1.marketValue).toBe(12000);
      expect(pos1.profit).toBe(2000);

      expect(pos2.currentPrice).toBe(18.0);
      expect(pos2.marketValue).toBe(9000);
      expect(pos2.profit).toBe(-1000);

      // 验证总市值
      expect(account.marketValue).toBe(21000); // 12000 + 9000
    });

    it('表格驱动测试：不同价格变化场景', () => {
      const testCases = [
        { buyPrice: 10.0, currentPrice: 12.0, expectedProfit: 2000, expectedRate: 20 },
        { buyPrice: 10.0, currentPrice: 8.0, expectedProfit: -2000, expectedRate: -20 },
        { buyPrice: 10.0, currentPrice: 10.0, expectedProfit: 0, expectedRate: 0 },
        { buyPrice: 15.5, currentPrice: 18.6, expectedProfit: 3100, expectedRate: 20 },
      ];

      for (const tc of testCases) {
        // 重置代理
        agent.reset();

        // 买入
        agent.updateAccount({
          type: 'buy',
          stock: 'sz000001',
          price: tc.buyPrice,
          quantity: 1000,
          timestamp: '2024-01-02T10:00:00Z',
          reason: '测试买入',
        });

        // 设置当前价格
        const currentPrices = new Map([['sz000001', tc.currentPrice]]);
        const account = agent.getAccount(currentPrices);

        // 验证结果
        expect(account.positions[0].profit).toBeCloseTo(tc.expectedProfit, 0);
        expect(account.positions[0].profitRate).toBeCloseTo(tc.expectedRate, 0);
      }
    });

    it('卖出后持仓正确更新', () => {
      // 买入
      agent.updateAccount({
        type: 'buy',
        stock: 'sz000001',
        price: 10.0,
        quantity: 1000,
        timestamp: '2024-01-02T10:00:00Z',
        reason: '买入',
      });

      // 部分卖出
      agent.updateAccount({
        type: 'sell',
        stock: 'sz000001',
        price: 12.0,
        quantity: 300,
        timestamp: '2024-01-03T10:00:00Z',
        reason: '部分卖出',
      });

      const currentPrices = new Map([['sz000001', 11.0]]);
      const account = agent.getAccount(currentPrices);

      // 验证剩余持仓
      expect(account.positions[0].quantity).toBe(700);
      expect(account.positions[0].currentPrice).toBe(11.0);
      expect(account.positions[0].marketValue).toBe(7700); // 700 * 11.0
      expect(account.positions[0].avgPrice).toBe(10.0); // 成本价不变
    });
  });
});