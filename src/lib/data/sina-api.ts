import axios from 'axios';
import iconv from 'iconv-lite';
import type { StockData, RealtimeQuote, IntradayPoint } from '@/types';

// 新浪财经 API 基础地址
const SINA_API_BASE = (process.env.NEXT_PUBLIC_SINA_API_BASE || 'https://hq.sinajs.cn')
  .replace('https://hq.sinajs.cn', 'http://hq.sinajs.cn');

const SINA_HEADERS = {
  Referer: 'https://finance.sina.com.cn/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: '*/*',
} as const;

// 历史K线数据接口 - 使用新浪财经的历史数据接口
const SINA_HISTORY_API = 'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php';

export interface IntradayKLinePoint {
  code: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

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
 * 获取当日 N 分钟 K 线（分时）数据
 * @param code 股票代码，如 sh600000 或 sz000001
 * @param scaleMinutes K线周期，单位分钟（如 1 / 5 / 15 / 30 / 60）
 * @param datalen 拉取条数（默认 1024）
 */
export async function fetchIntradayKLine(
  code: string,
  scaleMinutes: number = 5,
  datalen: number = 1024
): Promise<IntradayKLinePoint[]> {
  try {
    const standardCode = standardizeStockCode(code);
    const url = `${SINA_HISTORY_API}/CN_MarketData.getKLineData`;

    const response = await axios.get(url, {
      params: {
        symbol: standardCode,
        scale: scaleMinutes,
        ma: 'no',
        datalen,
      },
      timeout: 10000,
      headers: SINA_HEADERS,
    });

    const raw = response.data;
    if (!Array.isArray(raw) || raw.length === 0) {
      return [];
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayPrefix = `${yyyy}-${mm}-${dd}`;

    const points: IntradayKLinePoint[] = [];
    for (const item of raw) {
      const day: string = item.day || item.date || '';
      if (!day || !day.startsWith(todayPrefix)) continue;

      points.push({
        code: standardCode,
        timestamp: day.replace(' ', 'T'),
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseInt(item.volume, 10),
      });
    }

    points.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return points;
  } catch (error) {
    console.error(`Error fetching intraday kline for ${code}:`, error);
    return [];
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
  close: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string;
} | null> {
  try {
    const standardCode = standardizeStockCode(code);
    const url = `${SINA_API_BASE}/list=${standardCode}`;

    const response = await axios.get(url, {
      timeout: 5000,
      headers: SINA_HEADERS,
      responseType: 'arraybuffer',
    });

    // 新浪返回 GBK 编码的数据，需要解码
    const data = iconv.decode(Buffer.from(response.data), 'GBK');
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
      close,
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
 * 批量获取实时行情（扩展版，返回 Map<code, RealtimeQuote>）
 * @param codes 股票代码数组
 * @returns Map<股票代码, RealtimeQuote>
 */
export async function fetchBatchRealtimeData(codes: string[]): Promise<Map<string, RealtimeQuote>> {
  try {
    const standardCodes = codes.map(standardizeStockCode);
    const url = `${SINA_API_BASE}/list=${standardCodes.join(',')}`;

    const response = await axios.get(url, {
      timeout: 5000,
      headers: SINA_HEADERS,
      responseType: 'arraybuffer',
    });

    // 新浪返回 GBK 编码的数据，需要解码
    const data = iconv.decode(Buffer.from(response.data), 'GBK');

    // 解析多只股票的实时数据
    const lines = data.split('\n').filter((line: string) => line.trim());
    const results = new Map<string, RealtimeQuote>();

    for (const line of lines) {
      const match = line.match(/hq_str_(.+?)="([^"]*)"/);
      if (match) {
        const code = match[1];
        const data = match[2];
        if (data) {
          const parts = data.split(',');
          if (parts.length >= 32) {
            const open = parseFloat(parts[1]);
            const close = parseFloat(parts[2]); // 昨收
            const price = parseFloat(parts[3]);
            const high = parseFloat(parts[4]);
            const low = parseFloat(parts[5]);
            const volume = parseInt(parts[8], 10) * 100;

            // 检测涨跌停和停牌
            const isLimitUpVal = isLimitUp(price, close, code);
            const isLimitDownVal = isLimitDown(price, close, code);
            const isSuspendedVal = isSuspended(volume, price, close);

            results.set(code, {
              code,
              name: parts[0],
              price,
              open,
              close,
              high,
              low,
              volume,
              timestamp: new Date().toISOString(),
              // 买卖五档（如果有数据）
              bid1: parts.length > 6 ? parseFloat(parts[6]) : undefined,
              ask1: parts.length > 7 ? parseFloat(parts[7]) : undefined,
              bidVol1: parts.length > 8 ? parseInt(parts[8], 10) : undefined,
              askVol1: parts.length > 9 ? parseInt(parts[9], 10) : undefined,
              bid2: parts.length > 10 ? parseFloat(parts[10]) : undefined,
              ask2: parts.length > 11 ? parseFloat(parts[11]) : undefined,
              bidVol2: parts.length > 12 ? parseInt(parts[12], 10) : undefined,
              askVol2: parts.length > 13 ? parseInt(parts[13], 10) : undefined,
              bid3: parts.length > 14 ? parseFloat(parts[14]) : undefined,
              ask3: parts.length > 15 ? parseFloat(parts[15]) : undefined,
              bidVol3: parts.length > 16 ? parseInt(parts[16], 10) : undefined,
              askVol3: parts.length > 17 ? parseInt(parts[17], 10) : undefined,
              bid4: parts.length > 18 ? parseFloat(parts[18]) : undefined,
              ask4: parts.length > 19 ? parseFloat(parts[19]) : undefined,
              bidVol4: parts.length > 20 ? parseInt(parts[20], 10) : undefined,
              askVol4: parts.length > 21 ? parseInt(parts[21], 10) : undefined,
              bid5: parts.length > 22 ? parseFloat(parts[22]) : undefined,
              ask5: parts.length > 23 ? parseFloat(parts[23]) : undefined,
              bidVol5: parts.length > 24 ? parseInt(parts[24], 10) : undefined,
              askVol5: parts.length > 25 ? parseInt(parts[25], 10) : undefined,
              // 状态标记
              isLimitUp: isLimitUpVal,
              isLimitDown: isLimitDownVal,
              isSuspended: isSuspendedVal,
            });
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching batch realtime quotes:', error);
    return new Map();
  }
}
