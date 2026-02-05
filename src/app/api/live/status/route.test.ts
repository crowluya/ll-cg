/**
 * 实盘交易状态查询API测试
 * Phase 6.6: 实盘控制API测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock LiveTradingManager
vi.mock('@/lib/live/manager', () => ({
  LiveTradingManager: vi.fn(),
  getLiveManager: vi.fn(),
}));

describe('GET /api/live/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('成功获取实盘状态', async () => {
    const { getLiveManager } = await import('@/lib/live/manager');
    const mockStatus = {
      isRunning: true,
      startTime: new Date(),
      agentsStatus: new Map([
        ['deepseek-v3', {
          agentId: 'deepseek-v3',
          isRunning: true,
          isPaused: false,
          account: {
            agentId: 'deepseek-v3',
            initialCapital: 100000,
            cash: 50000,
            positions: [],
            totalValue: 50000,
            marketValue: 0,
            profit: -50000,
            profitRate: -0.5,
          },
        }],
      ]),
      totalDecisions: 10,
      totalTrades: 5,
    };
    
    const mockManager = {
      getStatus: vi.fn().mockResolvedValue(mockStatus),
    };
    vi.mocked(getLiveManager).mockReturnValue(mockManager as any);

    const request = new NextRequest('http://localhost:3000/api/live/status', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isRunning).toBe(true);
    expect(data.totalDecisions).toBe(10);
    expect(data.totalTrades).toBe(5);
    expect(mockManager.getStatus).toHaveBeenCalledOnce();
  });

  it('查询失败返回500错误', async () => {
    const { getLiveManager } = await import('@/lib/live/manager');
    const mockManager = {
      getStatus: vi.fn().mockRejectedValue(new Error('查询失败')),
    };
    vi.mocked(getLiveManager).mockReturnValue(mockManager as any);

    const request = new NextRequest('http://localhost:3000/api/live/status', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
