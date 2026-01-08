import { fetchBatchRealtimeData } from '@/lib/data/sina-api';
import { INITIAL_HOLDINGS } from '@/lib/portfolio/initial-holdings';

export interface PortfolioRealtimePoint {
  timestamp: string;
  totalValue: number;
}

export interface QuoteSnapshot {
  price: number;
  open: number;
  close: number;
}

type QuotesSnapshot = Record<string, QuoteSnapshot>;

declare global {
  var __portfolioRealtimeManager:
    | {
        started: boolean;
        lastFetchAt: number;
        quotes: QuotesSnapshot;
        points: PortfolioRealtimePoint[];
      }
    | undefined;
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

function computeTotalValue(quotes: QuotesSnapshot): number {
  return INITIAL_HOLDINGS.reduce((sum, h) => {
    const p = quotes[h.code]?.price ?? h.cost;
    return sum + p * h.quantity;
  }, 0);
}

async function refreshQuotes(state: { quotes: QuotesSnapshot }) {
  const codes = INITIAL_HOLDINGS.map((h) => h.code);
  const quotes = await fetchBatchRealtimeData(codes);
  const next: QuotesSnapshot = { ...state.quotes };

  for (const q of quotes) {
    if (!q) continue;
    next[q.code] = {
      price: q.price,
      open: q.open,
      close: q.close,
    };
  }

  state.quotes = next;
}

export function startPortfolioRealtimeManager() {
  if (typeof window !== 'undefined') return;

  if (!globalThis.__portfolioRealtimeManager) {
    globalThis.__portfolioRealtimeManager = {
      started: false,
      lastFetchAt: 0,
      quotes: {},
      points: [],
    };
  }

  const state = globalThis.__portfolioRealtimeManager;
  if (state.started) return;
  state.started = true;

  const MAX_POINTS = 15 * 60;
  const FETCH_INTERVAL_MS = 5000;

  let running = false;
  let lastTimestamp = '';

  const tick = async () => {
    if (running) return;
    running = true;
    const now = Date.now();

    if (now - state.lastFetchAt >= FETCH_INTERVAL_MS) {
      state.lastFetchAt = now;
      try {
        await refreshQuotes(state);
      } catch {
      }
    }

    const timestamp = formatLocalDateISO(new Date());
    if (timestamp !== lastTimestamp) {
      lastTimestamp = timestamp;
      const point: PortfolioRealtimePoint = {
        timestamp,
        totalValue: computeTotalValue(state.quotes),
      };

      state.points.push(point);
      if (state.points.length > MAX_POINTS) {
        state.points.splice(0, state.points.length - MAX_POINTS);
      }
    }

    running = false;
  };

  tick();

  setInterval(() => {
    tick();
  }, 1000);
}

export function getPortfolioRealtimePoints(): PortfolioRealtimePoint[] {
  if (typeof window !== 'undefined') return [];
  startPortfolioRealtimeManager();
  const points = globalThis.__portfolioRealtimeManager?.points ?? [];
  const map = new Map<string, PortfolioRealtimePoint>();
  for (const p of points) {
    map.set(p.timestamp, p);
  }
  return Array.from(map.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function getPortfolioRealtimeQuotes(): QuotesSnapshot {
  if (typeof window !== 'undefined') return {};
  startPortfolioRealtimeManager();
  return globalThis.__portfolioRealtimeManager?.quotes ?? {};
}
