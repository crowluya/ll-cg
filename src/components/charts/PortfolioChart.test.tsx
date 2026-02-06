/**
 * PortfolioChart 组件测试
 * Phase 7.3: 测试资产曲线图
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortfolioChart } from './PortfolioChart';

// Mock echarts-for-react
vi.mock('echarts-for-react', () => ({
  default: ({ option, style }: any) => (
    <div data-testid="echarts-mock" data-option={JSON.stringify(option)} style={style}>
      ECharts Mock
    </div>
  ),
}));

// Mock formatTimestamp and formatCurrency
vi.mock('@/lib/mock/portfolio-data', () => ({
  formatTimestamp: (timestamp: string, timeRange: string) => {
    const date = new Date(timestamp);
    if (timeRange === '1d') {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('zh-CN');
  },
  formatCurrency: (value: number) => `¥${value.toLocaleString('zh-CN')}`,
}));

describe('PortfolioChart', () => {
  const mockDataPoints = [
    {
      timestamp: '2025-02-06T09:30:00Z',
      benchmark: 100000,
      deepseek: 100000,
      gemini: 100000,
    },
    {
      timestamp: '2025-02-06T10:00:00Z',
      benchmark: 100000,
      deepseek: 101000,
      gemini: 99500,
    },
    {
      timestamp: '2025-02-06T11:00:00Z',
      benchmark: 100000,
      deepseek: 102000,
      gemini: 99000,
    },
  ];

  const mockModels = [
    {
      key: 'benchmark' as const,
      name: '基准',
      color: '#9CA3AF',
      currentValue: 100000,
      changePercent: 0,
      icon: '📊',
    },
    {
      key: 'deepseek' as const,
      name: 'DeepSeek',
      color: '#3B82F6',
      currentValue: 102000,
      changePercent: 2.0,
      icon: '🤖',
    },
    {
      key: 'gemini' as const,
      name: 'Gemini',
      color: '#8B5CF6',
      currentValue: 99000,
      changePercent: -1.0,
      icon: '✨',
    },
  ];

  describe('基础渲染', () => {
    it('应该正确渲染 ECharts 组件', () => {
      render(
        <PortfolioChart
          dataPoints={mockDataPoints}
          models={mockModels}
          timeRange="1d"
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      expect(chart).toBeInTheDocument();
    });

    it('应该使用正确的高度', () => {
      render(
        <PortfolioChart
          dataPoints={mockDataPoints}
          models={mockModels}
          timeRange="1d"
          height="600px"
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      expect(chart).toHaveStyle({ height: '600px' });
    });

    it('应该使用默认高度 500px', () => {
      render(
        <PortfolioChart
          dataPoints={mockDataPoints}
          models={mockModels}
          timeRange="1d"
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      expect(chart).toHaveStyle({ height: '500px' });
    });
  });

  describe('ECharts 配置', () => {
    it('应该包含正确的 X 轴配置', () => {
      render(
        <PortfolioChart
          dataPoints={mockDataPoints}
          models={mockModels}
          timeRange="1d"
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      expect(option.xAxis).toBeDefined();
      expect(option.xAxis.type).toBe('category');
      expect(option.xAxis.data).toHaveLength(3);
    });

    it('应该包含正确的 Y 轴配置', () => {
      render(
        <PortfolioChart
          dataPoints={mockDataPoints}
          models={mockModels}
          timeRange="1d"
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      expect(option.yAxis).toBeDefined();
      expect(option.yAxis.type).toBe('value');
      expect(option.yAxis.min).toBeDefined();
      expect(option.yAxis.max).toBeDefined();
    });

    it('应该为每个模型创建一个系列', () => {
      render(
        <PortfolioChart
          dataPoints={mockDataPoints}
          models={mockModels}
          timeRange="1d"
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      expect(option.series).toHaveLength(3);
      expect(option.series[0].name).toBe('基准');
      expect(option.series[1].name).toBe('DeepSeek');
      expect(option.series[2].name).toBe('Gemini');
    });

    it('应该为每个系列设置正确的颜色', () => {
      render(
        <PortfolioChart
          dataPoints={mockDataPoints}
          models={mockModels}
          timeRange="1d"
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      expect(option.series[0].lineStyle.color).toBe('#9CA3AF');
      expect(option.series[1].lineStyle.color).toBe('#3B82F6');
      expect(option.series[2].lineStyle.color).toBe('#8B5CF6');
    });

    it('应该配置 tooltip', () => {
      render(
        <PortfolioChart
          dataPoints={mockDataPoints}
          models={mockModels}
          timeRange="1d"
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      expect(option.tooltip).toBeDefined();
      expect(option.tooltip.trigger).toBe('axis');
    });
  });

  describe('空数据状态', () => {
    it('应该处理空数据数组', () => {
      render(
        <PortfolioChart
          dataPoints={[]}
          models={mockModels}
          timeRange="1d"
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      expect(option.xAxis.data).toHaveLength(0);
      expect(option.series[0].data).toHaveLength(0);
    });

    it('应该处理空模型数组', () => {
      render(
        <PortfolioChart
          dataPoints={mockDataPoints}
          models={[]}
          timeRange="1d"
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      expect(option.series).toHaveLength(0);
    });
  });

  describe('数据计算', () => {
    it('应该正确计算 Y 轴最小值和最大值', () => {
      render(
        <PortfolioChart
          dataPoints={mockDataPoints}
          models={mockModels}
          timeRange="1d"
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      // 最小值应该是所有数据点的最小值 * 0.95
      // 最大值应该是所有数据点的最大值 * 1.05
      expect(option.yAxis.min).toBeLessThan(99000);
      expect(option.yAxis.max).toBeGreaterThan(102000);
    });

    it('应该正确提取每个模型的数据', () => {
      render(
        <PortfolioChart
          dataPoints={mockDataPoints}
          models={mockModels}
          timeRange="1d"
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      // DeepSeek 系列数据
      expect(option.series[1].data).toEqual([100000, 101000, 102000]);
      // Gemini 系列数据
      expect(option.series[2].data).toEqual([100000, 99500, 99000]);
    });
  });

  describe('时间范围', () => {
    it('应该根据时间范围格式化时间戳', () => {
      const { rerender } = render(
        <PortfolioChart
          dataPoints={mockDataPoints}
          models={mockModels}
          timeRange="1d"
        />
      );

      let chart = screen.getByTestId('echarts-mock');
      let option = JSON.parse(chart.getAttribute('data-option') || '{}');
      const timestamps1d = option.xAxis.data;

      // 重新渲染使用不同的时间范围
      rerender(
        <PortfolioChart
          dataPoints={mockDataPoints}
          models={mockModels}
          timeRange="all"
        />
      );

      chart = screen.getByTestId('echarts-mock');
      option = JSON.parse(chart.getAttribute('data-option') || '{}');
      const timestampsAll = option.xAxis.data;

      // 不同时间范围应该有不同的格式
      expect(timestamps1d).toBeDefined();
      expect(timestampsAll).toBeDefined();
    });
  });
});
