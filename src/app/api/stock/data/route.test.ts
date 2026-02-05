/**
 * 股票数据API测试
 * Phase 6.2: 股票数据API测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

// Mock data functions
vi.mock('@/lib/data/sina-api', () => ({
  fetchStockData: vi.fn(),
  fetchBatchStockData: vi.fn(),
  fetchRealtimeData: vi.fn(),
  standardizeStockCode: vi.fn((code) => code),
}));

vi.mock('@/lib/data/cache', () => ({
  getOrSetStockData: vi.fn((code, days, fn) => fn()),
}));

describe('GET /api/stock/data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('成功获取单只股票历史数据', async () => {
    const { fetchStockData } = await import('@/lib/data/sina-api');
    vi.mocked(fetchStockData).mockResolvedValue([
      {
        date: '2025-02-05',
        open: 1800,
        high: 1850,
        low: 1780,
        close: 1820,
        volume: 1000000,
        code: 'sh600519',
        name: '贵州茅台',
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/stock/data?code=sh600519&days=30', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.quotes).toHaveLength(1);
  });

  it('成功获取实时数据', async () => {
    const { fetchRealtimeData } = await import('@/lib/data/sina-api');
    vi.mocked(fetchRealtimeData).mockResolvedValue({
      code: 'sh600519',
      name: '贵州茅台',
      price: 1820,
      open: 1800,
      high: 1850,
      low: 1780,
      prevClose: 1810,
      volume: 1000000,
      amount: 1820000000,
      time: '15:00:00',
      date: '2025-02-05',
    });

    const request = new NextRequest('http://localhost:3000/api/stock/data?code=sh600519&realtime=true', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.price).toBe(1820);
  });

  it('成功批量获取股票数据', async () => {
    const { fetchBatchStockData } = await import('@/lib/data/sina-api');
    vi.mocked(fetchBatchStockData).mockResolvedValue(
      new Map([
        ['sh600519', [{ date: '2025-02-05', open: 1800, high: 1850, low: 1780, close: 1820, volume: 1000000, code: 'sh600519', name: '贵州茅台' }]],
        ['sz000001', [{ date: '2025-02-05', open: 10, high: 11, low: 9.5, close: 10.5, volume: 5000000, code: 'sz000001', name: '平安银行' }]],
      ])
    );

    const request = new NextRequest('http://localhost:3000/api/stock/data?batch=true&codes=sh600519,sz000001', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Object.keys(data.data)).toHaveLength(2);
  });

  it('缺少code参数返回400错误', async () => {
    const request = new NextRequest('http://localhost:3000/api/stock/data', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('股票代码');
  });

  it('天数参数超出范围返回400错误', async () => {
    const request = new NextRequest('http://localhost:3000/api/stock/data?code=sh600519&days=500', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('天数');
  });

  it('批量获取超过20只股票返回400错误', async () => {
    const codes = Array.from({ length: 21 }, (_, i) => `sh60${String(i).padStart(4, '0')}`).join(',');
    const request = new NextRequest(`http://localhost:3000/api/stock/data?batch=true&codes=${codes}`, {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('20');
  });

  it('获取失败返回500错误', async () => {
    const { fetchStockData } = await import('@/lib/data/sina-api');
    vi.mocked(fetchStockData).mockRejectedValue(new Error('网络错误'));

    const request = new NextRequest('http://localhost:3000/api/stock/data?code=sh600519', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

describe('POST /api/stock/data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('成功批量获取股票数据', async () => {
    const { fetchBatchStockData } = await import('@/lib/data/sina-api');
    vi.mocked(fetchBatchStockData).mockResolvedValue(
      new Map([
        ['sh600519', [{ date: '2025-02-05', open: 1800, high: 1850, low: 1780, close: 1820, volume: 1000000, code: 'sh600519', name: '贵州茅台' }]],
      ])
    );

    const request = new NextRequest('http://localhost:3000/api/stock/data', {
      method: 'POST',
      body: JSON.stringify({
        codes: ['sh600519', 'sz000001'],
        days: 30,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('缺少codes参数返回400错误', async () => {
    const request = new NextRequest('http://localhost:3000/api/stock/data', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('股票代码');
  });
});
