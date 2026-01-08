'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PortfolioIntradayHolding {
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

export interface PortfolioIntradayData {
  holdings: PortfolioIntradayHolding[];
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

export interface RefreshConfig {
  autoRefresh: boolean;
  interval: number;
}

export function usePortfolioIntraday(options?: {
  initialRefreshConfig?: RefreshConfig;
}) {
  const initialRefreshConfig = options?.initialRefreshConfig ?? { autoRefresh: true, interval: 3 };

  const [data, setData] = useState<PortfolioIntradayData | null>(null);
  const [refreshConfig, setRefreshConfig] = useState<RefreshConfig>(initialRefreshConfig);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | undefined>();
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch('/api/portfolio/intraday');
      if (!response.ok) {
        throw new Error('Failed to fetch intraday portfolio data');
      }
      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch intraday portfolio data');
      }
      setData(payload.data);
      setLastUpdateTime(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refreshConfig.autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, refreshConfig.interval * 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshConfig.autoRefresh, refreshConfig.interval, fetchData]);

  return {
    data,
    refreshConfig,
    setRefreshConfig,
    refresh,
    isRefreshing,
    lastUpdateTime,
    error,
  };
}
