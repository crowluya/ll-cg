/**
 * 排行榜API测试
 * Phase 6.8: 排行榜API测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getAccountSnapshots: vi.fn(),
  getTrades: vi.fn(),
}));

describe('GET /api/leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('成功获取收益排行榜', async () => {
    const { getAccountSnapshots } = await import('@/lib/db/queries');
    vi.mocked(getAccountSnapshots).mockResolvedValue([
      {
        id: '1',
        model: 'deepseek-v3',
        date: '2025-02-05',
        cash: 50000,
        totalValue: 150000,
        profit: 50000,
        profitRate: 0.5,
        positionsData: [],
      },
      {
        id: '2',
        model: 'gemini-2.0',
        date: '2025-02-05',
        cash: 80000,
        totalValue: 120000,
        profit: 20000,
        profitRate: 0.2,
        positionsData: [],
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/leaderboard?type=profit', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.data[0].model).toBe('deepseek-v3');
    expect(data.data[0].profitRate).toBe(0.5);
  });

  it('成功获取今日收益排行榜', async () => {
    const { getAccountSnapshots } = await import('@/lib/db/queries');
    vi.mocked(getAccountSnapshots).mockResolvedValue([
      {
        id: '1',
        model: 'deepseek-v3',
        date: '2025-02-05',
        cash: 50000,
        totalValue: 150000,
        profit: 50000,
        profitRate: 0.5,
        positionsData: [],
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/leaderboard?type=today', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.type).toBe('today');
  });

  it('成功获取胜率排行榜', async () => {
    const { getTrades } = await import('@/lib/db/queries');
    vi.mocked(getTrades).mockResolvedValue([
      {
        id: '1',
        model: 'deepseek-v3',
        stock: 'sh600519',
        stockName: '贵州茅台',
        type: 'buy',
        price: 1800,
        quantity: 100,
        amount: 180000,
        date: '2025-02-05',
        timestamp: new Date(),
        reason: '测试',
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/leaderboard?type=winrate', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.type).toBe('winrate');
  });

  it('无效的type参数返回400错误', async () => {
    const request = new NextRequest('http://localhost:3000/api/leaderboard?type=invalid', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('type');
  });

  it('默认返回收益排行榜', async () => {
    const { getAccountSnapshots } = await import('@/lib/db/queries');
    vi.mocked(getAccountSnapshots).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/leaderboard', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.type).toBe('profit');
  });

  it('查询失败返回500错误', async () => {
    const { getAccountSnapshots } = await import('@/lib/db/queries');
    vi.mocked(getAccountSnapshots).mockRejectedValue(new Error('数据库错误'));

    const request = new NextRequest('http://localhost:3000/api/leaderboard?type=profit', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
