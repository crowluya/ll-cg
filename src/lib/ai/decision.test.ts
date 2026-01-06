/**
 * AI决策单元测试
 * 测试文件: src/lib/ai/decision.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateAIDecision,
  aggregateDecisions,
  formatDecision,
} from './decision';
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
});
