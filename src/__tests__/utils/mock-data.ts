/**
 * 固定测试数据
 * 用于单元测试和集成测试，保证测试结果的可重复性
 */

import type { StockData, AIDecision, Trade, Position } from '@/types';

// ============= 股票测试数据 =============

export const MOCK_STOCK_CODES = {
  SZ000001: 'sz000001', // 平安银行
  SH600000: 'sh600000', // 浦发银行
  SZ000002: 'sz000002', // 万科A
};

/** 标准K线测试数据 - 5天 */
export const MOCK_STOCK_DATA: StockData[] = [
  {
    code: 'sz000001',
    date: '2024-01-02',
    open: 10.00,
    high: 10.50,
    low: 9.80,
    close: 10.30,
    volume: 1000000,
  },
  {
    code: 'sz000001',
    date: '2024-01-03',
    open: 10.30,
    high: 10.80,
    low: 10.20,
    close: 10.60,
    volume: 1200000,
  },
  {
    code: 'sz000001',
    date: '2024-01-04',
    open: 10.60,
    high: 10.90,
    low: 10.50,
    close: 10.85,
    volume: 900000,
  },
  {
    code: 'sz000001',
    date: '2024-01-05',
    open: 10.85,
    high: 11.20,
    low: 10.70,
    close: 11.00,
    volume: 1500000,
  },
  {
    code: 'sz000001',
    date: '2024-01-08',
    open: 11.00,
    high: 11.30,
    low: 10.90,
    close: 11.15,
    volume: 1100000,
  },
];

/** Sina API 原始响应格式 */
export const MOCK_SINA_API_RESPONSE =
  '2024-01-02,10.00,10.50,9.80,10.30,1000000,0\n' +
  '2024-01-03,10.30,10.80,10.20,10.60,1200000,0\n' +
  '2024-01-04,10.60,10.90,10.50,10.85,900000,0\n' +
  '2024-01-05,10.85,11.20,10.70,11.00,1500000,0\n' +
  '2024-01-08,11.00,11.30,10.90,11.15,1100000,0';

/** 实时行情API响应 */
export const MOCK_SINA_REALTIME_RESPONSE =
  '2024-01-08,11.00,11.30,10.90,11.15,1100000,0';

// ============= AI决策测试数据 =============

/** AI买入决策响应 */
export const MOCK_AI_BUY_DECISION: AIDecision = {
  action: 'buy',
  stock: 'sz000001',
  quantity: 1000,
  reason: '技术面强势突破，MACD金叉，成交量放大',
  confidence: 0.85,
};

/** AI卖出决策响应 */
export const MOCK_AI_SELL_DECISION: AIDecision = {
  action: 'sell',
  stock: 'sz000001',
  quantity: 500,
  reason: '获利了结，短期技术指标超买',
  confidence: 0.75,
};

/** AI持有决策响应 */
export const MOCK_AI_HOLD_DECISION: AIDecision = {
  action: 'hold',
  reason: '市场震荡，观望等待更好入场点',
  confidence: 0.6,
};

/** OpenRouter API 原始JSON响应 */
export const MOCK_OPENROUTER_BUY_RESPONSE = {
  id: 'gen-123',
  choices: [
    {
      message: {
        role: 'assistant',
        content: JSON.stringify(MOCK_AI_BUY_DECISION),
      },
    },
  ],
};

export const MOCK_OPENROUTER_SELL_RESPONSE = {
  id: 'gen-456',
  choices: [
    {
      message: {
        role: 'assistant',
        content: JSON.stringify(MOCK_AI_SELL_DECISION),
      },
    },
  ],
};

export const MOCK_OPENROUTER_HOLD_RESPONSE = {
  id: 'gen-789',
  choices: [
    {
      message: {
        role: 'assistant',
        content: JSON.stringify(MOCK_AI_HOLD_DECISION),
      },
    },
  ],
};

// ============= 交易测试数据 =============

export const MOCK_INITIAL_CAPITAL = 100000;

export const MOCK_TRADE: Trade = {
  id: 'trade-001',
  model: 'deepseek',
  stock: 'sz000001',
  type: 'buy',
  price: 10.30,
  quantity: 1000,
  amount: 10300,
  commission: 5.15,
  date: '2024-01-02',
  timestamp: '2024-01-02T09:30:00Z',
};

export const MOCK_POSITION: Position = {
  stock: 'sz000001',
  quantity: 1000,
  buyDate: '2024-01-02',
  avgPrice: 10.30,
};

// ============= 日期/交易日测试数据 =============

export const MOCK_TRADING_DAYS = [
  '2024-01-02',
  '2024-01-03',
  '2024-01-04',
  '2024-01-05',
  '2024-01-08',
  '2024-01-09',
  '2024-01-10',
];

export const MOCK_NON_TRADING_DAYS = [
  '2024-01-06', // 周六
  '2024-01-07', // 周日
  '2024-01-13', // 周六
  '2024-01-14', // 周日
];

// ============= 回测测试数据 =============

export const MOCK_BACKTEST_CONFIG = {
  stock: 'sz000001',
  startDate: '2024-01-02',
  endDate: '2024-01-05',
  initialCapital: MOCK_INITIAL_CAPITAL,
  models: ['deepseek', 'gemini', 'claude'] as const,
};

export const MOCK_BACKTEST_RESULT = {
  model: 'deepseek',
  initialCapital: MOCK_INITIAL_CAPITAL,
  finalCapital: 105000,
  profit: 5000,
  profitRate: 0.05,
  tradeCount: 5,
  winRate: 0.6,
  maxDrawdown: 0.02,
  sharpeRatio: 1.5,
  trades: [MOCK_TRADE],
  dailyValues: [
    { date: '2024-01-02', value: 100000 },
    { date: '2024-01-03', value: 101500 },
    { date: '2024-01-04', value: 103000 },
    { date: '2024-01-05', value: 105000 },
  ],
};

// ============= 错误响应测试数据 =============

export const MOCK_API_ERROR_RESPONSE = {
  error: {
    message: 'Invalid API key',
    type: 'authentication_error',
    code: 'invalid_api_key',
  },
};

export const MOCK_INVALID_JSON_RESPONSE = {
  id: 'gen-error',
  choices: [
    {
      message: {
        role: 'assistant',
        content: 'This is not valid JSON {{{',
      },
    },
  ],
};
