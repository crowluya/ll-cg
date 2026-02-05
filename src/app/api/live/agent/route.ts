/**
 * AI代理控制API
 * Phase 6.6: 实盘控制API实现
 * 
 * POST /api/live/agent
 * 控制单个AI代理（暂停/恢复）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLiveManager } from '@/lib/live/manager';

interface AgentControlRequest {
  action: 'pause' | 'resume';
  agentId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AgentControlRequest = await request.json();
    
    // 参数验证
    if (!body.action) {
      return NextResponse.json(
        { error: '缺少action参数' },
        { status: 400 }
      );
    }
    
    if (!body.agentId) {
      return NextResponse.json(
        { error: '缺少agentId参数' },
        { status: 400 }
      );
    }
    
    if (body.action !== 'pause' && body.action !== 'resume') {
      return NextResponse.json(
        { error: 'action必须是pause或resume' },
        { status: 400 }
      );
    }
    
    const manager = getLiveManager();
    
    // 执行操作
    if (body.action === 'pause') {
      manager.pauseAgent(body.agentId);
    } else {
      manager.resumeAgent(body.agentId);
    }
    
    // 获取更新后的状态
    const status = await manager.getAgentStatus(body.agentId);
    
    return NextResponse.json({
      success: true,
      message: `AI代理已${body.action === 'pause' ? '暂停' : '恢复'}`,
      status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '操作失败';
    
    console.error('[API] AI代理控制失败:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
