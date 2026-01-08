'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PortfolioChart } from '@/components/charts/PortfolioChart';
import { ValueCardGrid, CompactValueLabel } from '@/components/dashboard/ValueCard';
import { RefreshControl, type RefreshConfig } from '@/components/dashboard/RefreshControl';
import { ConfigModal, ConfigButton, type PortfolioConfig } from '@/components/dashboard/ConfigModal';
import { useRealtimePortfolio } from '@/hooks/useRealtimePortfolio';

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
    models,
    setTimeRange: setHookTimeRange,
    refreshConfig: hookRefreshConfig,
    setRefreshConfig: setHookRefreshConfig,
    refresh,
    isRefreshing,
    lastUpdateTime,
    error,
  } = useRealtimePortfolio({
    initialTimeRange: timeRange,
    initialRefreshConfig: refreshConfig,
    useMockData: true,
  });

  // Sync time range and refresh config
  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange);
    setHookTimeRange(newRange);
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

        {/* Value Cards */}
        <div className="mb-6">
          <ValueCardGrid models={models} />
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {!data && !error && (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-gray-500">加载数据中...</p>
              </div>
            </div>
          )}

          {/* Chart */}
          {data && (
            <>
              <PortfolioChart
                dataPoints={data.dataPoints}
                models={[
                  {
                    key: 'benchmark',
                    name: data.benchmark.name,
                    color: data.benchmark.color,
                    currentValue: data.benchmark.currentValue,
                    changePercent: data.benchmark.changePercent,
                    icon: data.benchmark.icon,
                  },
                  {
                    key: 'deepseek',
                    name: data.deepseek.name,
                    color: data.deepseek.color,
                    currentValue: data.deepseek.currentValue,
                    changePercent: data.deepseek.changePercent,
                    icon: data.deepseek.icon,
                  },
                  {
                    key: 'gemini',
                    name: data.gemini.name,
                    color: data.gemini.color,
                    currentValue: data.gemini.currentValue,
                    changePercent: data.gemini.changePercent,
                    icon: data.gemini.icon,
                  },
                ]}
                timeRange={timeRange}
                height="500px"
              />
            </>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-500 mb-1">DeepSeek 收益率</div>
            <div className={`text-lg font-bold ${
              data?.deepseek.changePercent && data.deepseek.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {data?.deepseek.changePercent && data.deepseek.changePercent >= 0 ? '+' : ''}
              {data?.deepseek.changePercent?.toFixed(2) ?? '--'}%
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-sm text-gray-500 mb-1">Gemini 收益率</div>
            <div className={`text-lg font-bold ${
              data?.gemini.changePercent && data.gemini.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {data?.gemini.changePercent && data.gemini.changePercent >= 0 ? '+' : ''}
              {data?.gemini.changePercent?.toFixed(2) ?? '--'}%
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
