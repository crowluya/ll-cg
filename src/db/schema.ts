import {
  pgTable,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';

// 交易类型枚举
export const tradeTypeEnum = pgEnum('trade_type', ['buy', 'sell']);

// 用户角色枚举
export const userRoleEnum = pgEnum('user_role', ['admin', 'trader']);

// 用户表
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // bcrypt 哈希
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default('trader'),
  stockPool: jsonb('stock_pool').$type<string[]>(), // 股票池配置（股票代码列表）
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 交易记录表
export const trades = pgTable('trades', {
  id: text('id').primaryKey(),
  model: text('model').notNull(),
  stock: text('stock').notNull(),
  stockName: text('stock_name').notNull(), // 股票名称
  type: tradeTypeEnum('type').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 0 }).notNull(),
  date: text('date').notNull(), // 交易日期 YYYY-MM-DD
  timestamp: text('timestamp').notNull(), // 交易时间戳
  reason: text('reason'), // AI 决策理由
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 历史持仓快照表
export const positions = pgTable('positions', {
  id: text('id').primaryKey(),
  model: text('model').notNull(),
  stock: text('stock').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 0 }).notNull(),
  buyDate: text('buy_date').notNull(), // 买入日期
  avgPrice: numeric('avg_price', { precision: 10, scale: 2 }).notNull(), // 平均成本
  snapshotDate: text('snapshot_date').notNull(), // 快照日期
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// AI决策记录表
export const aiDecisions = pgTable('ai_decisions', {
  id: text('id').primaryKey(),
  model: text('model').notNull(),
  stock: text('stock').notNull(),
  decisionTime: timestamp('decision_time').notNull(),
  inputData: jsonb('input_data').notNull(), // { historyData, currentPosition, availableCapital, currentDate }
  outputDecision: jsonb('output_decision').notNull(), // { action, stock, quantity, reason }
  executionResult: jsonb('execution_result').notNull(), // { executed, tradeId, error }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 账户快照表
export const accountSnapshots = pgTable('account_snapshots', {
  id: text('id').primaryKey(),
  model: text('model').notNull(),
  date: text('date').notNull(), // 快照日期
  cash: numeric('cash', { precision: 12, scale: 2 }).notNull(),
  totalValue: numeric('total_value', { precision: 12, scale: 2 }).notNull(),
  profit: numeric('profit', { precision: 12, scale: 2 }).notNull(),
  profitRate: numeric('profit_rate', { precision: 10, scale: 4 }).notNull(),
  positionsData: jsonb('positions_data').notNull(), // Position[]
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 实盘交易状态表
export const liveTradingStatus = pgTable('live_trading_status', {
  id: text('id').primaryKey(),
  model: text('model').notNull().unique(),
  stock: text('stock').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastDecisionTime: timestamp('last_decision_time'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 组合曲线（秒级/N秒级）点位表
export const portfolioSeriesPoints = pgTable('portfolio_series_points', {
  id: text('id').primaryKey(),
  portfolioId: text('portfolio_id').notNull(),
  tradeDate: text('trade_date').notNull(), // YYYY-MM-DD
  intervalSec: integer('interval_sec').notNull().default(1),
  ts: timestamp('ts').notNull(),
  totalValue: numeric('total_value', { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 个股分时点位（N分钟）
export const stockIntradayPoints = pgTable('stock_intraday_points', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  tradeDate: text('trade_date').notNull(), // YYYY-MM-DD
  scaleMinutes: integer('scale_minutes').notNull().default(5),
  ts: timestamp('ts').notNull(),
  close: numeric('close', { precision: 10, scale: 2 }).notNull(),
  volume: numeric('volume', { precision: 14, scale: 0 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 事件表（回放核心：买卖/入金/出金/费用等）
export const portfolioEvents = pgTable('portfolio_events', {
  id: text('id').primaryKey(),
  portfolioId: text('portfolio_id').notNull(),
  ts: timestamp('ts').notNull(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
