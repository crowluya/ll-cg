// ==================== 股票数据 ====================

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

// 实时行情接口（包含涨跌停、停牌标记）
export interface RealtimeQuote {
  code: string;           // 股票代码
  name: string;           // 股票名称
  price: number;          // 当前价
  open: number;           // 开盘价
  close: number;          // 昨收价
  high: number;           // 最高价
  low: number;            // 最低价
  volume: number;         // 成交量（股）
  timestamp: string;      // 时间戳
  // 买卖五档（可选，取决于 API）
  bid1?: number;          // 买一价
  bid2?: number;          // 买二价
  bid3?: number;          // 买三价
  bid4?: number;          // 买四价
  bid5?: number;          // 买五价
  ask1?: number;          // 卖一价
  ask2?: number;          // 卖二价
  ask3?: number;          // 卖三价
  ask4?: number;          // 卖四价
  ask5?: number;          // 卖五价
  bidVol1?: number;       // 买一量
  bidVol2?: number;       // 买二量
  bidVol3?: number;       // 买三量
  bidVol4?: number;       // 买四量
  bidVol5?: number;       // 买五量
  askVol1?: number;       // 卖一量
  askVol2?: number;       // 卖二量
  askVol3?: number;       // 卖三量
  askVol4?: number;       // 卖四量
  askVol5?: number;       // 卖五量
  // 状态标记
  isLimitUp: boolean;     // 是否涨停
  isLimitDown: boolean;   // 是否跌停
  isSuspended: boolean;   // 是否停牌
}

// 分时数据点接口
export interface IntradayPoint {
  timestamp: string;      // 时间点
  price: number;          // 价格
  volume: number;         // 成交量
}

// 交易记录接口
export interface Trade {
  id: string;
  model: string;     // 模型名称
  stock: string;     // 股票代码
  stockName: string; // 股票名称
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  date: string;      // 交易日期 YYYY-MM-DD
  timestamp: string; // 交易时间戳
  reason?: string;   // AI 决策理由
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

// AI决策输入（扩展版）
export interface DecisionInput {
  stockCode: string;
  historyData: StockData[];
  currentPosition?: Position;
  availableCapital: number;
  currentDate: string;
  // 扩展字段
  realtimeQuotes?: Map<string, RealtimeQuote>;  // 实时行情
  klineData?: StockData[];                       // K线数据
  intradayData?: IntradayPoint[];                // 分时数据
  account?: Account;                              // 账户信息
  config?: TradingConfig;                         // 交易配置
  currentTime?: string;                           // 当前时间戳
}

// ==================== 交易相关 ====================

// 交易时段配置
export interface TradingTimeRange {
  start: string;  // HH:mm 格式
  end: string;    // HH:mm 格式
}

// 交易配置接口
export interface TradingConfig {
  thinkInterval: number;                    // 思考间隔（秒）1-60
  initialCapital: number;                   // 初始资金
  maxPositionRatio: number;                 // 单票持仓上限（比例 0-1）
  tradingHours: {
    morning: TradingTimeRange;              // 上午交易时段
    afternoon: TradingTimeRange;            // 下午交易时段
  };
}

// 股票池接口
export interface StockPool {
  userId: string;         // 用户 ID
  stocks: string[];       // 股票代码列表
  updatedAt: string;      // 更新时间
}

// ==================== 回放相关 ====================

// 回放事件接口
export interface ReplayEvent {
  id: string;              // 事件唯一标识
  timestamp: string;       // 事件时间戳
  type: string;            // 事件类型（trade/decision/snapshot 等）
  agentId?: string;        // 关联的 AI 代理 ID
  data: unknown;           // 事件数据
}

// 回放状态接口
export interface ReplayState {
  isPlaying: boolean;           // 是否正在播放
  currentTime: string;          // 当前播放时间
  speed: number;                // 播放速度（1x, 2x, 4x 等）
  events: ReplayEvent[];        // 所有事件
  currentEventIndex: number;    // 当前事件索引
}

// ==================== 账户相关扩展 ====================

// 账户接口（完整版）
export interface Account {
  agentId: string;              // AI 代理 ID
  initialCapital: number;       // 初始资金
  cash: number;                 // 当前现金
  positions: PositionExtended[]; // 持仓列表
  totalValue: number;           // 总资产
  marketValue: number;          // 持仓市值
  profit: number;               // 累计盈亏
  profitRate: number;           // 累计盈亏率（%）
  dailyProfit: number;          // 今日盈亏
  dailyProfitRate: number;      // 今日盈亏率（%）
}

// 持仓接口（扩展版）
export interface PositionExtended {
  stock: string;           // 股票代码
  stockName: string;       // 股票名称
  quantity: number;        // 持仓数量
  avgPrice: number;        // 平均成本
  currentPrice: number;    // 当前价格
  buyDate: string;         // 买入日期
  availableToday: number;  // 今日可卖数量（T+1 规则）
  marketValue: number;     // 市值
  profit: number;          // 盈亏金额
  profitRate: number;      // 盈亏率（%）
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

// ==================== AI 相关 ====================

// AI 模型配置接口
export interface AIModel {
  id: string;           // 模型唯一标识
  name: string;         // 模型显示名称
  provider: string;     // 提供商 (openrouter/自定义)
  modelId: string;      // 模型 ID（用于 API 调用）
  enabled: boolean;     // 是否启用
  apiKey?: string;      // 可选的自定义 API Key
}

// AI 消息接口（用于思考流展示）
export interface AIMessage {
  id: string;                              // 消息唯一标识
  agentId: string;                         // AI 代理 ID
  type: 'thinking' | 'decision' | 'execution'; // 消息类型
  content: string;                         // 消息内容
  timestamp: string;                       // 时间戳
  data?: unknown;                          // 附加数据（决策结果、执行结果等）
}
