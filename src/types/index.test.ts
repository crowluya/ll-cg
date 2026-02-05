/**
 * Phase 1.1: 类型定义测试
 *
 * 测试新增的类型接口是否正确定义
 */

import { describe, it, expect } from 'vitest';

// 使用 import type 来确保类型确实存在
import type {
  RealtimeQuote,
  IntradayPoint,
  AIModel,
  AIMessage,
  TradingConfig,
  StockPool,
  ReplayEvent,
  ReplayState,
  DecisionInput,
  Account,
  PositionExtended,
} from '@/types';

// 导出类型以确保它们存在（否则会报编译错误）
export type TypeExports = {
  RealtimeQuote: RealtimeQuote;
  IntradayPoint: IntradayPoint;
  AIModel: AIModel;
  AIMessage: AIMessage;
  TradingConfig: TradingConfig;
  StockPool: StockPool;
  ReplayEvent: ReplayEvent;
  ReplayState: ReplayState;
  DecisionInput: DecisionInput;
  Account: Account;
  PositionExtended: PositionExtended;
};

describe('Phase 1: 基础类型扩展', () => {
  describe('RealtimeQuote - 实时行情接口', () => {
    it('应该定义实时行情所需字段', () => {
      const quote: RealtimeQuote = {
        code: 'sh600519',
        name: '贵州茅台',
        price: 1850.00,
        open: 1840.00,
        close: 1830.00, // 昨收
        high: 1860.00,
        low: 1835.00,
        volume: 50000,
        timestamp: '2025-02-05T10:30:00Z',
        bid1: 1849.00,
        ask1: 1850.00,
        bidVol1: 100,
        askVol1: 200,
        isLimitUp: false,
        isLimitDown: false,
        isSuspended: false,
      };

      expect(quote.code).toBe('sh600519');
      expect(quote.price).toBe(1850.00);
      expect(quote.isLimitUp).toBe(false);
      expect(quote.isLimitDown).toBe(false);
      expect(quote.isSuspended).toBe(false);
    });

    it('应该支持买卖五档数据', () => {
      const quote: RealtimeQuote = {
        code: 'sh600519',
        name: '贵州茅台',
        price: 1850.00,
        open: 1840.00,
        close: 1830.00,
        high: 1860.00,
        low: 1835.00,
        volume: 50000,
        timestamp: '2025-02-05T10:30:00Z',
        // 买一到买五
        bid1: 1849.00,
        bid2: 1848.00,
        bid3: 1847.00,
        bid4: 1846.00,
        bid5: 1845.00,
        // 卖一到卖五
        ask1: 1850.00,
        ask2: 1851.00,
        ask3: 1852.00,
        ask4: 1853.00,
        ask5: 1854.00,
        // 买卖量
        bidVol1: 100,
        bidVol2: 200,
        bidVol3: 300,
        bidVol4: 400,
        bidVol5: 500,
        askVol1: 100,
        askVol2: 200,
        askVol3: 300,
        askVol4: 400,
        askVol5: 500,
        isLimitUp: false,
        isLimitDown: false,
        isSuspended: false,
      };

      expect(quote.bid1).toBe(1849.00);
      expect(quote.ask5).toBe(1854.00);
      expect(quote.bidVol1).toBe(100);
      expect(quote.askVol5).toBe(500);
    });

    it('应该正确标记涨停状态', () => {
      const limitUpQuote: RealtimeQuote = {
        code: 'sh600519',
        name: '贵州茅台',
        price: 2013.00, // 涨停价
        open: 1840.00,
        close: 1830.00,
        high: 2013.00,
        low: 1840.00,
        volume: 1000000,
        timestamp: '2025-02-05T10:30:00Z',
        isLimitUp: true,
        isLimitDown: false,
        isSuspended: false,
      };

      expect(limitUpQuote.isLimitUp).toBe(true);
    });

    it('应该正确标记跌停状态', () => {
      const limitDownQuote: RealtimeQuote = {
        code: 'sh600519',
        name: '贵州茅台',
        price: 1647.00, // 跌停价
        open: 1830.00,
        close: 1830.00,
        high: 1830.00,
        low: 1647.00,
        volume: 1000000,
        timestamp: '2025-02-05T10:30:00Z',
        isLimitUp: false,
        isLimitDown: true,
        isSuspended: false,
      };

      expect(limitDownQuote.isLimitDown).toBe(true);
    });

    it('应该正确标记停牌状态', () => {
      const suspendedQuote: RealtimeQuote = {
        code: 'sh600519',
        name: '贵州茅台',
        price: 1830.00,
        open: 1830.00,
        close: 1830.00,
        high: 1830.00,
        low: 1830.00,
        volume: 0,
        timestamp: '2025-02-05T10:30:00Z',
        isLimitUp: false,
        isLimitDown: false,
        isSuspended: true,
      };

      expect(suspendedQuote.isSuspended).toBe(true);
    });
  });

  describe('IntradayPoint - 分时数据点接口', () => {
    it('应该定义分时数据点字段', () => {
      const point: IntradayPoint = {
        timestamp: '2025-02-05T09:31:00Z',
        price: 1850.00,
        volume: 50000,
      };

      expect(point.timestamp).toBeDefined();
      expect(point.price).toBe(1850.00);
      expect(point.volume).toBe(50000);
    });
  });

  describe('AIModel - AI 模型配置接口', () => {
    it('应该定义 AI 模型配置字段', () => {
      const model: AIModel = {
        id: 'deepseek',
        name: 'DeepSeek Chat',
        provider: 'openrouter',
        modelId: 'deepseek/deepseek-chat',
        enabled: true,
      };

      expect(model.id).toBe('deepseek');
      expect(model.provider).toBe('openrouter');
      expect(model.enabled).toBe(true);
    });

    it('应该支持自定义 API Key', () => {
      const customModel: AIModel = {
        id: 'custom-gpt4',
        name: 'My GPT-4',
        provider: 'openrouter',
        modelId: 'openai/gpt-4-turbo',
        enabled: true,
        apiKey: 'sk-custom-key-123',
      };

      expect(customModel.apiKey).toBe('sk-custom-key-123');
    });
  });

  describe('AIMessage - AI 消息接口', () => {
    it('应该定义思考过程消息', () => {
      const thinkingMessage: AIMessage = {
        id: 'msg-1',
        agentId: 'deepseek',
        type: 'thinking',
        content: '分析当前市场情况...',
        timestamp: '2025-02-05T10:30:00Z',
      };

      expect(thinkingMessage.type).toBe('thinking');
      expect(thinkingMessage.content).toBeDefined();
    });

    it('应该定义决策结果消息', () => {
      const decisionMessage: AIMessage = {
        id: 'msg-2',
        agentId: 'deepseek',
        type: 'decision',
        content: '决定买入贵州茅台',
        data: {
          action: 'buy',
          stock: 'sh600519',
          quantity: 100,
          reason: '技术面显示上涨趋势',
        },
        timestamp: '2025-02-05T10:30:05Z',
      };

      expect(decisionMessage.type).toBe('decision');
      expect(decisionMessage.data?.action).toBe('buy');
    });

    it('应该定义执行状态消息', () => {
      const executionMessage: AIMessage = {
        id: 'msg-3',
        agentId: 'deepseek',
        type: 'execution',
        content: '买入执行成功',
        data: {
          executed: true,
          tradeId: 'trade-deepseek-sh600519-123',
        },
        timestamp: '2025-02-05T10:30:10Z',
      };

      expect(executionMessage.type).toBe('execution');
      expect(executionMessage.data?.executed).toBe(true);
    });
  });

  describe('TradingConfig - 交易配置接口', () => {
    it('应该定义交易配置字段', () => {
      const config: TradingConfig = {
        thinkInterval: 10, // 10秒
        initialCapital: 100000,
        maxPositionRatio: 0.5, // 50%
        tradingHours: {
          morning: { start: '09:15', end: '11:30' },
          afternoon: { start: '13:00', end: '15:00' },
        },
      };

      expect(config.thinkInterval).toBe(10);
      expect(config.initialCapital).toBe(100000);
      expect(config.maxPositionRatio).toBe(0.5);
      expect(config.tradingHours.morning.start).toBe('09:15');
    });
  });

  describe('StockPool - 股票池接口', () => {
    it('应该定义股票池字段', () => {
      const pool: StockPool = {
        userId: 'user-1',
        stocks: ['sh600519', 'sz000001', 'sh600036'],
        updatedAt: '2025-02-05T10:00:00Z',
      };

      expect(pool.userId).toBe('user-1');
      expect(pool.stocks).toHaveLength(3);
      expect(pool.stocks).toContain('sh600519');
    });
  });

  describe('ReplayEvent - 回放事件接口', () => {
    it('应该定义回放事件字段', () => {
      const event: ReplayEvent = {
        id: 'event-1',
        timestamp: '2025-02-05T09:31:00Z',
        type: 'trade',
        agentId: 'deepseek',
        data: {
          action: 'buy',
          stock: 'sh600519',
          quantity: 100,
          price: 1850.00,
        },
      };

      expect(event.type).toBe('trade');
      expect(event.agentId).toBe('deepseek');
      expect(event.data?.action).toBe('buy');
    });
  });

  describe('ReplayState - 回放状态接口', () => {
    it('应该定义回放状态字段', () => {
      const state: ReplayState = {
        isPlaying: true,
        currentTime: '2025-02-05T10:00:00Z',
        speed: 2, // 2倍速
        events: [],
        currentEventIndex: 5,
      };

      expect(state.isPlaying).toBe(true);
      expect(state.speed).toBe(2);
      expect(state.currentEventIndex).toBe(5);
    });
  });

  describe('Account - 账户接口（扩展）', () => {
    it('应该包含账户完整信息', () => {
      const account: Account = {
        agentId: 'deepseek',
        initialCapital: 100000,
        cash: 50000,
        positions: [],
        totalValue: 100000,
        marketValue: 50000,
        profit: 0,
        profitRate: 0,
        dailyProfit: 1000,
        dailyProfitRate: 1.0,
      };

      expect(account.agentId).toBe('deepseek');
      expect(account.marketValue).toBe(50000);
      expect(account.dailyProfit).toBe(1000);
      expect(account.dailyProfitRate).toBe(1.0);
    });
  });

  describe('PositionExtended - 持仓扩展接口', () => {
    it('应该包含持仓详细信息', () => {
      const position: PositionExtended = {
        stock: 'sh600519',
        stockName: '贵州茅台',
        quantity: 100,
        avgPrice: 1800.00,
        currentPrice: 1850.00,
        buyDate: '2025-02-01',
        availableToday: 100, // 今日可卖数量
        marketValue: 185000,
        profit: 5000,
        profitRate: 2.78,
      };

      expect(position.stockName).toBe('贵州茅台');
      expect(position.availableToday).toBe(100);
      expect(position.marketValue).toBe(185000);
      expect(position.profitRate).toBeCloseTo(2.78, 1);
    });
  });

  describe('DecisionInput - 决策输入扩展', () => {
    it('应该包含完整的决策输入数据', () => {
      const input: DecisionInput = {
        stockCode: 'sh600519',
        historyData: [],
        currentPosition: undefined,
        availableCapital: 50000,
        currentDate: '2025-02-05',
        realtimeQuotes: new Map(),
        klineData: [],
        intradayData: [],
        account: {} as any,
        config: {} as any,
        currentTime: '2025-02-05T10:30:00Z',
      };

      expect(input.stockCode).toBe('sh600519');
      expect(input.realtimeQuotes).toBeDefined();
      expect(input.currentTime).toBeDefined();
    });
  });
});
