/**
 * AI代理控制API测试
 * Phase 6.6: 实盘控制API测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock LiveTradingManager
vi.mock('@/lib/live/manager', () => ({
  LiveTradingManager: vi.fn(),
  getLiveManager: vi.fn(),
}));

describe('POST /api/live/agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('成功暂停AI代理', async () => {
    const { getLiveManager } = await import('@/lib/live/manager');
    const mockManager = {
      pauseAgent: vi.fn(),
      getAgentStatus: vi.fn().mockResolvedValue({
        agentId: 'deepseek-v3',
        isRunning: true,
        isPaused: true,
        account: {
          agentId: 'deepseek-v3',
          initialCapital: 100000,
          cash: 100000,
          positions: [],
          totalValue: 100000,
          marketValue: 0,
          profit: 0,
          profitRate: 0,
        },
      }),
    };
    vi.mocked(getLiveManager).mockReturnValue(mockManager as any);

    const request = new NextRequest('http://localhost:3000/api/live/agent', {
      method: 'POST',
      body: JSON.stringify({
        action: 'pause',
        agentId: 'deepseek-v3',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.status.isPaused).toBe(true);
    expect(mockManager.pauseAgent).toHaveBeenCalledWith('deepseek-v3');
  });

  it('成功恢复AI代理', async () => {
    const { getLiveManager } = await import('@/lib/live/manager');
    const mockManager = {
      resumeAgent: vi.fn(),
      getAgentStatus: vi.fn().mockResolvedValue({
        agentId: 'deepseek-v3',
        isRunning: true,
        isPaused: false,
        account: {
          agentId: 'deepseek-v3',
          initialCapital: 100000,
          cash: 100000,
          positions: [],
          totalValue: 100000,
          marketValue: 0,
          profit: 0,
          profitRate: 0,
        },
      }),
    };
    vi.mocked(getLiveManager).mockReturnValue(mockManager as any);

    const request = new NextRequest('http://localhost:3000/api/live/agent', {
      method: 'POST',
      body: JSON.stringify({
        action: 'resume',
        agentId: 'deepseek-v3',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.status.isPaused).toBe(false);
    expect(mockManager.resumeAgent).toHaveBeenCalledWith('deepseek-v3');
  });

  it('缺少action参数返回400错误', async () => {
    const request = new NextRequest('http://localhost:3000/api/live/agent', {
      method: 'POST',
      body: JSON.stringify({
        agentId: 'deepseek-v3',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('action');
  });

  it('缺少agentId参数返回400错误', async () => {
    const request = new NextRequest('http://localhost:3000/api/live/agent', {
      method: 'POST',
      body: JSON.stringify({
        action: 'pause',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('agentId');
  });

  it('无效的action返回400错误', async () => {
    const request = new NextRequest('http://localhost:3000/api/live/agent', {
      method: 'POST',
      body: JSON.stringify({
        action: 'invalid',
        agentId: 'deepseek-v3',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('action');
  });

  it('操作失败返回500错误', async () => {
    const { getLiveManager } = await import('@/lib/live/manager');
    const mockManager = {
      pauseAgent: vi.fn(() => {
        throw new Error('AI代理不存在');
      }),
    };
    vi.mocked(getLiveManager).mockReturnValue(mockManager as any);

    const request = new NextRequest('http://localhost:3000/api/live/agent', {
      method: 'POST',
      body: JSON.stringify({
        action: 'pause',
        agentId: 'non-existent',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
