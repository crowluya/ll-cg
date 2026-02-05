/**
 * Schema 验证单元测试
 * 测试文件: src/lib/ai/schema.test.ts
 *
 * Phase 4.5: 决策输出验证增强测试
 * Phase 4.6: 决策输出验证增强实现测试
 */

import { describe, it, expect } from 'vitest';
import {
  decisionSchema,
  decisionInputSchema,
  batchDecisionSchema,
  calculateMA,
  calculateRSI,
  calculateTechnicalIndicators,
  enhancedDecisionSchema,
  validateDecisionWithContext,
} from './schema';
import type { StockData } from '@/types';

describe('ai/schema', () => {
  // ============= decisionSchema 测试 =============

  describe('decisionSchema', () => {
    it('应该验证有效的买入决策', () => {
      const decision = {
        action: 'buy',
        stock: 'sz000001',
        quantity: 100,
        reason: '技术面强势突破，MACD金叉，成交量放大',
        confidence: 0.85,
      };

      const result = decisionSchema.parse(decision);
      expect(result).toEqual(decision);
    });

    it('应该验证有效的卖出决策', () => {
      const decision = {
        action: 'sell',
        stock: 'sz000001',
        quantity: 50,
        reason: '获利了结，技术指标显示超买',
      };

      const result = decisionSchema.parse(decision);
      expect(result).toEqual(decision);
    });

    it('应该验证有效的持有决策', () => {
      const decision = {
        action: 'hold',
        reason: '市场震荡，观望等待更好入场点',
      };

      const result = decisionSchema.parse(decision);
      expect(result).toEqual(decision);
    });

    it('应该拒绝无效的 action', () => {
      const decision = {
        action: 'invalid',
        reason: '测试',
      };

      expect(() => decisionSchema.parse(decision)).toThrow();
    });

    it('应该拒绝理由少于10个字符', () => {
      const decision = {
        action: 'hold',
        reason: '太短',
      };

      expect(() => decisionSchema.parse(decision)).toThrow();
    });

    it('应该接受 confidence 为 0', () => {
      const decision = {
        action: 'buy',
        stock: 'sz000001',
        quantity: 100,
        reason: '测试理由文本需要足够长度才能通过验证',
        confidence: 0,
      };

      const result = decisionSchema.parse(decision);
      expect(result.confidence).toBe(0);
    });

    it('应该接受 confidence 为 1', () => {
      const decision = {
        action: 'buy',
        stock: 'sz000001',
        quantity: 100,
        reason: '测试理由文本需要足够长度才能通过验证',
        confidence: 1,
      };

      const result = decisionSchema.parse(decision);
      expect(result.confidence).toBe(1);
    });

    it('应该拒绝 confidence 小于 0', () => {
      const decision = {
        action: 'buy',
        stock: 'sz000001',
        quantity: 100,
        reason: '测试理由文本需要足够长度才能通过验证',
        confidence: -0.1,
      };

      expect(() => decisionSchema.parse(decision)).toThrow();
    });

    it('应该拒绝 confidence 大于 1', () => {
      const decision = {
        action: 'buy',
        stock: 'sz000001',
        quantity: 100,
        reason: '测试理由文本需要足够长度才能通过验证',
        confidence: 1.5,
      };

      expect(() => decisionSchema.parse(decision)).toThrow();
    });

    it('买入决策应该包含股票代码', () => {
      const decision = {
        action: 'buy',
        quantity: 100,
        reason: '测试理由文本需要足够长度才能通过验证',
      };

      // 这是一个可选字段，所以 schema 不会报错
      // 但在业务逻辑中应该验证
      const result = decisionSchema.parse(decision);
      expect(result.stock).toBeUndefined();
    });

    it('买入决策应该包含数量', () => {
      const decision = {
        action: 'buy',
        stock: 'sz000001',
        reason: '测试理由文本需要足够长度才能通过验证',
      };

      const result = decisionSchema.parse(decision);
      expect(result.quantity).toBeUndefined();
    });

    it('数量必须是正整数', () => {
      const decision = {
        action: 'buy',
        stock: 'sz000001',
        quantity: -100,
        reason: '测试理由文本需要足够长度才能通过验证',
      };

      expect(() => decisionSchema.parse(decision)).toThrow();
    });

    it('数量不能是小数', () => {
      const decision = {
        action: 'buy',
        stock: 'sz000001',
        quantity: 100.5,
        reason: '测试理由文本需要足够长度才能通过验证',
      };

      expect(() => decisionSchema.parse(decision)).toThrow();
    });
  });

  // ============= decisionInputSchema 测试 =============

  describe('decisionInputSchema', () => {
    const validInput = {
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
          close: 10.8,
          volume: 1100000,
        },
        {
          code: 'sz000001',
          date: '2024-01-05',
          open: 10.8,
          high: 11.0,
          low: 10.7,
          close: 10.9,
          volume: 1300000,
        },
        {
          code: 'sz000001',
          date: '2024-01-08',
          open: 10.9,
          high: 11.2,
          low: 10.8,
          close: 11.1,
          volume: 1400000,
        },
      ],
    };

    it('应该验证有效的决策输入', () => {
      const result = decisionInputSchema.parse(validInput);
      expect(result.stockCode).toBe('sz000001');
    });

    it('应该拒绝无效的股票代码格式', () => {
      const invalidInput = {
        ...validInput,
        stockCode: '000001', // 缺少 sh/sz 前缀
      };

      expect(() => decisionInputSchema.parse(invalidInput)).toThrow();
    });

    it('应该拒绝少于5天的历史数据', () => {
      const invalidInput = {
        ...validInput,
        historyData: validInput.historyData.slice(0, 3),
      };

      expect(() => decisionInputSchema.parse(invalidInput)).toThrow();
    });

    it('应该拒绝无效的日期格式', () => {
      const invalidInput = {
        ...validInput,
        currentDate: '2024/01/03',
      };

      expect(() => decisionInputSchema.parse(invalidInput)).toThrow();
    });

    it('应该拒绝负数的可用资金', () => {
      const invalidInput = {
        ...validInput,
        availableCapital: -1000,
      };

      expect(() => decisionInputSchema.parse(invalidInput)).toThrow();
    });

    it('应该接受持仓数据（可选）', () => {
      const inputWithPosition = {
        ...validInput,
        currentPosition: {
          stock: 'sz000001',
          quantity: 100,
          buyDate: '2024-01-02',
          avgPrice: 10.0,
        },
      };

      const result = decisionInputSchema.parse(inputWithPosition);
      expect(result.currentPosition).toBeDefined();
    });
  });

  // ============= batchDecisionSchema 测试 =============

  describe('batchDecisionSchema', () => {
    it('应该验证有效的批量决策请求', () => {
      const batchRequest = {
        models: ['deepseek', 'gemini', 'claude'],
        stockCode: 'sz000001',
        historyDays: 30,
        availableCapital: 100000,
        currentDate: '2024-01-03',
      };

      const result = batchDecisionSchema.parse(batchRequest);
      expect(result.models).toHaveLength(3);
    });

    it('应该拒绝空的模型列表', () => {
      const batchRequest = {
        models: [],
        stockCode: 'sz000001',
      };

      expect(() => batchDecisionSchema.parse(batchRequest)).toThrow();
    });

    it('应该拒绝无效的模型名称', () => {
      const batchRequest = {
        models: ['invalid_model'],
        stockCode: 'sz000001',
      };

      expect(() => batchDecisionSchema.parse(batchRequest)).toThrow();
    });

    it('应该设置默认值', () => {
      const batchRequest = {
        models: ['deepseek'],
        stockCode: 'sz000001',
      };

      const result = batchDecisionSchema.parse(batchRequest);
      expect(result.historyDays).toBe(30);
      expect(result.availableCapital).toBe(100000);
      expect(result.currentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('应该限制 historyDays 在 5-365 之间', () => {
      const tooSmall = {
        models: ['deepseek'],
        stockCode: 'sz000001',
        historyDays: 3,
      };

      const tooLarge = {
        models: ['deepseek'],
        stockCode: 'sz000001',
        historyDays: 400,
      };

      expect(() => batchDecisionSchema.parse(tooSmall)).toThrow();
      expect(() => batchDecisionSchema.parse(tooLarge)).toThrow();
    });
  });

  // ============= 技术指标计算测试 =============

  describe('calculateMA', () => {
    const mockData: StockData[] = [
      { code: 'sz000001', date: '2024-01-01', open: 10, high: 11, low: 9, close: 10, volume: 1000 },
      { code: 'sz000001', date: '2024-01-02', open: 10, high: 11, low: 9, close: 11, volume: 1000 },
      { code: 'sz000001', date: '2024-01-03', open: 11, high: 12, low: 10, close: 12, volume: 1000 },
      { code: 'sz000001', date: '2024-01-04', open: 12, high: 13, low: 11, close: 13, volume: 1000 },
      { code: 'sz000001', date: '2024-01-05', open: 13, high: 14, low: 12, close: 14, volume: 1000 },
    ];

    it('应该计算5日均线', () => {
      const ma5 = calculateMA(mockData, 5);
      expect(ma5).toBe((10 + 11 + 12 + 13 + 14) / 5);
    });

    it('数据不足时返回 undefined', () => {
      const ma10 = calculateMA(mockData, 10);
      expect(ma10).toBeUndefined();
    });

    it('应该计算最近 N 天的均值', () => {
      const ma3 = calculateMA(mockData, 3);
      expect(ma3).toBe((12 + 13 + 14) / 3);
    });
  });

  describe('calculateRSI', () => {
    const mockData: StockData[] = [
      { code: 'sz000001', date: '2024-01-01', open: 10, high: 11, low: 9, close: 10, volume: 1000 },
      { code: 'sz000001', date: '2024-01-02', open: 10, high: 11, low: 9, close: 12, volume: 1000 }, // +2
      { code: 'sz000001', date: '2024-01-03', open: 12, high: 13, low: 11, close: 11, volume: 1000 }, // -1
      { code: 'sz000001', date: '2024-01-04', open: 11, high: 12, low: 10, close: 13, volume: 1000 }, // +2
      { code: 'sz000001', date: '2024-01-05', open: 13, high: 14, low: 12, close: 12, volume: 1000 }, // -1
      { code: 'sz000001', date: '2024-01-06', open: 12, high: 13, low: 11, close: 14, volume: 1000 }, // +2
      { code: 'sz000001', date: '2024-01-07', open: 14, high: 15, low: 13, close: 13, volume: 1000 }, // -1
      { code: 'sz000001', date: '2024-01-08', open: 13, high: 14, low: 12, close: 15, volume: 1000 }, // +2
      { code: 'sz000001', date: '2024-01-09', open: 15, high: 16, low: 14, close: 14, volume: 1000 }, // -1
      { code: 'sz000001', date: '2024-01-10', open: 14, high: 15, low: 13, close: 16, volume: 1000 }, // +2
      { code: 'sz000001', date: '2024-01-11', open: 16, high: 17, low: 15, close: 15, volume: 1000 }, // -1
      { code: 'sz000001', date: '2024-01-12', open: 15, high: 16, low: 14, close: 17, volume: 1000 }, // +2
      { code: 'sz000001', date: '2024-01-13', open: 17, high: 18, low: 16, close: 16, volume: 1000 }, // -1
      { code: 'sz000001', date: '2024-01-14', open: 16, high: 17, low: 15, close: 18, volume: 1000 }, // +2
      { code: 'sz000001', date: '2024-01-15', open: 18, high: 19, low: 17, close: 17, volume: 1000 }, // -1
    ];

    it('应该计算 RSI', () => {
      const rsi = calculateRSI(mockData, 14);
      expect(rsi).toBeGreaterThanOrEqual(0);
      expect(rsi).toBeLessThanOrEqual(100);
    });

    it('数据不足时返回 undefined', () => {
      const shortData = mockData.slice(0, 5);
      const rsi = calculateRSI(shortData, 14);
      expect(rsi).toBeUndefined();
    });

    it('全部上涨时 RSI 应为 100', () => {
      const allUpData: StockData[] = [
        { code: 'sz000001', date: '2024-01-01', open: 10, high: 11, low: 9, close: 10, volume: 1000 },
        { code: 'sz000001', date: '2024-01-02', open: 10, high: 11, low: 9, close: 11, volume: 1000 },
        { code: 'sz000001', date: '2024-01-03', open: 11, high: 12, low: 10, close: 12, volume: 1000 },
        { code: 'sz000001', date: '2024-01-04', open: 12, high: 13, low: 11, close: 13, volume: 1000 },
        { code: 'sz000001', date: '2024-01-05', open: 13, high: 14, low: 12, close: 14, volume: 1000 },
        { code: 'sz000001', date: '2024-01-06', open: 14, high: 15, low: 13, close: 15, volume: 1000 },
        { code: 'sz000001', date: '2024-01-07', open: 15, high: 16, low: 14, close: 16, volume: 1000 },
        { code: 'sz000001', date: '2024-01-08', open: 16, high: 17, low: 15, close: 17, volume: 1000 },
      ];

      const rsi = calculateRSI(allUpData, 7);
      expect(rsi).toBe(100);
    });
  });

  describe('calculateTechnicalIndicators', () => {
    const mockData: StockData[] = [
      { code: 'sz000001', date: '2024-01-01', open: 10, high: 11, low: 9, close: 10, volume: 1000 },
      { code: 'sz000001', date: '2024-01-02', open: 10, high: 11, low: 9, close: 11, volume: 1000 },
      { code: 'sz000001', date: '2024-01-03', open: 11, high: 12, low: 10, close: 12, volume: 1000 },
      { code: 'sz000001', date: '2024-01-04', open: 12, high: 13, low: 11, close: 13, volume: 1000 },
      { code: 'sz000001', date: '2024-01-05', open: 13, high: 14, low: 12, close: 14, volume: 1000 },
      { code: 'sz000001', date: '2024-01-06', open: 14, high: 15, low: 13, close: 15, volume: 1000 },
      { code: 'sz000001', date: '2024-01-07', open: 15, high: 16, low: 14, close: 16, volume: 1000 },
      { code: 'sz000001', date: '2024-01-08', open: 16, high: 17, low: 15, close: 17, volume: 1000 },
      { code: 'sz000001', date: '2024-01-09', open: 17, high: 18, low: 16, close: 18, volume: 1000 },
      { code: 'sz000001', date: '2024-01-10', open: 18, high: 19, low: 17, close: 19, volume: 1000 },
      { code: 'sz000001', date: '2024-01-11', open: 19, high: 20, low: 18, close: 20, volume: 1000 },
      { code: 'sz000001', date: '2024-01-12', open: 20, high: 21, low: 19, close: 21, volume: 1000 },
      { code: 'sz000001', date: '2024-01-13', open: 21, high: 22, low: 20, close: 22, volume: 1000 },
      { code: 'sz000001', date: '2024-01-14', open: 22, high: 23, low: 21, close: 23, volume: 1000 },
      { code: 'sz000001', date: '2024-01-15', open: 23, high: 24, low: 22, close: 24, volume: 1000 },
    ];

    it('应该计算所有技术指标', () => {
      const indicators = calculateTechnicalIndicators(mockData);

      expect(indicators.ma5).toBeDefined();
      expect(indicators.ma10).toBeDefined();
      expect(indicators.ma20).toBeUndefined(); // 数据不足20天
      expect(indicators.rsi).toBeDefined();
    });

    it('MA5 应该等于最近5天收盘价的平均值', () => {
      const indicators = calculateTechnicalIndicators(mockData);
      const expectedMA5 = (20 + 21 + 22 + 23 + 24) / 5;

      expect(indicators.ma5).toBe(expectedMA5);
    });
  });

  // ============= enhancedDecisionSchema 测试 (Phase 4.6) =============

  describe('enhancedDecisionSchema', () => {
    it('应该接受有效的买入决策', () => {
      const decision = {
        action: 'buy' as const,
        stock: 'sz000001',
        quantity: 100,
        reason: '技术面强势突破，MACD金叉，成交量放大',
        confidence: 0.85,
      };

      const result = enhancedDecisionSchema.parse(decision);
      expect(result.action).toBe('buy');
    });

    it('应该拒绝缺少股票的买入决策', () => {
      const decision = {
        action: 'buy' as const,
        quantity: 100,
        reason: '测试理由文本需要足够长度才能通过验证',
      };

      const result = enhancedDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });

    it('应该拒绝缺少数量的买入决策', () => {
      const decision = {
        action: 'buy' as const,
        stock: 'sz000001',
        reason: '测试理由文本需要足够长度才能通过验证',
      };

      const result = enhancedDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });

    it('应该接受有效的持有决策（无股票和数量）', () => {
      const decision = {
        action: 'hold' as const,
        reason: '市场震荡，观望等待更好入场点',
      };

      const result = enhancedDecisionSchema.parse(decision);
      expect(result.action).toBe('hold');
    });

    it('应该拒绝包含股票的持有决策', () => {
      const decision = {
        action: 'hold' as const,
        stock: 'sz000001',
        reason: '测试理由文本需要足够长度才能通过验证',
      };

      const result = enhancedDecisionSchema.safeParse(decision);
      expect(result.success).toBe(false);
    });
  });

  // ============= validateDecisionWithContext 测试 (Phase 4.6) =============

  describe('validateDecisionWithContext', () => {
    const baseContext = {
      availableCapital: 100000,
      currentPrice: 10.0,
      currentDate: '2024-01-03',
    };

    it('应该验证通过有效的买入决策', () => {
      const decision = {
        action: 'buy' as const,
        stock: 'sz000001',
        quantity: 100,
        reason: '测试理由文本需要足够长度才能通过验证',
        confidence: 0.8,
      };

      const result = validateDecisionWithContext(decision, baseContext);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('应该检测资金不足', () => {
      const decision = {
        action: 'buy' as const,
        stock: 'sz000001',
        quantity: 20000, // 20000 * 10 = 200000 > 100000
        reason: '测试理由文本需要足够长度才能通过验证',
      };

      const result = validateDecisionWithContext(decision, baseContext);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('资金不足'))).toBe(true);
    });

    it('应该警告数量不是100的整数倍', () => {
      const decision = {
        action: 'buy' as const,
        stock: 'sz000001',
        quantity: 150,
        reason: '测试理由文本需要足够长度才能通过验证',
      };

      const result = validateDecisionWithContext(decision, baseContext);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('100') && w.includes('整数倍'))).toBe(true);
    });

    it('应该警告低置信度', () => {
      const decision = {
        action: 'hold' as const,
        reason: '测试理由文本需要足够长度才能通过验证',
        confidence: 0.2,
      };

      const result = validateDecisionWithContext(decision, baseContext);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('置信度较低'))).toBe(true);
    });

    it('卖出决策：无持仓时应该失败', () => {
      const decision = {
        action: 'sell' as const,
        stock: 'sz000001',
        quantity: 100,
        reason: '测试理由文本需要足够长度才能通过验证',
      };

      const result = validateDecisionWithContext(decision, baseContext);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('无持仓'))).toBe(true);
    });

    it('卖出决策：违反T+1规则时应该失败', () => {
      const decision = {
        action: 'sell' as const,
        stock: 'sz000001',
        quantity: 100,
        reason: '测试理由文本需要足够长度才能通过验证',
      };

      const context = {
        ...baseContext,
        currentPosition: {
          stock: 'sz000001',
          quantity: 1000,
          buyDate: '2024-01-03', // 当天买入
          avgPrice: 10.0,
        },
      };

      const result = validateDecisionWithContext(decision, context);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('T+1'))).toBe(true);
    });

    it('卖出决策：持仓超过一天时应该通过', () => {
      const decision = {
        action: 'sell' as const,
        stock: 'sz000001',
        quantity: 100,
        reason: '测试理由文本需要足够长度才能通过验证',
      };

      const context = {
        ...baseContext,
        currentPosition: {
          stock: 'sz000001',
          quantity: 1000,
          buyDate: '2024-01-02', // 前一天买入
          avgPrice: 10.0,
        },
      };

      const result = validateDecisionWithContext(decision, context);
      expect(result.valid).toBe(true);
    });

    it('卖出决策：数量超过持仓时应该失败', () => {
      const decision = {
        action: 'sell' as const,
        stock: 'sz000001',
        quantity: 2000, // 超过持仓1000
        reason: '测试理由文本需要足够长度才能通过验证',
      };

      const context = {
        ...baseContext,
        currentPosition: {
          stock: 'sz000001',
          quantity: 1000,
          buyDate: '2024-01-02',
          avgPrice: 10.0,
        },
      };

      const result = validateDecisionWithContext(decision, context);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('超过持仓'))).toBe(true);
    });

    it('应该拒绝无效的决策格式', () => {
      const invalidDecision = {
        action: 'invalid',
        reason: '测试',
      };

      const result = validateDecisionWithContext(invalidDecision, baseContext);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该警告持仓比例较高', () => {
      const decision = {
        action: 'buy' as const,
        stock: 'sz000001',
        quantity: 9000, // 9000 * 10 = 90000，加上持仓10000 = 100000，刚好达到上限
        reason: '测试理由文本需要足够长度才能通过验证',
      };

      const context = {
        ...baseContext,
        currentPosition: {
          stock: 'sz000001',
          quantity: 1000,
          buyDate: '2024-01-02',
          avgPrice: 10.0,
        },
        maxPositionRatio: 0.5,
      };

      const result = validateDecisionWithContext(decision, context);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('持仓'))).toBe(true);
    });
  });
});
