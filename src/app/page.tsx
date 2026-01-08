'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PortfolioTotalChart } from '@/components/charts/PortfolioTotalChart';
import { HoldingsPricePanel } from '@/components/portfolio/HoldingsPricePanel';
import { RefreshControl, type RefreshConfig } from '@/components/dashboard/RefreshControl';
import { ConfigModal, ConfigButton, type PortfolioConfig } from '@/components/dashboard/ConfigModal';
import { usePortfolioIntraday } from '@/hooks/usePortfolioIntraday';
import { usePortfolioRealtime } from '@/hooks/usePortfolioRealtime';
import { formatCurrency } from '@/lib/mock/portfolio-data';

type TimeRange = 'all' | '1d' | '72h' | '1w' | '1m';

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: '1d', label: '1天' },
  { value: '72h', label: '72小时' },
  { value: '1w', label: '1周' },
  { value: '1m', label: '1月' },
];

export default function HomePage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [refreshConfig, setRefreshConfig] = useState<RefreshConfig>({
    autoRefresh: true,
    interval: 3,
  });
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [portfolioConfig, setPortfolioConfig] = useState<PortfolioConfig>({
    initialAmount: 100000,
    deepseek: { initialAmount: 100000, enabled: true },
    gemini: { initialAmount: 100000, enabled: true },
  });

  const {
    data,
    refreshConfig: hookRefreshConfig,
    setRefreshConfig: setHookRefreshConfig,
    refresh,
    isRefreshing,
    lastUpdateTime,
    error,
  } = usePortfolioIntraday({
    initialRefreshConfig: refreshConfig,
  });

  const { points: realtimePoints, error: realtimeError } = usePortfolioRealtime({ intervalMs: 1000 });

  // Sync time range and refresh config
  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
  };

  const handleRefreshConfigChange = (newConfig: RefreshConfig) => {
    setRefreshConfig(newConfig);
    setHookRefreshConfig(newConfig);
  };

  const handleConfigSave = (newConfig: PortfolioConfig) => {
    setPortfolioConfig(newConfig);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">股</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">A股AI交易模拟平台</h1>
                <p className="text-xs text-gray-500">Portfolio Dashboard</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
              >
                总览
              </Link>
              <Link
                href="/backtest"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                回测
              </Link>
              <Link
                href="/live"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                实盘
              </Link>
              <Link
                href="/history"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                历史
              </Link>
            </nav>
          </div>
        </div>

        {/* Overview */}
        {data && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1">当日盈亏</div>
              <div
                className={`text-lg font-bold tabular-nums ${
                  data.total.dailyPnl >= 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {data.total.dailyPnl >= 0 ? '+' : ''}{formatCurrency(data.total.dailyPnl)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {data.total.dailyPnlPercent >= 0 ? '+' : ''}{data.total.dailyPnlPercent.toFixed(2)}%
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1">浮动盈亏</div>
              <div
                className={`text-lg font-bold tabular-nums ${
                  data.total.floatingPnl >= 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {data.total.floatingPnl >= 0 ? '+' : ''}{formatCurrency(data.total.floatingPnl)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {data.total.floatingPnlPercent >= 0 ? '+' : ''}{data.total.floatingPnlPercent.toFixed(2)}%
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1">总资产</div>
              <div className="text-lg font-bold text-gray-900 tabular-nums">
                {formatCurrency(data.total.totalAssets)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1">总市值</div>
              <div className="text-lg font-bold text-gray-900 tabular-nums">
                {formatCurrency(data.total.totalMarketValue)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1">可用资金</div>
              <div className="text-lg font-bold text-gray-900 tabular-nums">
                {formatCurrency(data.total.availableCash)}
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Title and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">总资产价值</h2>
            <p className="text-sm text-gray-500">各模型持仓价值对比</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {TIME_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTimeRangeChange(option.value)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    timeRange === option.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Refresh Control */}
            <RefreshControl
              config={hookRefreshConfig}
              onConfigChange={handleRefreshConfigChange}
              onManualRefresh={refresh}
              isRefreshing={isRefreshing}
              lastUpdateTime={lastUpdateTime}
            />

            {/* Config Button */}
            <ConfigButton onClick={() => setConfigModalOpen(true)} />
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
          {/* Error Message */}
          {(error || realtimeError) && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-3">
              <p className="text-sm text-red-600">{error || realtimeError}</p>
            </div>
          )}

          {/* Loading State */}
          {!data && !error && !realtimePoints.length && !realtimeError && (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-gray-500">加载数据中...</p>
              </div>
            </div>
          )}

          {/* Chart */}
          {(realtimePoints.length > 0 || data) && (
            <>
              <PortfolioTotalChart
                points={
                  realtimePoints.length
                    ? realtimePoints.map((p) => ({ timestamp: p.timestamp, totalValue: p.totalValue }))
                    : (data?.points ?? [])
                }
                height="500px"
              />
            </>
          )}
        </div>

        {/* Holdings prices */}
        {data && (
          <div className="mt-6">
            <HoldingsPricePanel holdings={data.holdings} />
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-500 mb-1">当日盈亏</div>
            <div className={`text-lg font-bold ${
              data?.total.dailyPnl != null && data.total.dailyPnl >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {data?.total.dailyPnl != null && data.total.dailyPnl >= 0 ? '+' : ''}
              {data?.total.dailyPnl != null ? `¥${data.total.dailyPnl.toFixed(2)}` : '--'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-500 mb-1">浮动盈亏</div>
            <div className={`text-lg font-bold ${
              data?.total.floatingPnl != null && data.total.floatingPnl >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {data?.total.floatingPnl != null && data.total.floatingPnl >= 0 ? '+' : ''}
              {data?.total.floatingPnl != null ? `¥${data.total.floatingPnl.toFixed(2)}` : '--'}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-500 mb-1">数据更新</div>
            <div className="text-lg font-bold text-gray-900">
              {lastUpdateTime?.toLocaleTimeString('zh-CN') || '--:--:--'}
            </div>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      <ConfigModal
        isOpen={configModalOpen}
        config={portfolioConfig}
        onSave={handleConfigSave}
        onClose={() => setConfigModalOpen(false)}
      />
    </main>
  );
}
