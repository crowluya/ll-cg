'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  generateMockPortfolioData,
  filterByTimeRange,
  type PortfolioData,
  type ModelSummary,
} from '@/lib/mock/portfolio-data';

export interface RefreshConfig {
  autoRefresh: boolean;
  interval: number;
}

export interface UseRealtimePortfolioOptions {
  initialTimeRange?: 'all' | '1d' | '72h' | '1w' | '1m';
  initialRefreshConfig?: RefreshConfig;
  useMockData?: boolean;
}

export function useRealtimePortfolio(
  options: UseRealtimePortfolioOptions = {}
) {
  const {
    initialTimeRange = 'all',
    initialRefreshConfig = { autoRefresh: true, interval: 3 },
    useMockData = true,
  } = options;

  const [data, setData] = useState<PortfolioData | null>(null);
  const [filteredData, setFilteredData] = useState<PortfolioData | null>(null);
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [refreshConfig, setRefreshConfig] = useState(initialRefreshConfig);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | undefined>();
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch portfolio data
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      if (useMockData) {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));
        const mockData = generateMockPortfolioData({
          initialAmount: 100000,
          days: 30,
          pointsPerDay: 8,
        });
        setData(mockData);
        setLastUpdateTime(new Date());
      } else {
        // Fetch from real API
        const response = await fetch('/api/portfolio/value');
        if (!response.ok) {
          throw new Error('Failed to fetch portfolio data');
        }
        const apiData = await response.json();
        setData(apiData);
        setLastUpdateTime(new Date());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRefreshing(false);
    }
  }, [useMockData]);

  // Manual refresh
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Filter data by time range
  useEffect(() => {
    if (data) {
      const filtered = filterByTimeRange(data, timeRange);
      setFilteredData(filtered);
    }
  }, [data, timeRange]);

  // Auto refresh
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

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get model configurations for chart
  const getModelConfigs = useCallback((): ModelSummary[] => {
    if (!filteredData) return [];
    return [filteredData.benchmark, filteredData.deepseek, filteredData.gemini];
  }, [filteredData]);

  return {
    data: filteredData,
    models: getModelConfigs(),
    timeRange,
    setTimeRange,
    refreshConfig,
    setRefreshConfig,
    refresh,
    isRefreshing,
    lastUpdateTime,
    error,
  };
}
