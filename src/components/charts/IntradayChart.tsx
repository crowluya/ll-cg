'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

export interface IntradayPoint {
  timestamp: string;
  price: number;
  volume: number;
}

export interface StockInfo {
  code: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  prevClose: number;
}

interface IntradayChartProps {
  data: IntradayPoint[];
  stockInfo?: StockInfo;
  height?: string | number;
}

// 常量定义
const COLORS = {
  UP: '#ef4444',    // 红色 - 上涨
  DOWN: '#22c55e',  // 绿色 - 下跌
  VOLUME: '#94a3b8', // 灰蓝色 - 成交量
  GRID: '#E5E7EB',   // 灰色 - 网格线
  TEXT: '#6B7280',   // 灰色 - 文字
} as const;

const CHART_PADDING = {
  LEFT: '60px',
  RIGHT: '60px',
  TOP: '20px',
  BOTTOM: '40px',
} as const;

const PRICE_RANGE_MULTIPLIER = 1.1; // 价格轴范围扩展系数
const VOLUME_THRESHOLD = 10000; // 成交量显示阈值（万）

export function IntradayChart({
  data,
  stockInfo,
  height = '300px',
}: IntradayChartProps) {
  const chartOption = useMemo<EChartsOption>(() => {
    // 提取时间、价格、成交量数据
    const timestamps = data.map((p) => {
      const date = new Date(p.timestamp);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    });
    const prices = data.map((p) => p.price);
    const volumes = data.map((p) => p.volume);

    // 根据涨跌设置颜色
    const isUp = (stockInfo?.changePercent ?? 0) >= 0;
    const priceColor = isUp ? COLORS.UP : COLORS.DOWN;

    // 计算价格轴范围（以昨收价为中心）
    const prevClose = stockInfo?.prevClose ?? 100;
    let minPrice = Math.min(...prices);
    let maxPrice = Math.max(...prices);
    
    // 如果有数据，以昨收价为中心计算对称范围
    if (prices.length > 0) {
      const maxDeviation = Math.max(
        Math.abs(maxPrice - prevClose),
        Math.abs(minPrice - prevClose)
      );
      minPrice = prevClose - maxDeviation * PRICE_RANGE_MULTIPLIER;
      maxPrice = prevClose + maxDeviation * PRICE_RANGE_MULTIPLIER;
    }

    return {
      backgroundColor: 'transparent',
      grid: {
        left: CHART_PADDING.LEFT,
        right: CHART_PADDING.RIGHT,
        top: CHART_PADDING.TOP,
        bottom: CHART_PADDING.BOTTOM,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLine: { lineStyle: { color: COLORS.GRID } },
        axisLabel: {
          color: COLORS.TEXT,
          fontSize: 11,
          hideOverlap: true,
        },
        axisTick: { show: false },
      },
      yAxis: [
        {
          // 价格轴
          type: 'value',
          min: minPrice,
          max: maxPrice,
          position: 'left',
          axisLine: { show: false },
          axisLabel: {
            color: COLORS.TEXT,
            fontSize: 11,
            formatter: (value: number) => value.toFixed(2),
          },
          splitLine: {
            lineStyle: {
              color: COLORS.GRID,
              type: 'dashed',
              opacity: 0.6,
            },
          },
        },
        {
          // 成交量轴
          type: 'value',
          position: 'right',
          axisLine: { show: false },
          axisLabel: {
            color: COLORS.TEXT,
            fontSize: 11,
            formatter: (value: number) => {
              if (value >= VOLUME_THRESHOLD) {
                return (value / VOLUME_THRESHOLD).toFixed(1) + '万';
              }
              return value.toString();
            },
          },
          splitLine: { show: false },
        },
      ],
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
            const name = param.seriesName;
            const value = param.value;
            const formattedValue = name === '价格' 
              ? `¥${value.toFixed(2)}` 
              : value.toLocaleString();
            
            tooltip += `
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="color: #6B7280;">${name}:</span>
                <span style="font-weight: 600;">${formattedValue}</span>
              </div>
            `;
          });
          return tooltip;
        },
      },
      series: [
        {
          name: '价格',
          type: 'line',
          data: prices,
          yAxisIndex: 0,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: priceColor,
            width: 2,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: priceColor + '40' },
                { offset: 1, color: priceColor + '00' },
              ],
            },
          },
        },
        {
          name: '成交量',
          type: 'bar',
          data: volumes,
          yAxisIndex: 1,
          itemStyle: {
            color: COLORS.VOLUME,
            opacity: 0.5,
          },
        },
      ],
    };
  }, [data, stockInfo]);

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
