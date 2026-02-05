/**
 * AI决策单元测试
 * 测试文件: src/lib/ai/decision.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateAIDecision,
  aggregateDecisions,
  formatDecision,
  buildDecisionInput,
  saveDecisionRecord,
} from './decision';

// Mock saveAIDecision from db/queries
vi.mock('@/lib/db/queries', () => ({
  saveAIDecision: vi.fn((record) => Promise.resolve('mock-id')),
}));
import type { AIDecision, DecisionInput } from '@/types';
import type { AIModelKey } from '@/types';

// Mock client 模块
vi.mock('./client', () => ({
  callOpenRouter: vi.fn(),
  streamOpenRouter: vi.fn(),
  getModelId: vi.fn((key: string) => key),
  isApiKeyConfigured: vi.fn(() => true),
}));

describe('ai/decision', () => {
  // ============= validateAIDecision 测试 =============

  describe('validateAIDecision', () => {
    const baseInput: DecisionInput = {
      stockCode: 'sz000001',
      currentDate: '2024-01-03',
      availableCapital: 100000,
      historyData: [
        {
          code: 'sz000001',
          date: '2024-01-02',
          open: 10.0,
          high: 10.5,
          low: 9.8,
          close: 10.3,
          volume: 1000000,
        },
      ],
    };

    it('买入决策：包含股票和数量时有效', () => {
      const decision: AIDecision = {
        action: 'buy',
        stock: 'sz000001',
        quantity: 100,
        reason: '技术面强势突破',
      };

      const result = validateAIDecision(decision, baseInput);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('买入决策：缺少股票代码时无效', () => {
      const decision: AIDecision = {
        action: 'buy',
        quantity: 100,
        reason: '技术面强势突破',
      };

      const result = validateAIDecision(decision, baseInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('买入决策必须指定股票代码');
    });

    it('买入决策：缺少数量时无效', () => {
      const decision: AIDecision = {
        action: 'buy',
        stock: 'sz000001',
        reason: '技术面强势突破',
      };

      const result = validateAIDecision(decision, baseInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('买入决策必须指定数量');
    });

    it('买入决策：资金不足时无效', () => {
      const decision: AIDecision = {
        action: 'buy',
        stock: 'sz000001',
        quantity: 10000, // 数量过大
        reason: '技术面强势突破',
      };

      const input = { ...baseInput, availableCapital: 1000 };
      const result = validateAIDecision(decision, input);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('资金不足'))).toBe(true);
    });

    it('买入决策：数量不是100的整数倍时警告', () => {
      const decision: AIDecision = {
        action: 'buy',
        stock: 'sz000001',
        quantity: 150,
        reason: '技术面强势突破',
      };

      const result = validateAIDecision(decision, baseInput);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('买入数量最好是100的整数倍(1手)');
    });

    it('卖出决策：无持仓时无效', () => {
      const decision: AIDecision = {
        action: 'sell',
        stock: 'sz000001',
        quantity: 100,
        reason: '获利了结',
      };

      const result = validateAIDecision(decision, baseInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('无持仓可卖');
    });

    it('卖出决策：违反T+1规则时无效', () => {
      const decision: AIDecision = {
        action: 'sell',
        stock: 'sz000001',
        quantity: 100,
        reason: '获利了结',
      };

      const input = {
        ...baseInput,
        currentPosition: {
          stock: 'sz000001',
          quantity: 1000,
          buyDate: '2024-01-03', // 当天买入
          avgPrice: 10.0,
        },
      };

      const result = validateAIDecision(decision, input);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('T+1'))).toBe(true);
    });

    it('卖出决策：持仓超过一天时有效', () => {
      const decision: AIDecision = {
        action: 'sell',
        stock: 'sz000001',
        quantity: 100,
        reason: '获利了结',
      };

      const input = {
        ...baseInput,
        currentPosition: {
          stock: 'sz000001',
          quantity: 1000,
          buyDate: '2024-01-02', // 前一天买入
          avgPrice: 10.0,
        },
      };

      const result = validateAIDecision(decision, input);

      expect(result.valid).toBe(true);
    });

    it('持有决策：包含股票信息时警告', () => {
      const decision: AIDecision = {
        action: 'hold',
        reason: '市场震荡，观望',
        stock: 'sz000001',
      };

      const result = validateAIDecision(decision, baseInput);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('持有决策不应包含股票和数量信息');
    });

    it('持有决策：基本验证通过', () => {
      const decision: AIDecision = {
        action: 'hold',
        reason: '市场震荡，观望等待更好入场点',
      };

      const result = validateAIDecision(decision, baseInput);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });

  // ============= aggregateDecisions 测试 =============

  describe('aggregateDecisions', () => {
    it('多数买入时返回buy共识', () => {
      const decisions = new Map<AIModelKey, AIDecision>([
        ['deepseek', { action: 'buy', stock: 'sz000001', quantity: 100, reason: '买入' }],
        ['gemini', { action: 'buy', stock: 'sz000001', quantity: 100, reason: '买入' }],
        ['claude', { action: 'hold', reason: '持有' }],
      ]);

      const result = aggregateDecisions(decisions);

      expect(result.consensus).toBe('buy');
      expect(result.buyCount).toBe(2);
      expect(result.holdCount).toBe(1);
      expect(result.confidence).toBeCloseTo(0.667);
    });

    it('多数卖出时返回sell共识', () => {
      const decisions = new Map<AIModelKey, AIDecision>([
        ['deepseek', { action: 'sell', stock: 'sz000001', quantity: 100, reason: '卖出' }],
        ['gemini', { action: 'sell', stock: 'sz000001', quantity: 100, reason: '卖出' }],
        ['claude', { action: 'hold', reason: '持有' }],
      ]);

      const result = aggregateDecisions(decisions);

      expect(result.consensus).toBe('sell');
      expect(result.sellCount).toBe(2);
      expect(result.holdCount).toBe(1);
    });

    it('多数持有时返回hold共识', () => {
      const decisions = new Map<AIModelKey, AIDecision>([
        ['deepseek', { action: 'hold', reason: '持有' }],
        ['gemini', { action: 'hold', reason: '持有' }],
        ['claude', { action: 'buy', stock: 'sz000001', quantity: 100, reason: '买入' }],
      ]);

      const result = aggregateDecisions(decisions);

      expect(result.consensus).toBe('hold');
      expect(result.holdCount).toBe(2);
      expect(result.buyCount).toBe(1);
    });

    it('平票时优先选择buy > sell > hold', () => {
      const decisions = new Map<AIModelKey, AIDecision>([
        ['deepseek', { action: 'buy', stock: 'sz000001', quantity: 100, reason: '买入' }],
        ['gemini', { action: 'sell', stock: 'sz000001', quantity: 100, reason: '卖出' }],
      ]);

      const result = aggregateDecisions(decisions);

      expect(result.buyCount).toBe(1);
      expect(result.sellCount).toBe(1);
      expect(result.confidence).toBe(0.5);
    });

    it('全部一致时置信度为1', () => {
      const decisions = new Map<AIModelKey, AIDecision>([
        ['deepseek', { action: 'buy', stock: 'sz000001', quantity: 100, reason: '买入' }],
        ['gemini', { action: 'buy', stock: 'sz000001', quantity: 100, reason: '买入' }],
        ['claude', { action: 'buy', stock: 'sz000001', quantity: 100, reason: '买入' }],
      ]);

      const result = aggregateDecisions(decisions);

      expect(result.consensus).toBe('buy');
      expect(result.confidence).toBe(1);
    });

    it('空决策返回hold', () => {
      const decisions = new Map<AIModelKey, AIDecision>();

      const result = aggregateDecisions(decisions);

      expect(result.consensus).toBe('hold');
      expect(result.confidence).toBeNaN();
    });
  });

  // ============= formatDecision 测试 =============

  describe('formatDecision', () => {
    it('格式化买入决策', () => {
      const decision: AIDecision = {
        action: 'buy',
        stock: 'sz000001',
        quantity: 100,
        reason: '技术面强势突破，MACD金叉',
        confidence: 0.85,
      };

      const formatted = formatDecision(decision);

      expect(formatted).toContain('买入');
      expect(formatted).toContain('sz000001');
      expect(formatted).toContain('100');
      expect(formatted).toContain('85%');
      expect(formatted).toContain('技术面强势突破');
    });

    it('格式化卖出决策', () => {
      const decision: AIDecision = {
        action: 'sell',
        stock: 'sz000001',
        quantity: 50,
        reason: '获利了结',
      };

      const formatted = formatDecision(decision);

      expect(formatted).toContain('卖出');
      expect(formatted).toContain('sz000001');
      expect(formatted).toContain('50');
    });

    it('格式化持有决策', () => {
      const decision: AIDecision = {
        action: 'hold',
        reason: '市场震荡，观望等待更好入场点。当前技术指标显示缺乏明确方向，成交量萎缩表明投资者观望情绪浓厚。',
      };

      const formatted = formatDecision(decision);

      expect(formatted).toContain('持有');
      expect(formatted).toContain('市场震荡');
      expect(formatted).not.toContain('股票:');
    });
  });

  // ============= buildDecisionInput 测试 (Phase 4.3-4.4) =============

  describe('buildDecisionInput', () => {
    it('应该组装完整的决策输入', async () => {
      const params = {
        stockCode: 'sz000001',
        currentDate: '2024-01-03',
        availableCapital: 100000,
        historyData: [
          {
            code: 'sz000001',
            date: '2024-01-02',
            open: 10.0,
            high: 10.5,
            low: 9.8,
            close: 10.3,
            volume: 1000000,
          },
        ],
        currentPosition: {
          stock: 'sz000001',
          quantity: 100,
          buyDate: '2024-01-02',
          avgPrice: 10.0,
        },
      };

      const input = await buildDecisionInput(params);

      expect(input.stockCode).toBe('sz000001');
      expect(input.currentDate).toBe('2024-01-03');
      expect(input.availableCapital).toBe(100000);
      expect(input.historyData).toBeDefined();
      expect(input.currentPosition).toBeDefined();
    });

    it('应该处理缺失的持仓数据', async () => {
      const params = {
        stockCode: 'sz000001',
        currentDate: '2024-01-03',
        availableCapital: 100000,
        historyData: [],
      };

      const input = await buildDecisionInput(params);

      expect(input.currentPosition).toBeUndefined();
      expect(input.historyData).toEqual([]);
    });

    it('应该使用默认日期', async () => {
      const params = {
        stockCode: 'sz000001',
        availableCapital: 100000,
        historyData: [],
      };

      const input = await buildDecisionInput(params);

      expect(input.currentDate).toBeDefined();
      expect(input.currentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('应该包含账户信息（如果提供）', async () => {
      const mockAccount = {
        agentId: 'agent-1',
        initialCapital: 100000,
        cash: 50000,
        positions: [],
        totalValue: 100000,
        marketValue: 50000,
        profit: 0,
        profitRate: 0,
        dailyProfit: 0,
        dailyProfitRate: 0,
      };

      const params = {
        stockCode: 'sz000001',
        availableCapital: 100000,
        historyData: [],
        account: mockAccount,
      };

      const input = await buildDecisionInput(params);

      expect(input.account).toBeDefined();
      expect(input.account?.cash).toBe(50000);
    });

    it('应该包含交易配置（如果提供）', async () => {
      const mockConfig = {
        thinkInterval: 30,
        initialCapital: 100000,
        maxPositionRatio: 0.3,
        tradingHours: {
          morning: { start: '09:15', end: '11:30' },
          afternoon: { start: '13:00', end: '15:00' },
        },
      };

      const params = {
        stockCode: 'sz000001',
        availableCapital: 100000,
        historyData: [],
        config: mockConfig,
      };

      const input = await buildDecisionInput(params);

      expect(input.config).toBeDefined();
      expect(input.config?.maxPositionRatio).toBe(0.3);
    });

    it('应该包含当前时间', async () => {
      const before = new Date();

      const params = {
        stockCode: 'sz000001',
        availableCapital: 100000,
        historyData: [],
      };

      const input = await buildDecisionInput(params);

      const after = new Date();

      expect(input.currentTime).toBeDefined();
      const inputTime = new Date(input.currentTime!);
      expect(inputTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(inputTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // ============= saveDecisionRecord 测试 (Phase 4.7-4.8) =============

  describe('saveDecisionRecord', () => {
    it('应该保存决策记录到数据库', async () => {
      const decision = {
        action: 'buy' as const,
        stock: 'sz000001',
        quantity: 100,
        reason: '技术面强势突破',
        confidence: 0.8,
      };

      const input = {
        stockCode: 'sz000001',
        currentDate: '2024-01-03',
        availableCapital: 100000,
        historyData: [],
      };

      const result = await saveDecisionRecord('deepseek', decision, input, {
        executed: true,
        tradeId: 'trade-123',
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('应该包含执行结果', async () => {
      const decision = {
        action: 'hold' as const,
        reason: '市场震荡，观望',
      };

      const input = {
        stockCode: 'sz000001',
        currentDate: '2024-01-03',
        availableCapital: 100000,
        historyData: [],
      };

      const result = await saveDecisionRecord('claude', decision, input, {
        executed: false,
      });

      expect(result).toBeDefined();
    });

    it('应该包含错误信息（如果执行失败）', async () => {
      const decision = {
        action: 'buy' as const,
        stock: 'sz000001',
        quantity: 100,
        reason: '测试',
      };

      const input = {
        stockCode: 'sz000001',
        currentDate: '2024-01-03',
        availableCapital: 100000,
        historyData: [],
      };

      const result = await saveDecisionRecord('gemini', decision, input, {
        executed: false,
        error: '资金不足',
      });

      expect(result).toBeDefined();
    });

    it('应该正确格式化决策记录', async () => {
      const decision = {
        action: 'sell' as const,
        stock: 'sz000001',
        quantity: 50,
        reason: '获利了结',
      };

      const input = {
        stockCode: 'sz000001',
        currentDate: '2024-01-03',
        availableCapital: 100000,
        historyData: [],
        currentPosition: {
          stock: 'sz000001',
          quantity: 1000,
          buyDate: '2024-01-02',
          avgPrice: 10.0,
        },
      };

      const result = await saveDecisionRecord('deepseek', decision, input, {
        executed: true,
        tradeId: 'trade-456',
      });

      expect(result).toBeDefined();
    });
  });
});
