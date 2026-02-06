'use client';

import React, { useMemo } from 'react';

export interface Stats {
  todayTrades: number;
  winRate: number;
  maxDrawdown: number;
}

export interface ModelStats {
  modelId: string;
  modelName: string;
  todayTrades: number;
  winRate: number;
  maxDrawdown: number;
}

interface StatsPanelProps {
  stats?: Stats;
  modelStats?: ModelStats[];
  selectedModel?: string;
}

// 常量定义
const THRESHOLDS = {
  HIGH_WIN_RATE: 60,      // 高胜率阈值（%）
  HIGH_DRAWDOWN: 10,      // 高回撤阈值（%）
} as const;

const COLORS = {
  GOOD: 'text-green-600',   // 好的指标（高胜率）
  BAD: 'text-red-600',      // 差的指标（低胜率、高回撤）
  NEUTRAL: 'text-gray-700', // 中性指标
} as const;

export function StatsPanel({
  stats,
  modelStats = [],
  selectedModel,
}: StatsPanelProps) {
  // 根据选择的模型获取对应的统计数据
  const displayStats = useMemo(() => {
    if (!selectedModel || !modelStats.length) {
      return stats;
    }

    const modelStat = modelStats.find((m) => m.modelId === selectedModel);
    return modelStat || stats;
  }, [stats, modelStats, selectedModel]);

  // 默认值
  const todayTrades = displayStats?.todayTrades ?? 0;
  const winRate = displayStats?.winRate ?? 0;
  const maxDrawdown = displayStats?.maxDrawdown ?? 0;

  // 胜率颜色判断
  const winRateColor = winRate >= THRESHOLDS.HIGH_WIN_RATE ? COLORS.GOOD : COLORS.BAD;

  // 回撤颜色判断
  const drawdownColor = maxDrawdown >= THRESHOLDS.HIGH_DRAWDOWN ? COLORS.BAD : COLORS.NEUTRAL;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-white rounded-lg shadow">
      {/* 今日操作 */}
      <div className="flex flex-col items-center">
        <div className="text-sm text-gray-500 mb-2">今日操作</div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">{todayTrades}</span>
          <span className="text-sm text-gray-500">次</span>
        </div>
      </div>

      {/* 胜率 */}
      <div className="flex flex-col items-center">
        <div className="text-sm text-gray-500 mb-2">胜率</div>
        <div className={`text-3xl font-bold ${winRateColor}`}>
          {winRate.toFixed(1)}%
        </div>
      </div>

      {/* 最大回撤 */}
      <div className="flex flex-col items-center">
        <div className="text-sm text-gray-500 mb-2">最大回撤</div>
        <div className={`text-3xl font-bold ${drawdownColor}`}>
          {maxDrawdown.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
