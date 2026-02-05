/**
 * 股票搜索API测试
 * Phase 6.4: 股票搜索API测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock searchStock
vi.mock('@/lib/data/sina-api', () => ({
  searchStock: vi.fn(),
}));

describe('GET /api/stock/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('成功搜索股票（按代码）', async () => {
    const { searchStock } = await import('@/lib/data/sina-api');
    vi.mocked(searchStock).mockResolvedValue([
      { code: 'sh600519', name: '贵州茅台', market: 'sh' },
    ]);

    const request = new NextRequest('http://localhost:3000/api/stock/search?q=600519', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].code).toBe('sh600519');
    expect(searchStock).toHaveBeenCalledWith('600519');
  });

  it('成功搜索股票（按名称）', async () => {
    const { searchStock } = await import('@/lib/data/sina-api');
    vi.mocked(searchStock).mockResolvedValue([
      { code: 'sh600519', name: '贵州茅台', market: 'sh' },
      { code: 'sh600809', name: '山西汾酒', market: 'sh' },
    ]);

    const request = new NextRequest('http://localhost:3000/api/stock/search?q=茅台', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
    expect(searchStock).toHaveBeenCalledWith('茅台');
  });

  it('缺少q参数返回400错误', async () => {
    const request = new NextRequest('http://localhost:3000/api/stock/search', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('搜索关键词');
  });

  it('空结果返回空数组', async () => {
    const { searchStock } = await import('@/lib/data/sina-api');
    vi.mocked(searchStock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/stock/search?q=不存在的股票', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(0);
  });

  it('搜索失败返回500错误', async () => {
    const { searchStock } = await import('@/lib/data/sina-api');
    vi.mocked(searchStock).mockRejectedValue(new Error('搜索失败'));

    const request = new NextRequest('http://localhost:3000/api/stock/search?q=600519', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  it('限制返回结果数量', async () => {
    const { searchStock } = await import('@/lib/data/sina-api');
    const mockResults = Array.from({ length: 50 }, (_, i) => ({
      code: `sh60${String(i).padStart(4, '0')}`,
      name: `股票${i}`,
      market: 'sh',
    }));
    vi.mocked(searchStock).mockResolvedValue(mockResults);

    const request = new NextRequest('http://localhost:3000/api/stock/search?q=股票&limit=10', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(10);
  });
});
