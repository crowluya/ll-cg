# API 接口概览 (API Sketch)

> 版本: 1.0
> 用途: 后续开发的接口参考

---

## 目录

1. [类型定义](#1-类型定义)
2. [核心业务接口](#2-核心业务接口)
3. [API 路由接口](#3-api-路由接口)
4. [React Hooks](#4-react-hooks)

---

## 1. 类型定义

### 1.1 核心类型 (`src/types/index.ts`)

```typescript
// ==================== 股票数据 ====================

interface StockData {
  code: string;           // 股票代码 sh600519
  name: string;           // 股票名称
  date: string;           // 日期 YYYY-MM-DD
  open: number;           // 开盘价
  high: number;           // 最高价
  low: number;            // 最低价
  close: number;          // 收盘价
  volume: number;         // 成交量
  amount?: number;        // 成交额
}

interface RealtimeQuote {
  code: string;
  name: string;
  price: number;          // 当前价
  open: number;           // 今开
  close: number;          // 昨收
  high: number;           // 最高
  low: number;            // 最低
  volume: number;         // 成交量
  amount: number;         // 成交额
  bid1: number;           // 买一价
  bid1Vol: number;        // 买一量
  ask1: number;           // 卖一价
  ask1Vol: number;        // 卖一量
  timestamp: Date;        // 更新时间
  limitUp?: number;       // 涨停价
  limitDown?: number;     // 跌停价
  isLimitUp: boolean;     // 是否涨停
  isLimitDown: boolean;   // 是否跌停
  isSuspended: boolean;   // 是否停牌
}

interface IntradayPoint {
  timestamp: Date;
  price: number;
  volume: number;
}

// ==================== AI 相关 ====================

interface AIModel {
  id: string;             // deepseek-v3
  name: string;           // DeepSeek V3
  provider: string;       // openrouter
  modelId: string;        // deepseek/deepseek-chat
  enabled: boolean;       // 是否启用
}

interface AIDecision {
  action: 'buy' | 'sell' | 'hold';
  stock?: string;
  quantity?: number;
  reason: string;
  confidence?: number;    // 置信度 0-1
  timestamp: Date;
}

interface AIMessage {
  id: string;
  agentId: string;
  type: 'thinking' | 'decision' | 'execution';
  content: string;
  data?: unknown;         // 决策数据、执行结果等
  timestamp: Date;
}

// ==================== 交易相关 ====================

interface Position {
  stock: string;
  stockName: string;
  quantity: number;       // 持仓数量
  avgPrice: number;       // 成本价
  currentPrice: number;   // 当前价
  marketValue: number;    // 市值
  profit: number;         // 盈亏
  profitRate: number;     // 盈亏率
  buyDate: string;        // 买入日期 (T+1 判断用)
  availableToday: number; // 今日可卖数量
}

interface Account {
  agentId: string;
  initialCapital: number; // 初始资金 100000
  cash: number;           // 可用现金
  positions: Position[];  // 持仓列表
  totalValue: number;     // 总资产
  marketValue: number;    // 持仓市值
  profit: number;         // 累计盈亏
  profitRate: number;     // 累计盈亏率
  dailyProfit: number;    // 今日盈亏
  dailyProfitRate: number;// 今日盈亏率
}

interface Trade {
  id: string;
  agentId: string;
  stock: string;
  stockName: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  amount: number;         // 交易金额
  date: string;           // 交易日期
  timestamp: Date;
  reason: string;         // AI 决策理由
  status: 'success' | 'failed';
  error?: string;
}

// ==================== 配置相关 ====================

interface TradingConfig {
  thinkInterval: number;  // 思考间隔 (秒) 1-60
  initialCapital: number; // 初始资金
  maxPositionRatio: number;// 单票最大仓位 0.5
  tradingHours: {
    morning: { start: string; end: string };   // 9:30-11:30
    afternoon: { start: string; end: string }; // 13:00-15:00
  };
}

interface StockPool {
  userId: string;
  stocks: string[];       // 股票代码列表
  updatedAt: Date;
}

// ==================== 回放相关 ====================

interface ReplayEvent {
  id: string;
  timestamp: Date;
  type: 'trade' | 'decision' | 'price';
  agentId?: string;
  data: unknown;
}

interface ReplayState {
  isPlaying: boolean;
  currentTime: Date;
  speed: number;          // 播放速度倍数
  events: ReplayEvent[];
  currentEventIndex: number;
}
```

---

## 2. 核心业务接口

### 2.1 数据服务 (`lib/data/sina.ts`)

```typescript
/**
 * 获取股票实时行情
 * @param codes - 股票代码数组，如 ['sh600519', 'sz000001']
 * @returns 实时行情数据
 */
async function getRealtimeQuote(
  codes: string[]
): Promise<Map<string, RealtimeQuote>>;

/**
 * 获取股票历史 K 线数据
 * @param code - 股票代码
 * @param startDate - 开始日期 YYYY-MM-DD
 * @param endDate - 结束日期 YYYY-MM-DD
 * @returns K 线数据数组
 */
async function getKLineData(
  code: string,
  startDate: string,
  endDate: string
): Promise<StockData[]>;

/**
 * 获取分时数据
 * @param code - 股票代码
 * @param date - 日期 YYYY-MM-DD
 * @returns 分时点位数据
 */
async function getIntradayData(
  code: string,
  date: string
): Promise<IntradayPoint[]>;

/**
 * 搜索股票
 * @param query - 搜索关键词（代码或名称）
 * @returns 匹配的股票列表
 */
async function searchStock(
  query: string
): Promise<Array<{ code: string; name: string; market: string }>>;
```

### 2.2 缓存服务 (`lib/data/cache.ts`)

```typescript
/**
 * 缓存键生成器
 */
function buildCacheKey(
  type: 'quote' | 'kline' | 'intraday',
  ...args: unknown[]
): string;

/**
 * 获取缓存值
 */
function get<T>(key: string, ttl?: number): Promise<T | undefined>;

/**
 * 设置缓存值
 */
function set(key: string, value: unknown, ttl?: number): Promise<void>;

/**
 * 请求合并 - 多个并发请求共享同一个 Promise
 */
function mergeRequest<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T>;
```

### 2.3 AI 决策服务 (`lib/ai/decision.ts`)

```typescript
/**
 * 生成 AI 交易决策
 * @param model - AI 模型配置
 * @param input - 决策输入数据
 * @returns AI 决策结果
 */
async function makeDecision(
  model: AIModel,
  input: DecisionInput
): Promise<AIDecision>;

/**
 * 决策输入数据结构
 */
interface DecisionInput {
  // 市场数据
  realtimeQuotes: Map<string, RealtimeQuote>;
  klineData: Map<string, StockData[]>;
  intradayData: Map<string, IntradayPoint[]>;

  // 账户状态
  account: Account;

  // 配置
  config: TradingConfig;

  // 当前时间
  currentTime: Date;
}

/**
 * 记录 AI 决策到数据库
 */
async function saveDecision(
  decision: AIDecision,
  input: DecisionInput,
  result: { executed: boolean; error?: string }
): Promise<void>;
```

### 2.4 AI 代理 (`lib/ai/agent.ts`)

```typescript
/**
 * AI 代理类
 */
class AIAgent {
  readonly id: string;
  readonly model: AIModel;
  private account: Account;
  private config: TradingConfig;

  constructor(
    id: string,
    model: AIModel,
    initialCapital: number,
    config: TradingConfig
  );

  /**
   * 执行一次思考-决策-执行循环
   */
  async think(
    marketData: MarketData
  ): Promise<{ message: AIMessage; executed?: Trade }>;

  /**
   * 获取当前账户状态
   */
  getAccount(): Account;

  /**
   * 更新账户状态（外部执行交易后调用）
   */
  updateAccount(trade: Trade): void;

  /**
   * 重置账户
   */
  reset(initialCapital: number): void;
}
```

### 2.5 交易引擎 (`lib/trading/engine.ts`)

```typescript
/**
 * 执行交易
 * @param agentId - AI 代理 ID
 * @param decision - AI 决策
 * @param quote - 当前行情
 * @returns 交易结果
 */
async function executeTrade(
  agentId: string,
  decision: AIDecision,
  quote: RealtimeQuote
): Promise<Trade>;

/**
 * 验证交易是否可执行
 * @returns 验证结果 { valid: boolean; reason?: string }
 */
function validateTrade(
  account: Account,
  decision: AIDecision,
  quote: RealtimeQuote
): { valid: boolean; reason?: string };
```

### 2.6 交易规则 (`lib/trading/rules.ts`)

```typescript
/**
 * 检查是否在交易时间内
 */
function isTradingTime(date: Date): boolean;

/**
 * 检查是否可卖出 (T+1 规则)
 * @param buyDate - 买入日期
 * @param currentDate - 当前日期
 */
function isSellable(buyDate: string, currentDate: string): boolean;

/**
 * 检查是否涨停
 */
function isLimitUp(quote: RealtimeQuote): boolean;

/**
 * 检查是否跌停
 */
function isLimitDown(quote: RealtimeQuote): boolean;

/**
 * 计算涨停价
 */
function calcLimitPrice(close: number, direction: 'up' | 'down'): number;

/**
 * 检查单票仓位是否超限
 */
function checkPositionLimit(
  account: Account,
  stock: string,
  newQuantity: number,
  maxRatio: number
): { valid: boolean; reason?: string };
```

### 2.7 实盘交易管理 (`lib/live/manager.ts`)

```typescript
/**
 * 实盘交易管理器
 */
class LiveTradingManager {
  private agents: Map<string, AIAgent>;
  private scheduler: Scheduler;
  private isRunning: boolean;

  constructor(config: {
    agents: AIAgent[];
    stockPool: string[];
    thinkInterval: number;
  });

  /**
   * 启动实盘交易
   */
  async start(): Promise<void>;

  /**
   * 停止实盘交易
   */
  async stop(): Promise<void>;

  /**
   * 暂停指定 AI
   */
  pauseAgent(agentId: string): void;

  /**
   * 恢复指定 AI
   */
  resumeAgent(agentId: string): void;

  /**
   * 获取所有 AI 状态
   */
  getAgentsStatus(): Map<string, {
    isRunning: boolean;
    lastThinkTime?: Date;
    account: Account;
  }>;

  /**
   * 获取 AI 消息流 (用于聊天窗口)
   */
  getMessageStream(): ReadableStream<AIMessage>;

  /**
   * 订阅状态更新
   */
  onUpdate(callback: () => void): () => void;
}
```

### 2.8 回放服务 (`lib/replay/player.ts`)

```typescript
/**
 * K 线回放器
 */
class ReplayPlayer {
  private events: ReplayEvent[];
  private state: ReplayState;

  constructor(events: ReplayEvent[]);

  /**
   * 播放
   */
  play(): void;

  /**
   * 暂停
   */
  pause(): void;

  /**
   * 跳转到指定时间
   */
  seekTo(time: Date): void;

  /**
   * 设置播放速度
   */
  setSpeed(speed: number): void;

  /**
   * 获取当前状态
   */
  getState(): ReplayState;

  /**
   * 获取指定时间点的市场数据
   */
  getDataAt(time: Date): {
    quotes: Map<string, RealtimeQuote>;
    trades: Trade[];
    decisions: AIDecision[];
  };

  /**
   * 订阅状态变化
   */
  onStateChange(callback: (state: ReplayState) => void): () => void;
}

/**
 * 构建回放数据
 */
async function buildReplayData(
  stockCodes: string[],
  agentIds: string[],
  startDate: string,
  endDate: string
): Promise<ReplayEvent[]>;
```

---

## 3. API 路由接口

### 3.1 认证 API (`/api/auth/*`)

```typescript
// POST /api/auth/login
// Request: { username: string; password: string }
// Response: { success: boolean; user?: User }

// POST /api/auth/logout
// Response: { success: boolean }

// GET /api/auth/session
// Response: { user?: User }
```

### 3.2 股票数据 API (`/api/stock/*`)

```typescript
// GET /api/stock/quote?codes=sh600519,sz000001
// Response: { [code: string]: RealtimeQuote }

// GET /api/stock/kline?code=sh600519&start=2025-01-01&end=2025-01-31
// Response: StockData[]

// GET /api/stock/intraday?code=sh600519&date=2025-01-15
// Response: IntradayPoint[]

// GET /api/stock/search?q=茅台
// Response: { code: string; name: string; market: string }[]
```

### 3.3 交易 API (`/api/trading/*`)

```typescript
// POST /api/trading/execute
// Request: { agentId: string; decision: AIDecision }
// Response: { trade?: Trade; error?: string }

// GET /api/trading/account?agentId=deepseek
// Response: Account

// GET /api/trading/positions?agentId=deepseek
// Response: Position[]

// GET /api/trading/trades?agentId=deepseek&limit=50
// Response: Trade[]
```

### 3.4 实盘交易 API (`/api/live/*`)

```typescript
// POST /api/live/start
// Request: { agentIds: string[]; stockPool: string[]; interval: number }
// Response: { success: boolean }

// POST /api/live/stop
// Response: { success: boolean }

// POST /api/live/pause-agent
// Request: { agentId: string }
// Response: { success: boolean }

// POST /api/live/resume-agent
// Request: { agentId: string }
// Response: { success: boolean }

// GET /api/live/status
// Response: { [agentId: string]: { isRunning: boolean; account: Account } }

// GET /api/live/messages
// Response: AIMessage[] (SSE or polling)
```

### 3.5 回放 API (`/api/replay/*`)

```typescript
// POST /api/replay/build
// Request: { stockCodes: string[]; agentIds: string[]; startDate: string; endDate: string }
// Response: { eventId: string }

// GET /api/replay/events?eventId=xxx
// Response: ReplayEvent[]

// POST /api/replay/play
// Request: { eventId: string }
// Response: { success: boolean }

// POST /api/replay/seek
// Request: { eventId: string; time: string }
// Response: { state: ReplayState }

// GET /api/replay/data?eventId=xxx&time=xxx
// Response: { quotes: RealtimeQuote[]; trades: Trade[]; decisions: AIDecision[] }
```

### 3.6 排行榜 API (`/api/leaderboard`)

```typescript
// GET /api/leaderboard?type=profit|daily|winrate|drawdown
// Response: Array<{
//   rank: number;
//   agentId: string;
//   agentName: string;
//   value: number;
// }>
```

---

## 4. React Hooks

### 4.1 AI 聊天 Hook

```typescript
/**
 * AI 思考聊天 Hook
 */
function useAIChat(agentIds: string[]) {
  return {
    messages: AIMessage[];      // 消息列表
    isConnected: boolean;       // 是否连接
    sendMessage: (msg: string) => void;
    pauseAgent: (id: string) => void;
    resumeAgent: (id: string) => void;
    clearMessages: () => void;
  };
}
```

### 4.2 回放 Hook

```typescript
/**
 * K 线回放 Hook
 */
function useReplay(eventId: string) {
  return {
    state: ReplayState;
    data: {
      quotes: Map<string, RealtimeQuote>;
      trades: Trade[];
      decisions: AIDecision[];
    };
    play: () => void;
    pause: () => void;
    seekTo: (time: Date) => void;
    setSpeed: (speed: number) => void;
  };
}
```

### 4.3 实时账户 Hook

```typescript
/**
 * 实时账户数据 Hook
 */
function useRealtimeAccount(agentId: string, options?: {
  refreshInterval?: number;
}) {
  return {
    account: Account | undefined;
    isLoading: boolean;
    error: string | undefined;
    refresh: () => Promise<void>;
  };
}
```

### 4.4 股票池 Hook

```typescript
/**
 * 股票池管理 Hook
 */
function useStockPool() {
  return {
    stocks: string[];
    addStock: (code: string) => Promise<void>;
    removeStock: (code: string) => Promise<void>;
    search: (query: string) => Promise<Array<{ code: string; name: string }>>;
    isLoading: boolean;
  };
}
```

---

## 5. 数据库操作接口

### 5.1 交易记录

```typescript
// 保存交易记录
async function saveTrade(trade: Omit<Trade, 'id'>): Promise<string>;

// 查询交易记录
async function getTrades(params: {
  agentId?: string;
  stock?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<Trade[]>;
```

### 5.2 账户快照

```typescript
// 保存账户快照
async function saveSnapshot(account: Account, date: string): Promise<void>;

// 获取账户快照
async function getSnapshots(params: {
  agentId: string;
  startDate?: string;
  endDate?: string;
}): Promise<AccountSnapshot[]>;
```

### 5.3 AI 决策记录

```typescript
// 保存 AI 决策
async function saveAIDecision(
  decision: AIDecision,
  input: DecisionInput,
  result: { executed: boolean; error?: string }
): Promise<void>;

// 查询 AI 决策
async function getAIDecisions(params: {
  agentId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<AIDecisionRecord[]>;
```

---

## 6. 常量定义

```typescript
// lib/constants.ts

/**
 * 内置 AI 模型
 */
export const BUILTIN_AI_MODELS: readonly AIModel[] = [
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    provider: 'openrouter',
    modelId: 'deepseek/deepseek-chat',
    enabled: true,
  },
  {
    id: 'gemini-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'openrouter',
    modelId: 'google/gemini-2.0-flash-exp',
    enabled: true,
  },
] as const;

/**
 * 交易时间段
 */
export const TRADING_HOURS = {
  morning: { start: '09:30', end: '11:30' },
  afternoon: { start: '13:00', end: '15:00' },
} as const;

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
  initialCapital: 100000,
  maxPositionRatio: 0.5,
  thinkInterval: 10,
  minThinkInterval: 1,
  maxThinkInterval: 60,
} as const;
```
