'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { formatCurrency } from '@/lib/mock/portfolio-data';

export interface PortfolioTotalPoint {
  timestamp: string;
  totalValue: number | null;
}

function formatTimeLabel(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function shouldShowLabel(label: string, index: number, total: number): boolean {
  if (index === 0 || index === total - 1) return true;
  const parts = label.split(':');
  if (parts.length < 2) return false;
  const second = parts.length >= 3 ? Number(parts[2]) : 0;
  return second === 0 || second === 30;
}

export function PortfolioTotalChart(props: {
  points: PortfolioTotalPoint[];
  height?: string | number;
}) {
  const { points, height = '420px' } = props;

  const chartOption = useMemo<EChartsOption>(() => {
    const x = points.map((p) => formatTimeLabel(p.timestamp));
    const y = points.map((p) => p.totalValue);

    const numeric = points
      .map((p) => p.totalValue)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

    const base = numeric.length ? numeric[0] : 0;
    const minValue = base ? base * 0.8 : 0;
    const maxValue = base ? base * 1.2 : 1;

    return {
      backgroundColor: 'transparent',
      grid: {
        left: '56px',
        right: '56px',
        top: '18px',
        bottom: '56px',
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: x,
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: {
          color: '#6B7280',
          fontSize: 11,
          hideOverlap: true,
          interval: 0,
          formatter: (value: string, idx: number) => {
            return shouldShowLabel(value, idx, x.length) ? value : '';
          },
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: minValue,
        max: maxValue,
        axisLine: { show: false },
        axisLabel: {
          color: '#6B7280',
          fontSize: 12,
          formatter: (value: number) => {
            if (value >= 10000) return (value / 10000).toFixed(1) + '万';
            return value.toFixed(0);
          },
        },
        splitLine: {
          lineStyle: {
            color: '#E5E7EB',
            type: 'dashed',
            opacity: 0.6,
          },
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        textStyle: { color: '#1F2937' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || !params.length) return '';
          const p = params[0];
          if (p?.data == null) return '';
          const time = p.axisValue;
          const value = formatCurrency(p.data);
          return `
            <div style="margin-bottom: 6px; font-weight: 600;">${time}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #2563EB;"></span>
              <span style="color: #6B7280;">组合总和:</span>
              <span style="font-weight: 600;">${value}</span>
            </div>
          `;
        },
      },
      series: [
        {
          name: '组合总和',
          type: 'line',
          data: y,
          smooth: false,
          symbol: 'none',
          connectNulls: false,
          lineStyle: { color: '#2563EB', width: 2.5 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#2563EB22' },
                { offset: 1, color: '#2563EB00' },
              ],
            },
          },
        },
      ],
    };
  }, [points]);

  return (
    <div className="w-full">
      <ReactECharts option={chartOption} style={{ height, width: '100%' }} opts={{ renderer: 'canvas' }} />
    </div>
  );
}
