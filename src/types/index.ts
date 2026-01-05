// 股票数据接口
export interface StockData {
  code: string;      // 股票代码
  date: string;      // 日期 YYYY-MM-DD
  open: number;      // 开盘价
  high: number;      // 最高价
  low: number;       // 最低价
  close: number;     // 收盘价
  volume: number;    // 成交量
}

// 交易记录接口
export interface Trade {
  id: string;
  model: string;     // 模型名称
  stock: string;     // 股票代码
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  date: string;      // 交易日期 YYYY-MM-DD
  timestamp: string; // 交易时间戳
  createdAt?: Date;
}

// 持仓接口
export interface Position {
  stock: string;
  quantity: number;
  buyDate: string;   // 买入日期（用于T+1判断）
  avgPrice: number;  // 平均成本
}

// 模型账户接口
export interface ModelAccount {
  model: string;
  initialCapital: number;  // 初始资金 10万
  currentCapital: number;   // 当前现金
  positions: Position[];   // 持仓
  trades: Trade[];         // 交易记录
  totalValue: number;      // 总资产（现金+持仓市值）
  profit: number;          // 盈亏
  profitRate: number;      // 盈亏率
}

// AI决策输入
export interface DecisionInput {
  stockCode: string;
  historyData: StockData[];
  currentPosition?: Position;
  availableCapital: number;
  currentDate: string;
}

// AI决策输出
export interface AIDecision {
  action: 'buy' | 'sell' | 'hold';
  stock?: string;
  quantity?: number;
  reason: string;
}

// AI决策记录
export interface AIDecisionRecord {
  id: string;
  model: string;
  stock: string;
  decisionTime: Date;
  inputData: {
    historyData: StockData[];
    currentPosition?: Position;
    availableCapital: number;
    currentDate: string;
  };
  outputDecision: AIDecision;
  executionResult: {
    executed: boolean;
    tradeId?: string;
    error?: string;
  };
  createdAt?: Date;
}

// 账户快照
export interface AccountSnapshot {
  id: string;
  model: string;
  date: string;
  cash: number;
  totalValue: number;
  profit: number;
  profitRate: number;
  positionsData: Position[];
  createdAt?: Date;
}

// 回测配置
export interface BacktestConfig {
  stocks: string[];        // 股票列表
  models: string[];        // 模型列表
  startDate: string;       // 开始日期 YYYY-MM-DD
  endDate: string;         // 结束日期 YYYY-MM-DD
  historyDays: number;     // 历史数据天数
  initialCapital: number;  // 初始资金
}

// 回测结果
export interface BacktestResult {
  model: string;
  trades: Trade[];
  finalValue: number;
  profit: number;
  profitRate: number;
  winRate: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
}

// 实盘交易状态
export interface LiveTradingStatus {
  id: string;
  model: string;
  stock: string;
  isActive: boolean;
  lastDecisionTime?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// 支持的AI模型
export const AI_MODELS = {
  deepseek: 'deepseek/deepseek-chat',
  gemini: 'google/gemini-2.0-flash-exp',
  claude: 'anthropic/claude-3.5-sonnet',
} as const;

export type AIModelKey = keyof typeof AI_MODELS;
