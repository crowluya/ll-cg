import axios from 'axios';
import type { StockData } from '@/types';

// 新浪财经 API 基础地址
const SINA_API_BASE = process.env.NEXT_PUBLIC_SINA_API_BASE || 'https://hq.sinajs.cn';

// 历史K线数据接口 - 使用新浪财经的历史数据接口
const SINA_HISTORY_API = 'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php';

/**
 * 获取单只股票历史K线数据
 * @param code 股票代码，如 sh600000 或 sz000001
 * @param days 获取天数，默认30天
 * @returns 股票K线数据数组
 */
export async function fetchStockData(code: string, days: number = 30): Promise<StockData[]> {
  try {
    // 标准化股票代码
    const standardCode = standardizeStockCode(code);

    // 计算起始日期
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    // 使用新浪财经历史数据接口
    // 格式: https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=sh600000&scale=240&ma=no&datalen=100
    const url = `${SINA_HISTORY_API}/CN_MarketData.getKLineData`;

    const response = await axios.get(url, {
      params: {
        symbol: standardCode,
        scale: 240, // 日线数据
        ma: 'no',
        datalen: days,
      },
      timeout: 10000,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error(`No data returned for stock ${code}`);
    }

    // 解析新浪返回的数据格式
    const rawData = response.data;
    const stockDataList: StockData[] = [];

    for (const item of rawData) {
      stockDataList.push({
        code: standardCode,
        date: item.day,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseInt(item.volume, 10),
      });
    }

    // 按日期升序排序
    stockDataList.sort((a, b) => a.date.localeCompare(b.date));

    return stockDataList;
  } catch (error) {
    console.error(`Error fetching stock data for ${code}:`, error);
    throw error;
  }
}

/**
 * 批量获取多只股票历史数据
 * @param codes 股票代码数组
 * @param days 获取天数
 * @returns Map<股票代码, StockData[]>
 */
export async function fetchBatchStockData(
  codes: string[],
  days: number = 30
): Promise<Map<string, StockData[]>> {
  const result = new Map<string, StockData[]>();

  // 并行获取，但限制并发数
  const concurrency = 5;
  for (let i = 0; i < codes.length; i += concurrency) {
    const batch = codes.slice(i, i + concurrency);
    const promises = batch.map(async (code) => {
      try {
        const data = await fetchStockData(code, days);
        result.set(code, data);
      } catch (error) {
        console.error(`Failed to fetch data for ${code}:`, error);
        result.set(code, []); // 失败时返回空数组
      }
    });
    await Promise.all(promises);
  }

  return result;
}

/**
 * 获取实时行情数据
 * @param code 股票代码
 * @returns 实时行情数据
 */
export async function fetchRealtimeData(code: string): Promise<{
  code: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string;
} | null> {
  try {
    const standardCode = standardizeStockCode(code);
    const url = `${SINA_API_BASE}/list=${standardCode}`;

    const response = await axios.get(url, { timeout: 5000 });

    // 新浪返回的数据格式: var hq_str_sh600000="浦发银行,10.50,10.45,10.55,..."
    const data = response.data;
    const match = data.match(/="([^"]+)"/);

    if (!match || !match[1]) {
      return null;
    }

    const parts = match[1].split(',');
    if (parts.length < 32) {
      return null;
    }

    // 解析新浪实时数据格式
    // 0:名称, 1:开盘, 2:昨收, 3:现价, 4:最高, 5:最低, 6:买一, 7:卖一, ...
    // 8:成交量(手), 9:成交额
    const name = parts[0];
    const open = parseFloat(parts[1]);
    const close = parseFloat(parts[2]); // 昨收
    const price = parseFloat(parts[3]);
    const high = parseFloat(parts[4]);
    const low = parseFloat(parts[5]);
    const volume = parseInt(parts[8], 10) * 100; // 手转换为股

    return {
      code: standardCode,
      name,
      price,
      open,
      high,
      low,
      volume,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching realtime data for ${code}:`, error);
    return null;
  }
}

/**
 * 批量获取实时行情
 * @param codes 股票代码数组
 * @returns 实时行情数组
 */
export async function fetchBatchRealtimeData(codes: string[]): Promise<Array<{
  code: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string;
} | null>> {
  try {
    const standardCodes = codes.map(standardizeStockCode);
    const url = `${SINA_API_BASE}/list=${standardCodes.join(',')}`;

    const response = await axios.get(url, { timeout: 5000 });

    // 解析多只股票的实时数据
    const lines = response.data.split('\n').filter((line: string) => line.trim());
    const results: Array<ReturnType<typeof fetchRealtimeData> extends Promise<infer T> ? T : never> = [];

    for (const line of lines) {
      const match = line.match(/hq_str_(.+?)="([^"]*)"/);
      if (match) {
        const code = match[1];
        const data = match[2];
        if (data) {
          const parts = data.split(',');
          if (parts.length >= 32) {
            results.push({
              code,
              name: parts[0],
              price: parseFloat(parts[3]),
              open: parseFloat(parts[1]),
              high: parseFloat(parts[4]),
              low: parseFloat(parts[5]),
              volume: parseInt(parts[8], 10) * 100,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching batch realtime data:', error);
    return codes.map(() => null);
  }
}

/**
 * 解析新浪返回的原始数据格式
 * @param raw 新浪API返回的原始字符串
 * @returns 解析后的股票数据
 */
export function parseSinaData(raw: string): StockData[] {
  const result: StockData[] = [];

  try {
    const data = JSON.parse(raw);

    if (Array.isArray(data)) {
      for (const item of data) {
        result.push({
          code: item.symbol || '',
          date: item.day || item.date || '',
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseInt(item.volume, 10),
        });
      }
    }
  } catch (error) {
    console.error('Error parsing sina data:', error);
  }

  return result;
}

/**
 * 标准化股票代码格式
 * @param code 股票代码
 * @returns 标准化后的代码 (如 sh600000 或 sz000001)
 */
export function standardizeStockCode(code: string): string {
  const trimmed = code.trim().toUpperCase();

  // 如果已经是标准格式，直接返回
  if (/^(SH|SZ)\d{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // 如果是纯数字，添加前缀
  if (/^\d{6}$/.test(trimmed)) {
    const firstChar = trimmed[0];
    if (firstChar === '6') {
      return `sh${trimmed}`; // 上海证券交易所
    } else if (firstChar === '0' || firstChar === '3') {
      return `sz${trimmed}`; // 深圳证券交易所
    }
  }

  // 默认返回原值
  return trimmed.toLowerCase();
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param date 日期对象
 * @returns 格式化后的日期字符串
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 检查是否是交易日
 * @param date 日期字符串 YYYY-MM-DD
 * @returns 是否是交易日
 */
export async function isTradingDay(date: string): Promise<boolean> {
  // 简单实现：周末不是交易日
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6; // 0=周日, 6=周六
}

/**
 * 检查当前是否在交易时间段
 * @returns 是否在交易时间段 (9:15-15:00)
 */
export function isTradingTime(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;

  // 交易时间：9:15-15:00
  const startMinutes = 9 * 60 + 15; // 9:15
  const endMinutes = 15 * 60; // 15:00

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * 常用股票代码
 */
export const COMMON_STOCKS = {
  // 上证指数
  sh000001: '上证指数',

  // 蓝筹股
  sh600000: '浦发银行',
  sh600036: '招商银行',
  sh600519: '贵州茅台',
  sh601318: '中国平安',

  // 深证成指
  sz399001: '深证成指',

  // 深市蓝筹
  sz000001: '平安银行',
  sz000002: '万科A',
  sz300750: '宁德时代',
} as const;
