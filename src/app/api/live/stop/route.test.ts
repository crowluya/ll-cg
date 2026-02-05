/**
 * 实盘交易停止API测试
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

describe('POST /api/live/stop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('成功停止实盘交易', async () => {
    const { getLiveManager } = await import('@/lib/live/manager');
    const mockManager = {
      stop: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockResolvedValue({
        isRunning: false,
        startTime: undefined,
        agentsStatus: new Map(),
        totalDecisions: 10,
        totalTrades: 5,
      }),
    };
    vi.mocked(getLiveManager).mockReturnValue(mockManager as any);

    const request = new NextRequest('http://localhost:3000/api/live/stop', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.status.isRunning).toBe(false);
    expect(mockManager.stop).toHaveBeenCalledOnce();
  });

  it('停止失败返回500错误', async () => {
    const { getLiveManager } = await import('@/lib/live/manager');
    const mockManager = {
      stop: vi.fn().mockRejectedValue(new Error('停止失败')),
    };
    vi.mocked(getLiveManager).mockReturnValue(mockManager as any);

    const request = new NextRequest('http://localhost:3000/api/live/stop', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
