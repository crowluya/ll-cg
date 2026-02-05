import type { StockData } from '@/types';

// 缓存项接口
interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

// 内存缓存存储
const memoryCache = new Map<string, CacheItem<any>>();

// 默认缓存时间（毫秒）
const DEFAULT_TTL = 5 * 60 * 1000; // 5分钟
const STOCK_DATA_TTL = 15 * 60 * 1000; // 15分钟 - 股票数据缓存
const REALTIME_DATA_TTL = 30 * 1000; // 30秒 - 实时数据缓存
const INTRADAY_DATA_TTL = 5 * 60 * 1000; // 5分钟 - 分时数据缓存

/**
 * 生成缓存键
 * @param parts 缓存键组成部分
 * @returns 缓存键字符串
 */
export function generateCacheKey(...parts: string[]): string {
  return parts.join(':');
}

/**
 * 生成股票数据缓存键
 * @param code 股票代码
 * @param days 天数
 * @returns 缓存键
 */
export function generateStockDataKey(code: string, days: number): string {
  return generateCacheKey('stock', code.toLowerCase(), String(days));
}

/**
 * 生成实时数据缓存键
 * @param code 股票代码
 * @returns 缓存键
 */
export function generateRealtimeKey(code: string): string {
  return generateCacheKey('realtime', code.toLowerCase());
}

export function generateIntradayKey(code: string, date: string, scale: number): string {
  return generateCacheKey('intraday', code.toLowerCase(), date, String(scale));
}

/**
 * 获取缓存数据
 * @param key 缓存键
 * @returns 缓存的数据，如果不存在或已过期则返回 null
 */
export function getCached<T>(key: string): T | null {
  const item = memoryCache.get(key);

  if (!item) {
    return null;
  }

  // 检查是否过期
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return item.data as T;
}

/**
 * 设置缓存数据
 * @param key 缓存键
 * @param data 要缓存的数据
 * @param ttl 过期时间（毫秒），默认使用 DEFAULT_TTL
 */
export function setCached<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
}

/**
 * 删除缓存
 * @param key 缓存键
 */
export function deleteCached(key: string): void {
  memoryCache.delete(key);
}

/**
 * 清空所有缓存
 */
export function clearCache(): void {
  memoryCache.clear();
}

/**
 * 清空过期缓存
 */
export function clearExpiredCache(): void {
  const now = Date.now();

  for (const [key, item] of memoryCache.entries()) {
    if (now > item.expiresAt) {
      memoryCache.delete(key);
    }
  }
}

/**
 * 获取或设置缓存（如果缓存不存在，则通过函数获取数据并缓存）
 * @param key 缓存键
 * @param fn 获取数据的函数
 * @param ttl 过期时间（毫秒）
 * @returns 缓存的数据或新获取的数据
 */
export async function getOrSetCached<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const cached = getCached<T>(key);

  if (cached !== null) {
    return cached;
  }

  const data = await fn();
  setCached(key, data, ttl);
  return data;
}

/**
 * 获取缓存的股票数据
 * @param code 股票代码
 * @param days 天数
 * @returns 缓存的股票数据，如果不存在则返回 null
 */
export function getCachedStockData(code: string, days: number): StockData[] | null {
  return getCached<StockData[]>(generateStockDataKey(code, days));
}

/**
 * 设置股票数据缓存
 * @param code 股票代码
 * @param days 天数
 * @param data 股票数据
 */
export function setCachedStockData(code: string, days: number, data: StockData[]): void {
  setCached(generateStockDataKey(code, days), data, STOCK_DATA_TTL);
}

/**
 * 获取或缓存股票数据
 * @param code 股票代码
 * @param days 天数
 * @param fn 获取数据的函数
 * @returns 股票数据
 */
export async function getOrSetStockData(
  code: string,
  days: number,
  fn: () => Promise<StockData[]>
): Promise<StockData[]> {
  return getOrSetCached(generateStockDataKey(code, days), fn, STOCK_DATA_TTL);
}

export async function getOrSetIntradayData<T>(
  code: string,
  date: string,
  scale: number,
  fn: () => Promise<T>
): Promise<T> {
  return getOrSetCached(generateIntradayKey(code, date, scale), fn, INTRADAY_DATA_TTL);
}

/**
 * 获取缓存统计信息
 * @returns 缓存统计
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
} {
  return {
    size: memoryCache.size,
    keys: Array.from(memoryCache.keys()),
  };
}

// 定期清理过期缓存（每5分钟）
if (typeof window === 'undefined') {
  // 仅在服务端运行
  setInterval(() => {
    clearExpiredCache();
  }, 5 * 60 * 1000);
}

// ==================== Phase 2.8: 请求合并机制 ====================

// 进行中的请求 Map
const pendingRequests = new Map<string, Promise<any>>();

/**
 * 请求合并：相同 key 的并发请求只执行一次
 * @param key 缓存键
 * @param fn 获取数据的函数
 * @param ttl 缓存过期时间（毫秒）
 * @returns 数据
 *
 * @example
 * // 多个并发请求自动合并
 * const data1 = mergeRequest('stock:sh600519', fetchStockData);
 * const data2 = mergeRequest('stock:sh600519', fetchStockData);
 * // 只会执行一次 fetchStockData
 */
export async function mergeRequest<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  // 先检查缓存
  const cached = getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  // 检查是否有正在进行的请求
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending;
  }

  // 创建新请求
  const promise = (async () => {
    try {
      const data = await fn();
      setCached(key, data, ttl);
      return data;
    } finally {
      // 请求完成后移除待处理状态
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, promise);
  return promise;
}
