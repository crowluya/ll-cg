'use client';

import { useEffect, useRef, useState } from 'react';

export interface PortfolioRealtimePoint {
  timestamp: string;
  totalValue: number;
}

export function usePortfolioRealtime(options?: { intervalMs?: number }) {
  const intervalMs = options?.intervalMs ?? 1000;

  const [points, setPoints] = useState<PortfolioRealtimePoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const res = await fetch('/api/portfolio/realtime');
        if (!res.ok) throw new Error('Failed to fetch portfolio realtime data');
        const payload = await res.json();
        if (!payload?.success) throw new Error(payload?.error || 'Failed to fetch portfolio realtime data');
        setPoints(payload.data.points || []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    };

    fetchPoints();

    timerRef.current = setInterval(() => {
      fetchPoints();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [intervalMs]);

  return { points, error };
}
