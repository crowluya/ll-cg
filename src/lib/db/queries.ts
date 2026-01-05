import { db, closeConnection } from './index';
import { trades, positions, aiDecisions, accountSnapshots, liveTradingStatus } from '@/db/schema';
import { and, eq, desc, gte, lte, sql } from 'drizzle-orm';
import type { Trade, Position, AIDecisionRecord, AccountSnapshot } from '@/types';

// ==================== 保存操作 ====================

// 保存交易记录
export async function saveTrade(trade: Omit<Trade, 'id'>): Promise<string> {
  const id = `${trade.model}-${trade.stock}-${Date.now()}`;
  await db.insert(trades).values({
    id,
    model: trade.model,
    stock: trade.stock,
    type: trade.type,
    price: trade.price.toString(),
    quantity: trade.quantity.toString(),
    date: trade.date,
    timestamp: trade.timestamp,
  });
  return id;
}

// 保存持仓快照
export async function savePositionSnapshot(
  model: string,
  position: Position,
  snapshotDate: string
): Promise<string> {
  const id = `${model}-${position.stock}-${snapshotDate}-${Date.now()}`;
  await db.insert(positions).values({
    id,
    model,
    stock: position.stock,
    quantity: position.quantity.toString(),
    buyDate: position.buyDate,
    avgPrice: position.avgPrice.toString(),
    snapshotDate,
  });
  return id;
}

// 批量保存持仓快照
export async function savePositionSnapshots(
  model: string,
  positionsList: Position[],
  snapshotDate: string
): Promise<void> {
  if (positionsList.length === 0) return;

  const values = positionsList.map((position) => ({
    id: `${model}-${position.stock}-${snapshotDate}-${Date.now()}-${Math.random()}`,
    model,
    stock: position.stock,
    quantity: position.quantity.toString(),
    buyDate: position.buyDate,
    avgPrice: position.avgPrice.toString(),
    snapshotDate,
  }));

  await db.insert(positions).values(values);
}

// 保存 AI 决策记录
export async function saveAIDecision(record: AIDecisionRecord): Promise<string> {
  const id = `${record.model}-${record.stock}-${record.decisionTime.getTime()}`;
  await db.insert(aiDecisions).values({
    id,
    model: record.model,
    stock: record.stock,
    decisionTime: record.decisionTime,
    inputData: record.inputData as any,
    outputDecision: record.outputDecision as any,
    executionResult: record.executionResult as any,
  });
  return id;
}

// 保存账户快照
export async function saveAccountSnapshot(snapshot: AccountSnapshot): Promise<string> {
  const id = `${snapshot.model}-${snapshot.date}-${Date.now()}`;
  await db.insert(accountSnapshots).values({
    id,
    model: snapshot.model,
    date: snapshot.date,
    cash: snapshot.cash.toString(),
    totalValue: snapshot.totalValue.toString(),
    profit: snapshot.profit.toString(),
    profitRate: snapshot.profitRate.toString(),
    positionsData: snapshot.positionsData as any,
  });
  return id;
}

// 更新实盘交易状态
export async function upsertLiveTradingStatus(
  model: string,
  stock: string,
  isActive: boolean,
  lastDecisionTime?: Date
): Promise<void> {
  await db
    .insert(liveTradingStatus)
    .values({
      id: `${model}-${stock}`,
      model,
      stock,
      isActive,
      lastDecisionTime,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: liveTradingStatus.model,
      set: {
        stock,
        isActive,
        lastDecisionTime,
        updatedAt: new Date(),
      },
    });
}

// ==================== 查询操作 ====================

