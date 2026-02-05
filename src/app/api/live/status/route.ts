/**
 * 实盘交易状态查询API
 * Phase 6.6: 实盘控制API实现
 * 
 * GET /api/live/status
 * 获取实盘交易系统当前状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLiveManager } from '@/lib/live/manager';

export async function GET(request: NextRequest) {
  try {
    const manager = getLiveManager();
    
    // 获取实盘状态
    const status = await manager.getStatus();
    
    // 将Map转换为对象以便JSON序列化
    const agentsStatusArray = Array.from(status.agentsStatus.entries()).map(
      ([id, agentStatus]) => ({
        id,
        ...agentStatus,
      })
    );
    
    return NextResponse.json({
      isRunning: status.isRunning,
      startTime: status.startTime,
      agents: agentsStatusArray,
      totalDecisions: status.totalDecisions,
      totalTrades: status.totalTrades,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询失败';
    
    console.error('[API] 查询实盘状态失败:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
