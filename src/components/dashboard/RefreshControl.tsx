'use client';

import React from 'react';

export interface RefreshConfig {
  autoRefresh: boolean;
  interval: number; // in seconds
}

interface RefreshControlProps {
  config: RefreshConfig;
  onConfigChange: (config: RefreshConfig) => void;
  onManualRefresh: () => void;
  isRefreshing?: boolean;
  lastUpdateTime?: Date;
}

const INTERVAL_OPTIONS = [
  { value: 1, label: '1秒' },
  { value: 3, label: '3秒' },
  { value: 5, label: '5秒' },
  { value: 10, label: '10秒' },
  { value: 30, label: '30秒' },
  { value: 60, label: '1分钟' },
];

export function RefreshControl({
  config,
  onConfigChange,
  onManualRefresh,
  isRefreshing = false,
  lastUpdateTime,
}: RefreshControlProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Auto refresh toggle */}
      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={config.autoRefresh}
          onChange={(e) =>
            onConfigChange({ ...config, autoRefresh: e.target.checked })
          }
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <span>自动刷新</span>
      </label>

      {/* Interval selector */}
      <select
        value={config.interval}
        onChange={(e) =>
          onConfigChange({ ...config, interval: Number(e.target.value) })
        }
        disabled={!config.autoRefresh}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
      >
        {INTERVAL_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            每 {option.label}
          </option>
        ))}
      </select>

      {/* Manual refresh button */}
      <button
        onClick={onManualRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        <svg
          className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>{isRefreshing ? '刷新中...' : '立即刷新'}</span>
      </button>

      {/* Last update time */}
      {lastUpdateTime && (
        <span className="text-xs text-gray-400">
          上次更新: {lastUpdateTime.toLocaleTimeString('zh-CN')}
        </span>
      )}
    </div>
  );
}