// 查询历史持仓
export async function getHistoryPositions(filters: {
  model?: string;
  stock?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Position[]> {
  const conditions = [];

  if (filters.model) {
    conditions.push(eq(positions.model, filters.model));
  }
  if (filters.stock) {
    conditions.push(eq(positions.stock, filters.stock));
  }
  if (filters.startDate) {
    conditions.push(gte(positions.snapshotDate, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(positions.snapshotDate, filters.endDate));
  }

  const results = conditions.length > 0
    ? await db.select().from(positions).where(and(...conditions)).orderBy(desc(positions.snapshotDate))
    : await db.select().from(positions).orderBy(desc(positions.snapshotDate));

  return results.map((r) => ({
    stock: r.stock,
    quantity: Number(r.quantity),
    buyDate: r.buyDate,
    avgPrice: Number(r.avgPrice),
  }));
}

// 查询 AI 操作记录
export async function getAIDecisions(filters: {
  model?: string;
  stock?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AIDecisionRecord[]> {
  const conditions = [];

  if (filters.model) {
    conditions.push(eq(aiDecisions.model, filters.model));
  }
  if (filters.stock) {
    conditions.push(eq(aiDecisions.stock, filters.stock));
  }
  if (filters.startDate) {
    conditions.push(gte(aiDecisions.decisionTime, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(aiDecisions.decisionTime, filters.endDate));
  }

  const results = conditions.length > 0
    ? await db
        .select()
        .from(aiDecisions)
        .where(and(...conditions))
        .orderBy(desc(aiDecisions.decisionTime))
        .limit(filters.limit || 100)
    : await db
        .select()
        .from(aiDecisions)
        .orderBy(desc(aiDecisions.decisionTime))
        .limit(filters.limit || 100);

  return results.map((r) => ({
    id: r.id,
    model: r.model,
    stock: r.stock,
    decisionTime: r.decisionTime,
    inputData: r.inputData as any,
    outputDecision: r.outputDecision as any,
    executionResult: r.executionResult as any,
    createdAt: r.createdAt,
  }));
}

// 查询交易记录
export async function getTrades(filters: {
  model?: string;
  stock?: string;
  type?: 'buy' | 'sell';
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<Trade[]> {
  const conditions = [];

  if (filters.model) {
    conditions.push(eq(trades.model, filters.model));
  }
  if (filters.stock) {
    conditions.push(eq(trades.stock, filters.stock));
  }
  if (filters.type) {
    conditions.push(eq(trades.type, filters.type));
  }
  if (filters.startDate) {
    conditions.push(gte(trades.date, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(trades.date, filters.endDate));
  }

  const results = conditions.length > 0
    ? await db
        .select()
        .from(trades)
        .where(and(...conditions))
        .orderBy(desc(trades.timestamp))
        .limit(filters.limit || 100)
    : await db
        .select()
        .from(trades)
        .orderBy(desc(trades.timestamp))
        .limit(filters.limit || 100);

  return results.map((r) => ({
    id: r.id,
    model: r.model,
    stock: r.stock,
    type: r.type,
    price: Number(r.price),
    quantity: Number(r.quantity),
    date: r.date,
    timestamp: r.timestamp,
    createdAt: r.createdAt,
  }));
}

// 查询账户快照
export async function getAccountSnapshots(filters: {
  model?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<AccountSnapshot[]> {
  const conditions = [];

  if (filters.model) {
    conditions.push(eq(accountSnapshots.model, filters.model));
  }
  if (filters.startDate) {
    conditions.push(gte(accountSnapshots.date, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(accountSnapshots.date, filters.endDate));
  }

  const results = conditions.length > 0
    ? await db
        .select()
        .from(accountSnapshots)
        .where(and(...conditions))
        .orderBy(desc(accountSnapshots.date))
        .limit(filters.limit || 100)
    : await db
        .select()
        .from(accountSnapshots)
        .orderBy(desc(accountSnapshots.date))
        .limit(filters.limit || 100);

  return results.map((r) => ({
    id: r.id,
    model: r.model,
    date: r.date,
    cash: Number(r.cash),
    totalValue: Number(r.totalValue),
    profit: Number(r.profit),
    profitRate: Number(r.profitRate),
    positionsData: r.positionsData as any,
    createdAt: r.createdAt,
  }));
}

// 获取实盘交易状态
export async function getLiveTradingStatus(model?: string): Promise<{
  model: string;
  stock: string;
  isActive: boolean;
  lastDecisionTime?: Date;
}[]> {
  const results = model
    ? await db.select().from(liveTradingStatus).where(eq(liveTradingStatus.model, model))
    : await db.select().from(liveTradingStatus);

  return results.map((r) => ({
    model: r.model,
    stock: r.stock,
    isActive: r.isActive,
    lastDecisionTime: r.lastDecisionTime || undefined,
  }));
}

// 获取最新账户快照
export async function getLatestAccountSnapshot(model: string): Promise<AccountSnapshot | null> {
  const results = await db
    .select()
    .from(accountSnapshots)
    .where(eq(accountSnapshots.model, model))
    .orderBy(desc(accountSnapshots.date))
    .limit(1);

  if (results.length === 0) return null;

  const r = results[0];
  return {
    id: r.id,
    model: r.model,
    date: r.date,
    cash: Number(r.cash),
    totalValue: Number(r.totalValue),
    profit: Number(r.profit),
    profitRate: Number(r.profitRate),
    positionsData: r.positionsData as any,
    createdAt: r.createdAt,
  };
}

// 计算模型交易统计
export async function getModelTradeStats(model: string) {
  const result = await db
    .select({
      totalTrades: sql<number>`count(*)`,
      buyTrades: sql<number>`count(*) filter (where type = 'buy')`,
      sellTrades: sql<number>`count(*) filter (where type = 'sell')`,
    })
    .from(trades)
    .where(eq(trades.model, model));

  return result[0] || { totalTrades: 0, buyTrades: 0, sellTrades: 0 };
}
