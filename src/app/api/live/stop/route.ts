/**
 * 实盘交易停止API
 * Phase 6.6: 实盘控制API实现
 * 
 * POST /api/live/stop
 * 停止实盘交易系统
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLiveManager } from '@/lib/live/manager';

export async function POST(request: NextRequest) {
  try {
    const manager = getLiveManager();
    
    // 停止实盘交易
    await manager.stop();
    
    // 获取停止后的状态
    const status = await manager.getStatus();
    
    return NextResponse.json({
      success: true,
      message: '实盘交易已停止',
      status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '停止失败';
    
    console.error('[API] 停止实盘交易失败:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
