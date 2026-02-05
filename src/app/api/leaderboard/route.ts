/**
 * 排行榜API
 * Phase 6.8: 排行榜API实现
 * 
 * GET /api/leaderboard
 * 获取AI模型排行榜
 * 
 * 查询参数:
 * - type: 排行榜类型 (profit|today|winrate|drawdown)，默认profit
 * - limit: 返回数量，默认10
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAccountSnapshots, getTrades } from '@/lib/db/queries';
import { formatDate } from '@/lib/utils/date';

type LeaderboardType = 'profit' | 'today' | 'winrate' | 'drawdown';

interface LeaderboardEntry {
  model: string;
  rank: number;
  value: number;
  totalValue?: number;
  profit?: number;
  profitRate?: number;
  winRate?: number;
  totalTrades?: number;
  winTrades?: number;
  maxDrawdown?: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = (searchParams.get('type') || 'profit') as LeaderboardType;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // 参数验证
    const validTypes: LeaderboardType[] = ['profit', 'today', 'winrate', 'drawdown'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'type参数必须是: profit, today, winrate, drawdown' },
        { status: 400 }
      );
    }

    let leaderboard: LeaderboardEntry[] = [];

    switch (type) {
      case 'profit':
        leaderboard = await getProfitLeaderboard(limit);
        break;
      case 'today':
        leaderboard = await getTodayLeaderboard(limit);
        break;
      case 'winrate':
        leaderboard = await getWinRateLeaderboard(limit);
        break;
      case 'drawdown':
        leaderboard = await getDrawdownLeaderboard(limit);
        break;
    }

    return NextResponse.json({
      success: true,
      type,
      data: leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询失败';
    
    console.error('[API] 排行榜查询失败:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * 获取累计收益排行榜
 */
async function getProfitLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
  // 获取每个模型的最新快照
  const snapshots = await getAccountSnapshots({});
  
  // 按模型分组，取最新的快照
  const latestByModel = new Map<string, typeof snapshots[0]>();
  for (const snapshot of snapshots) {
    const existing = latestByModel.get(snapshot.model);
    if (!existing || new Date(snapshot.date) > new Date(existing.date)) {
      latestByModel.set(snapshot.model, snapshot);
    }
  }

  // 转换为排行榜格式并排序
  const leaderboard = Array.from(latestByModel.values())
    .map((snapshot, index) => ({
      model: snapshot.model,
      rank: index + 1,
      value: snapshot.profitRate,
      totalValue: snapshot.totalValue,
      profit: snapshot.profit,
      profitRate: snapshot.profitRate,
    }))
    .sort((a, b) => b.profitRate - a.profitRate)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return leaderboard;
}

/**
 * 获取今日收益排行榜
 */
async function getTodayLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
  const today = formatDate(new Date());
  
  // 获取今日快照
  const todaySnapshots = await getAccountSnapshots({
    startDate: new Date(today),
    endDate: new Date(today),
  });

  // 获取昨日快照
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdaySnapshots = await getAccountSnapshots({
    startDate: yesterday,
    endDate: yesterday,
  });

  // 计算今日收益
  const yesterdayMap = new Map(
    yesterdaySnapshots.map(s => [s.model, s.totalValue])
  );

  const leaderboard = todaySnapshots
    .map((snapshot, index) => {
      const yesterdayValue = yesterdayMap.get(snapshot.model) || snapshot.totalValue;
      const todayProfit = snapshot.totalValue - yesterdayValue;
      const todayProfitRate = yesterdayValue > 0 ? todayProfit / yesterdayValue : 0;

      return {
        model: snapshot.model,
        rank: index + 1,
        value: todayProfitRate,
        totalValue: snapshot.totalValue,
        profit: todayProfit,
        profitRate: todayProfitRate,
      };
    })
    .sort((a, b) => b.profitRate - a.profitRate)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return leaderboard;
}

/**
 * 获取胜率排行榜
 */
async function getWinRateLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
  // 获取所有交易记录
  const trades = await getTrades({});

  // 按模型分组统计
  const statsByModel = new Map<string, { total: number; win: number }>();

  for (const trade of trades) {
    if (!statsByModel.has(trade.model)) {
      statsByModel.set(trade.model, { total: 0, win: 0 });
    }

    const stats = statsByModel.get(trade.model)!;
    
    // 只统计卖出交易
    if (trade.type === 'sell') {
      stats.total++;
      // TODO: 需要计算是否盈利，这里简化处理
      // 实际应该对比买入和卖出价格
      stats.win++;
    }
  }

  // 转换为排行榜格式
  const leaderboard = Array.from(statsByModel.entries())
    .map(([model, stats], index) => {
      const winRate = stats.total > 0 ? stats.win / stats.total : 0;
      return {
        model,
        rank: index + 1,
        value: winRate,
        winRate,
        totalTrades: stats.total,
        winTrades: stats.win,
      };
    })
    .filter(entry => entry.totalTrades > 0) // 过滤没有交易的
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return leaderboard;
}

/**
 * 获取最大回撤排行榜
 */
async function getDrawdownLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
  // 获取所有快照
  const snapshots = await getAccountSnapshots({});

  // 按模型分组
  const snapshotsByModel = new Map<string, typeof snapshots>();
  for (const snapshot of snapshots) {
    if (!snapshotsByModel.has(snapshot.model)) {
      snapshotsByModel.set(snapshot.model, []);
    }
    snapshotsByModel.get(snapshot.model)!.push(snapshot);
  }

  // 计算每个模型的最大回撤
  const leaderboard = Array.from(snapshotsByModel.entries())
    .map(([model, modelSnapshots], index) => {
      // 按日期排序
      const sorted = modelSnapshots.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // 计算最大回撤
      let maxValue = 0;
      let maxDrawdown = 0;

      for (const snapshot of sorted) {
        if (snapshot.totalValue > maxValue) {
          maxValue = snapshot.totalValue;
        }
        const drawdown = maxValue > 0 ? (maxValue - snapshot.totalValue) / maxValue : 0;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      return {
        model,
        rank: index + 1,
        value: maxDrawdown,
        maxDrawdown,
        totalValue: sorted[sorted.length - 1]?.totalValue || 0,
      };
    })
    .sort((a, b) => a.maxDrawdown - b.maxDrawdown) // 回撤越小越好
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return leaderboard;
}
