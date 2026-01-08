import { getOrSetIntradayData } from '@/lib/data/cache';
import { fetchBatchRealtimeData, fetchIntradayKLine } from '@/lib/data/sina-api';
import { getPortfolioRealtimeQuotes } from '@/lib/portfolio/realtime';
import {
  INITIAL_CASH_AVAILABLE,
  INITIAL_HOLDINGS,
  type InitialHolding,
} from '@/lib/portfolio/initial-holdings';

export interface HoldingQuote {
  code: string;
  name: string;
  quantity: number;
  cost: number;
  price: number;
  close: number;
  intradayPrices: number[];
  changePercent: number;
  value: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  pnl: number;
  pnlPercent: number;
}

export interface PortfolioIntradayPoint {
  timestamp: string;
  totalValue: number | null;
}

export interface PortfolioIntradayResponse {
  holdings: HoldingQuote[];
  points: PortfolioIntradayPoint[];
  total: {
    totalAssets: number;
    totalMarketValue: number;
    availableCash: number;
    floatingPnl: number;
    floatingPnlPercent: number;
    dailyPnl: number;
    dailyPnlPercent: number;
  };
}

function formatLocalDateISO(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
}

function formatDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function generateIntradayTimestamps(tradingDate: Date): string[] {
  const make = (h: number, m: number) => {
    const d = new Date(tradingDate);
    d.setHours(h, m, 0, 0);
    return formatLocalDateISO(d);
  };

  const ts: string[] = [];

  ts.push(make(9, 15));
  ts.push(make(9, 20));
  ts.push(make(9, 25));
  ts.push(make(9, 30));

  for (let h = 10; h <= 10; h += 1) {
    ts.push(make(h, 0));
    ts.push(make(h, 30));
  }
  ts.push(make(11, 0));
  ts.push(make(11, 30));

  ts.push(make(13, 0));
  ts.push(make(13, 30));
  ts.push(make(14, 0));
  ts.push(make(14, 30));
  ts.push(make(15, 0));

  return ts;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function synthPriceAt(
  start: number,
  end: number,
  i: number,
  n: number
): number {
  if (n <= 1) return end;
  const t = i / (n - 1);
  const base = start + (end - start) * t;
  const wave = Math.sin((t * 2 + 0.2) * Math.PI) * 0.003;
  return base * (1 + wave);
}

export async function getPortfolioIntradayData(options?: {
  holdings?: InitialHolding[];
  date?: Date;
}): Promise<PortfolioIntradayResponse> {
  const holdings = options?.holdings ?? INITIAL_HOLDINGS;
  const date = options?.date ?? new Date();

  const scaleMinutes = 5;
  const dateKey = formatDateKey(date);

  // Prefer reusing the server-side realtime manager snapshot to avoid frequent external calls
  const realtimeQuotes = getPortfolioRealtimeQuotes();

  const fallbackQuotes = Object.keys(realtimeQuotes).length
    ? null
    : await fetchBatchRealtimeData(holdings.map((h) => h.code));

  const getQuote = (code: string, idx: number) => {
    const q = realtimeQuotes[code];
    if (q) return q;
    const f = fallbackQuotes?.[idx];
    if (!f) return null;
    return { price: f.price, open: f.open, close: f.close };
  };

  const intradayKlines = await Promise.all(
    holdings.map((h) =>
      getOrSetIntradayData(h.code, dateKey, scaleMinutes, () =>
        fetchIntradayKLine(h.code, scaleMinutes, 1024)
      )
    )
  );

  // Use a shared timestamp axis across all stocks (union of all timestamps, sorted)
  const allTimestamps = Array.from(
    new Set(
      intradayKlines
        .flatMap((k) => k.map((p) => p.timestamp))
        .filter((t) => t && t.startsWith(dateKey))
    )
  ).sort((a, b) => a.localeCompare(b));

  // Fallback to coarse timeline if intraday is empty (e.g., off-market)
  const timestamps = allTimestamps.length ? allTimestamps : generateIntradayTimestamps(date);

  const intradayPricesByStock = holdings.map((h, idx) => {
    const kline = intradayKlines[idx] ?? [];

    if (!kline.length) {
      const q = getQuote(h.code, idx);
      const start = q?.open ?? h.cost;
      const end = q?.price ?? h.cost;
      return timestamps.map((_, i) =>
        clamp(synthPriceAt(start, end, i, timestamps.length), 0.0001, Number.MAX_SAFE_INTEGER)
      );
    }

    // Build a map for fast lookup, and forward-fill missing timestamps
    const map = new Map<string, number>();
    for (const p of kline) {
      map.set(p.timestamp, p.close);
    }

    let last = map.get(timestamps[0]) ?? kline[0].close;
    return timestamps.map((ts) => {
      const v = map.get(ts);
      if (typeof v === 'number' && Number.isFinite(v)) {
        last = v;
        return v;
      }
      return last;
    });
  });

  const holdingQuotes: HoldingQuote[] = holdings.map((h, idx) => {
    const q = getQuote(h.code, idx);
    const price = q?.price ?? h.cost;
    const close = q?.close ?? price;
    const changePercent = close ? ((price - close) / close) * 100 : 0;
    const intradayPrices = intradayPricesByStock[idx] ?? [];

    const value = price * h.quantity;
    const costValue = h.cost * h.quantity;
    const pnl = value - costValue;
    const pnlPercent = costValue ? (pnl / costValue) * 100 : 0;

    const dailyPnl = (price - close) * h.quantity;
    const dailyPnlPercent = close ? ((price - close) / close) * 100 : 0;

    return {
      code: h.code,
      name: h.name,
      quantity: h.quantity,
      cost: h.cost,
      price,
      close,
      intradayPrices,
      changePercent,
      value,
      dailyPnl,
      dailyPnlPercent,
      pnl,
      pnlPercent,
    };
  });

  const points: PortfolioIntradayPoint[] = timestamps.map((timestamp, i) => {
    const totalValue = holdings.reduce((sum, h, idx) => {
      const price = intradayPricesByStock[idx]?.[i] ?? h.cost;
      return sum + price * h.quantity;
    }, 0);

    return { timestamp, totalValue };
  });

  const totalMarketValue = holdingQuotes.reduce((sum, h) => sum + h.value, 0);
  const totalCostValue = holdingQuotes.reduce((sum, h) => sum + h.cost * h.quantity, 0);

  const floatingPnl = totalMarketValue - totalCostValue;
  const floatingPnlPercent = totalCostValue ? (floatingPnl / totalCostValue) * 100 : 0;

  const dailyPnl = holdingQuotes.reduce((sum, h) => sum + h.dailyPnl, 0);
  const dailyBase = holdingQuotes.reduce((sum, h) => sum + h.close * h.quantity, 0);
  const dailyPnlPercent = dailyBase ? (dailyPnl / dailyBase) * 100 : 0;

  const availableCash = INITIAL_CASH_AVAILABLE;
  const totalAssets = totalMarketValue + availableCash;

  return {
    holdings: holdingQuotes,
    points,
    total: {
      totalAssets,
      totalMarketValue,
      availableCash,
      floatingPnl,
      floatingPnlPercent,
      dailyPnl,
      dailyPnlPercent,
    },
  };
}
