/**
 * 实盘交易启动API
 * Phase 6.6: 实盘控制API实现
 * 
 * POST /api/live/start
 * 启动实盘交易系统
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLiveManager } from '@/lib/live/manager';

export async function POST(request: NextRequest) {
  try {
    const manager = getLiveManager();
    
    // 启动实盘交易
    await manager.start();
    
    // 获取启动后的状态
    const status = await manager.getStatus();
    
    return NextResponse.json({
      success: true,
      message: '实盘交易已启动',
      status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '启动失败';
    
    // 如果是"已在运行中"错误，返回400
    if (message.includes('已在运行中')) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }
    
    // 其他错误返回500
    console.error('[API] 启动实盘交易失败:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
