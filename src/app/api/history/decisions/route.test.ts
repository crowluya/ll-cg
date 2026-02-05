/**
 * 历史决策API测试
 * Phase 6.10: 历史决策API测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getAIDecisions: vi.fn(),
}));

describe('GET /api/history/decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('成功获取所有决策记录', async () => {
    const { getAIDecisions } = await import('@/lib/db/queries');
    vi.mocked(getAIDecisions).mockResolvedValue([
      {
        id: '1',
        model: 'deepseek-v3',
        stock: 'sh600519',
        action: 'buy',
        quantity: 100,
        price: 1800,
        reason: '技术面看好',
        confidence: 0.8,
        timestamp: new Date('2025-02-05T10:00:00Z'),
        input: {},
        output: {},
        execution: { success: true },
      },
      {
        id: '2',
        model: 'gemini-2.0',
        stock: 'sz000001',
        action: 'sell',
        quantity: 200,
        price: 10.5,
        reason: '止盈',
        confidence: 0.9,
        timestamp: new Date('2025-02-05T11:00:00Z'),
        input: {},
        output: {},
        execution: { success: true },
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/history/decisions', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.count).toBe(2);
  });

  it('按模型过滤决策记录', async () => {
    const { getAIDecisions } = await import('@/lib/db/queries');
    vi.mocked(getAIDecisions).mockResolvedValue([
      {
        id: '1',
        model: 'deepseek-v3',
        stock: 'sh600519',
        action: 'buy',
        quantity: 100,
        price: 1800,
        reason: '技术面看好',
        confidence: 0.8,
        timestamp: new Date('2025-02-05T10:00:00Z'),
        input: {},
        output: {},
        execution: { success: true },
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/history/decisions?model=deepseek-v3', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].model).toBe('deepseek-v3');
    expect(getAIDecisions).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'deepseek-v3' })
    );
  });

  it('按股票代码过滤决策记录', async () => {
    const { getAIDecisions } = await import('@/lib/db/queries');
    vi.mocked(getAIDecisions).mockResolvedValue([
      {
        id: '1',
        model: 'deepseek-v3',
        stock: 'sh600519',
        action: 'buy',
        quantity: 100,
        price: 1800,
        reason: '技术面看好',
        confidence: 0.8,
        timestamp: new Date('2025-02-05T10:00:00Z'),
        input: {},
        output: {},
        execution: { success: true },
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/history/decisions?stock=sh600519', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data[0].stock).toBe('sh600519');
    expect(getAIDecisions).toHaveBeenCalledWith(
      expect.objectContaining({ stock: 'sh600519' })
    );
  });

  it('按日期范围过滤决策记录', async () => {
    const { getAIDecisions } = await import('@/lib/db/queries');
    vi.mocked(getAIDecisions).mockResolvedValue([]);

    const request = new NextRequest(
      'http://localhost:3000/api/history/decisions?startDate=2025-02-01&endDate=2025-02-05',
      { method: 'GET' }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getAIDecisions).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      })
    );
  });

  it('限制返回数量', async () => {
    const { getAIDecisions } = await import('@/lib/db/queries');
    vi.mocked(getAIDecisions).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/history/decisions?limit=10', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getAIDecisions).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 })
    );
  });

  it('查询失败返回500错误', async () => {
    const { getAIDecisions } = await import('@/lib/db/queries');
    vi.mocked(getAIDecisions).mockRejectedValue(new Error('数据库错误'));

    const request = new NextRequest('http://localhost:3000/api/history/decisions', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
