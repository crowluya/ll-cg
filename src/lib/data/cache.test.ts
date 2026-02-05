/**
 * 缓存模块单元测试
 * 测试文件: src/lib/data/cache.test.ts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  generateCacheKey,
  generateStockDataKey,
  generateRealtimeKey,
  getCached,
  setCached,
  deleteCached,
  clearCache,
  clearExpiredCache,
  getOrSetCached,
  getCachedStockData,
  setCachedStockData,
  getOrSetStockData,
  getCacheStats,
  mergeRequest,
} from './cache';
import type { StockData } from '@/types';

describe('cache', () => {
  beforeEach(() => {
    // 每个测试前清空缓存
    clearCache();
  });

  // ============= generateCacheKey 测试 =============

  describe('generateCacheKey', () => {
    it('生成单个部分缓存键', () => {
      expect(generateCacheKey('test')).toBe('test');
    });

    it('生成多个部分缓存键', () => {
      expect(generateCacheKey('stock', 'sz000001', '30')).toBe('stock:sz000001:30');
    });

    it('处理空字符串', () => {
      expect(generateCacheKey('stock', '', '30')).toBe('stock::30');
    });
  });

  // ============= generateStockDataKey 测试 =============

  describe('generateStockDataKey', () => {
    it('生成股票数据缓存键', () => {
      expect(generateStockDataKey('sz000001', 30)).toBe('stock:sz000001:30');
    });

    it('股票代码转小写', () => {
      expect(generateStockDataKey('SZ000001', 30)).toBe('stock:sz000001:30');
    });
  });

  // ============= generateRealtimeKey 测试 =============

  describe('generateRealtimeKey', () => {
    it('生成实时数据缓存键', () => {
      expect(generateRealtimeKey('sz000001')).toBe('realtime:sz000001');
    });
  });

  // ============= getCached / setCached 测试 =============

  describe('getCached / setCached', () => {
    it('设置和获取值', () => {
      setCached('test-key', { value: 42 });
      const result = getCached<{ value: number }>('test-key');

      expect(result).toEqual({ value: 42 });
    });

    it('不存在的键返回null', () => {
      const result = getCached('non-existent');
      expect(result).toBeNull();
    });

    it('获取已过期的缓存返回null', async () => {
      setCached('expire-key', { value: 42 }, 100); // 100ms TTL

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = getCached('expire-key');
      expect(result).toBeNull();
    });

    it('未过期的缓存可以获取', async () => {
      setCached('valid-key', { value: 42 }, 1000); // 1秒 TTL

      await new Promise(resolve => setTimeout(resolve, 100));

      const result = getCached('valid-key');
      expect(result).toEqual({ value: 42 });
    });

    it('覆盖已存在的缓存', () => {
      setCached('key', { value: 1 });
      setCached('key', { value: 2 });

      const result = getCached('key');
      expect(result).toEqual({ value: 2 });
    });
  });

  // ============= deleteCached 测试 =============

  describe('deleteCached', () => {
    it('删除指定缓存', () => {
      setCached('key1', { value: 1 });
      setCached('key2', { value: 2 });

      deleteCached('key1');

      expect(getCached('key1')).toBeNull();
      expect(getCached('key2')).toEqual({ value: 2 });
    });

    it('删除不存在的键不报错', () => {
      expect(() => deleteCached('non-existent')).not.toThrow();
    });
  });

  // ============= clearCache 测试 =============

  describe('clearCache', () => {
    it('清空所有缓存', () => {
      setCached('key1', { value: 1 });
      setCached('key2', { value: 2 });
      setCached('key3', { value: 3 });

      clearCache();

      expect(getCacheStats().size).toBe(0);
    });
  });

  // ============= clearExpiredCache 测试 =============

  describe('clearExpiredCache', () => {
    it('清除过期的缓存', async () => {
      setCached('expired-key', { value: 1 }, 50);
      setCached('valid-key', { value: 2 }, 1000);

      await new Promise(resolve => setTimeout(resolve, 100));

      clearExpiredCache();

      expect(getCached('expired-key')).toBeNull();
      expect(getCached('valid-key')).toEqual({ value: 2 });
    });

    it('无过期缓存时不影响有效缓存', async () => {
      setCached('key1', { value: 1 }, 1000);
      setCached('key2', { value: 2 }, 1000);

      await new Promise(resolve => setTimeout(resolve, 100));

      clearExpiredCache();

      expect(getCacheStats().size).toBe(2);
    });
  });

  // ============= getOrSetCached 测试 =============

  describe('getOrSetCached', () => {
    it('缓存存在时直接返回缓存值', async () => {
      setCached('key', { value: 42 });

      const fetchFn = vi.fn().mockResolvedValue({ value: 100 });
      const result = await getOrSetCached('key', fetchFn);

      expect(result).toEqual({ value: 42 });
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('缓存不存在时调用函数获取数据', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ value: 100 });
      const result = await getOrSetCached('key', fetchFn);

      expect(result).toEqual({ value: 100 });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('获取的数据自动缓存', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ value: 100 });

      await getOrSetCached('key', fetchFn);

      const cached = getCached('key');
      expect(cached).toEqual({ value: 100 });
    });

    // 注意: 当前缓存实现不支持并发锁定，多个并发调用会多次执行函数
    // 如需支持并发锁定，需要修改 getOrSetCached 实现
  });

  // ============= 股票数据缓存测试 =============

  describe('股票数据缓存', () => {
    const mockStockData: StockData[] = [
      {
        code: 'sz000001',
        date: '2024-01-02',
        open: 10.0,
        high: 10.5,
        low: 9.8,
        close: 10.3,
        volume: 1000000,
      },
    ];

    it('getCachedStockData 获取缓存', () => {
      setCachedStockData('sz000001', 30, mockStockData);

      const result = getCachedStockData('sz000001', 30);

      expect(result).toEqual(mockStockData);
    });

    it('setCachedStockData 设置缓存', () => {
      setCachedStockData('sz000001', 30, mockStockData);

      const result = getCachedStockData('sz000001', 30);

      expect(result).toEqual(mockStockData);
    });

    it('getOrSetStockData 缓存存在时直接返回', async () => {
      setCachedStockData('sz000001', 30, mockStockData);

      const fetchFn = vi.fn().mockResolvedValue([]);
      const result = await getOrSetStockData('sz000001', 30, fetchFn);

      expect(result).toEqual(mockStockData);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('getOrSetStockData 缓存不存在时获取', async () => {
      const fetchFn = vi.fn().mockResolvedValue(mockStockData);

      const result = await getOrSetStockData('sz000001', 30, fetchFn);

      expect(result).toEqual(mockStockData);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('不同天数使用不同缓存键', () => {
      setCachedStockData('sz000001', 30, mockStockData);
      setCachedStockData('sz000001', 60, [{ ...mockStockData[0], date: '2024-01-01' }]);

      const result30 = getCachedStockData('sz000001', 30);
      const result60 = getCachedStockData('sz000001', 60);

      expect(result30).toHaveLength(1);
      expect(result60).toHaveLength(1);
      expect(result30![0].date).not.toBe(result60![0].date);
    });
  });

  // ============= getCacheStats 测试 =============

  describe('getCacheStats', () => {
    it('返回缓存大小', () => {
      setCached('key1', { value: 1 });
      setCached('key2', { value: 2 });

      const stats = getCacheStats();

      expect(stats.size).toBe(2);
    });

    it('返回所有缓存键', () => {
      setCached('key1', { value: 1 });
      setCached('key2', { value: 2 });

      const stats = getCacheStats();

      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });

    it('空缓存返回空统计', () => {
      const stats = getCacheStats();

      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });

  // ============= Phase 2.7: mergeRequest 请求合并测试 =============

  describe('Phase 2.7: mergeRequest 请求合并', () => {
    it('相同 key 的并发请求应该合并为一次调用', async () => {
      let callCount = 0;
      const fetchFn = vi.fn(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 50)); // 模拟延迟
        return { value: 42 };
      });

      // 并发调用同一个 key
      const promises = [
        mergeRequest('test-key', fetchFn),
        mergeRequest('test-key', fetchFn),
        mergeRequest('test-key', fetchFn),
      ];

      const results = await Promise.all(promises);

      // 验证只调用了一次函数
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(callCount).toBe(1);

      // 验证所有请求都得到了正确结果
      expect(results[0]).toEqual({ value: 42 });
      expect(results[1]).toEqual({ value: 42 });
      expect(results[2]).toEqual({ value: 42 });
    });

    it('不同 key 的请求独立执行', async () => {
      const fetchFn1 = vi.fn().mockResolvedValue({ value: 1 });
      const fetchFn2 = vi.fn().mockResolvedValue({ value: 2 });

      const results = await Promise.all([
        mergeRequest('key1', fetchFn1),
        mergeRequest('key2', fetchFn2),
      ]);

      expect(fetchFn1).toHaveBeenCalledTimes(1);
      expect(fetchFn2).toHaveBeenCalledTimes(1);
      expect(results[0]).toEqual({ value: 1 });
      expect(results[1]).toEqual({ value: 2 });
    });

    it('第一个请求完成后，后续相同 key 的请求应重新调用', async () => {
      let callCount = 0;
      const fetchFn = vi.fn(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return { value: callCount };
      });

      // 第一批并发请求
      await Promise.all([
        mergeRequest('test-key', fetchFn),
        mergeRequest('test-key', fetchFn),
      ]);

      // 等待第一批完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 清除缓存以模拟请求过期
      clearCache();

      // 第二批请求（应该重新调用）
      const result = await mergeRequest('test-key', fetchFn);

      expect(callCount).toBe(2); // 第一次 + 第二次
      expect(result).toEqual({ value: 2 });
    });

    it('请求失败时应该移除待处理状态，允许重试', async () => {
      const fetchFnSuccess = vi.fn().mockResolvedValue({ value: 42 });
      const fetchFnFail = vi.fn().mockRejectedValue(new Error('Network error'));

      // 第一次请求失败
      await expect(mergeRequest('test-key', fetchFnFail)).rejects.toThrow();

      // 第二次请求应该成功（错误状态已清除）
      const result = await mergeRequest('test-key', fetchFnSuccess);
      expect(result).toEqual({ value: 42 });
    });

    it('缓存 TTL 正确生效', async () => {
      let callCount = 0;
      const fetchFn = vi.fn(async () => {
        callCount++;
        return { value: Date.now() };
      });

      // 第一次请求
      const result1 = await mergeRequest('test-key', fetchFn, 50);
      expect(callCount).toBe(1);

      // 立即第二次请求（应该使用缓存）
      const result2 = await mergeRequest('test-key', fetchFn, 50);
      expect(callCount).toBe(1); // 没有增加
      expect(result1).toEqual(result2);

      // 等待缓存过期
      await new Promise(resolve => setTimeout(resolve, 70));

      // 缓存过期后应该重新请求
      const result3 = await mergeRequest('test-key', fetchFn, 50);
      expect(callCount).toBe(2);
    });
  });
});
