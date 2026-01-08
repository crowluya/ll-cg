'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { formatTimestamp, formatCurrency } from '@/lib/mock/portfolio-data';

export interface PortfolioDataPoint {
  timestamp: string;
  benchmark: number;
  deepseek: number;
  gemini: number;
}

export interface ModelConfig {
  key: 'benchmark' | 'deepseek' | 'gemini';
  name: string;
  color: string;
  currentValue: number;
  changePercent: number;
  icon: string;
}

interface PortfolioChartProps {
  dataPoints: PortfolioDataPoint[];
  models: ModelConfig[];
  timeRange: string;
  height?: string | number;
}

export function PortfolioChart({
  dataPoints,
  models,
  timeRange,
  height = '500px',
}: PortfolioChartProps) {
  const chartOption = useMemo<EChartsOption>(() => {
    const timestamps = dataPoints.map((p) => formatTimestamp(p.timestamp, timeRange));

    // Find min and max values for Y-axis
    const allValues = dataPoints.flatMap((p) => [p.benchmark, p.deepseek, p.gemini]);
    const minValue = Math.floor(Math.min(...allValues) * 0.95);
    const maxValue = Math.ceil(Math.max(...allValues) * 1.05);

    return {
      backgroundColor: 'transparent',
      grid: {
        left: '80px',
        right: '150px', // Leave space for labels on the right
        top: '20px',
        bottom: '60px',
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: {
          color: '#6B7280',
          fontSize: 11,
          rotate: timeRange === 'all' ? 0 : 0,
          hideOverlap: true,
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
            if (value >= 10000) {
              return (value / 10000).toFixed(0) + '万';
            }
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
          if (!Array.isArray(params)) return '';
          const time = params[0].axisValue;
          let tooltip = `<div style="margin-bottom: 6px; font-weight: 600;">${time}</div>`;
          params.forEach((param: any) => {
            const color = param.color;
            const name = param.seriesName;
            const value = formatCurrency(param.value);
            tooltip += `
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span>
                <span style="color: #6B7280;">${name}:</span>
                <span style="font-weight: 600;">${value}</span>
              </div>
            `;
          });
          return tooltip;
        },
      },
      series: models.map((model) => {
        const data = dataPoints.map((p) => p[model.key]);
        const isPositive = model.changePercent >= 0;

        return {
          name: model.name,
          type: 'line',
          data,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: model.color,
            width: 2.5,
          },
          areaStyle: model.key === 'benchmark' ? undefined : {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: model.color + '20' },
                { offset: 1, color: model.color + '00' },
              ],
            },
          },
          // Label on the right side
          markLine: model.key === 'benchmark' ? undefined : {
            silent: true,
            symbol: 'none',
            label: {
              show: true,
              position: 'end',
              formatter: () => model.icon + ' ' + model.name,
              fontSize: 12,
              color: '#374151',
              backgroundColor: model.color + '20',
              padding: [6, 10],
              borderRadius: 16,
            },
            data: [{ type: 'max', label: { show: false } }],
          },
        };
      }),
    };
  }, [dataPoints, models, timeRange]);

  return (
    <div className="w-full">
      <ReactECharts
        option={chartOption}
        style={{ height, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}

/**
 * Right-side value labels component
 */
export function ValueLabels({ models }: { models: ModelConfig[] }) {
  return (
    <div className="flex flex-col gap-3 absolute right-4 top-4">
      {models.map((model) => (
        <div
          key={model.key}
          className="flex items-center gap-2 px-3 py-2 rounded-full text-white font-semibold text-sm shadow-lg"
          style={{ backgroundColor: model.color }}
        >
          <span className="text-base">{model.icon}</span>
          <span>{formatCurrency(model.currentValue)}</span>
        </div>
      ))}
    </div>
  );
}
