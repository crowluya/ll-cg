/**
 * 实盘交易启动API测试
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

describe('POST /api/live/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('成功启动实盘交易', async () => {
    const { getLiveManager } = await import('@/lib/live/manager');
    const mockManager = {
      start: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockResolvedValue({
        isRunning: true,
        startTime: new Date(),
        agentsStatus: new Map(),
        totalDecisions: 0,
        totalTrades: 0,
      }),
    };
    vi.mocked(getLiveManager).mockReturnValue(mockManager as any);

    const request = new NextRequest('http://localhost:3000/api/live/start', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.status.isRunning).toBe(true);
    expect(mockManager.start).toHaveBeenCalledOnce();
  });

  it('已启动时返回错误', async () => {
    const { getLiveManager } = await import('@/lib/live/manager');
    const mockManager = {
      start: vi.fn().mockRejectedValue(new Error('实盘交易已在运行中')),
    };
    vi.mocked(getLiveManager).mockReturnValue(mockManager as any);

    const request = new NextRequest('http://localhost:3000/api/live/start', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('实盘交易已在运行中');
  });

  it('启动失败返回500错误', async () => {
    const { getLiveManager } = await import('@/lib/live/manager');
    const mockManager = {
      start: vi.fn().mockRejectedValue(new Error('启动失败')),
    };
    vi.mocked(getLiveManager).mockReturnValue(mockManager as any);

    const request = new NextRequest('http://localhost:3000/api/live/start', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
