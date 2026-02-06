/**
 * IntradayChart 组件测试
 * Phase 7.5: 测试股票分时图
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntradayChart } from './IntradayChart';

// Mock echarts-for-react
vi.mock('echarts-for-react', () => ({
  default: ({ option, style }: any) => (
    <div data-testid="echarts-mock" data-option={JSON.stringify(option)} style={style}>
      ECharts Mock
    </div>
  ),
}));

describe('IntradayChart', () => {
  const mockIntradayData = [
    { timestamp: '2025-02-06T09:30:00Z', price: 100.0, volume: 1000 },
    { timestamp: '2025-02-06T10:00:00Z', price: 101.5, volume: 1500 },
    { timestamp: '2025-02-06T10:30:00Z', price: 99.8, volume: 1200 },
    { timestamp: '2025-02-06T11:00:00Z', price: 102.3, volume: 1800 },
    { timestamp: '2025-02-06T11:30:00Z', price: 101.0, volume: 1300 },
  ];

  const mockStockInfo = {
    code: 'sh600519',
    name: '贵州茅台',
    currentPrice: 101.0,
    change: 1.0,
    changePercent: 1.0,
    prevClose: 100.0,
  };

  describe('基础渲染', () => {
    it('应该正确渲染 ECharts 组件', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      expect(chart).toBeInTheDocument();
    });

    it('应该使用正确的高度', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
          height="400px"
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      expect(chart).toHaveStyle({ height: '400px' });
    });

    it('应该使用默认高度 300px', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      expect(chart).toHaveStyle({ height: '300px' });
    });
  });

  describe('ECharts 配置', () => {
    it('应该配置双 Y 轴（价格和成交量）', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      expect(option.yAxis).toHaveLength(2);
      expect(option.yAxis[0].type).toBe('value'); // 价格轴
      expect(option.yAxis[1].type).toBe('value'); // 成交量轴
    });

    it('应该创建价格线系列', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      const priceSeries = option.series.find((s: any) => s.name === '价格');
      expect(priceSeries).toBeDefined();
      expect(priceSeries.type).toBe('line');
      expect(priceSeries.yAxisIndex).toBe(0);
    });

    it('应该创建成交量柱状图系列', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      const volumeSeries = option.series.find((s: any) => s.name === '成交量');
      expect(volumeSeries).toBeDefined();
      expect(volumeSeries.type).toBe('bar');
      expect(volumeSeries.yAxisIndex).toBe(1);
    });

    it('应该根据涨跌设置价格线颜色', () => {
      const { rerender } = render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={{ ...mockStockInfo, changePercent: 2.0 }}
        />
      );

      let chart = screen.getByTestId('echarts-mock');
      let option = JSON.parse(chart.getAttribute('data-option') || '{}');
      let priceSeries = option.series.find((s: any) => s.name === '价格');
      
      // 上涨应该是红色
      expect(priceSeries.lineStyle.color).toBe('#ef4444');

      // 重新渲染为下跌
      rerender(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={{ ...mockStockInfo, changePercent: -2.0 }}
        />
      );

      chart = screen.getByTestId('echarts-mock');
      option = JSON.parse(chart.getAttribute('data-option') || '{}');
      priceSeries = option.series.find((s: any) => s.name === '价格');
      
      // 下跌应该是绿色
      expect(priceSeries.lineStyle.color).toBe('#22c55e');
    });

    it('应该配置 X 轴为时间类型', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      expect(option.xAxis.type).toBe('category');
      expect(option.xAxis.data).toHaveLength(5);
    });

    it('应该配置 tooltip', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      expect(option.tooltip).toBeDefined();
      expect(option.tooltip.trigger).toBe('axis');
    });

    it('应该配置 grid 布局', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      expect(option.grid).toBeDefined();
      expect(option.grid.left).toBeDefined();
      expect(option.grid.right).toBeDefined();
      expect(option.grid.top).toBeDefined();
      expect(option.grid.bottom).toBeDefined();
    });
  });

  describe('空数据状态', () => {
    it('应该处理空数据数组', () => {
      render(
        <IntradayChart
          data={[]}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      expect(option.xAxis.data).toHaveLength(0);
      expect(option.series[0].data).toHaveLength(0);
    });

    it('应该处理缺失的 stockInfo', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={undefined}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      expect(chart).toBeInTheDocument();
    });
  });

  describe('数据处理', () => {
    it('应该正确提取价格数据', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      const priceSeries = option.series.find((s: any) => s.name === '价格');
      expect(priceSeries.data).toEqual([100.0, 101.5, 99.8, 102.3, 101.0]);
    });

    it('应该正确提取成交量数据', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      const volumeSeries = option.series.find((s: any) => s.name === '成交量');
      expect(volumeSeries.data).toEqual([1000, 1500, 1200, 1800, 1300]);
    });

    it('应该正确格式化时间戳', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      expect(option.xAxis.data).toHaveLength(5);
      // 时间戳应该被格式化为时间字符串
      expect(option.xAxis.data[0]).toBeDefined();
    });
  });

  describe('价格轴范围', () => {
    it('应该以昨收价为中心计算 Y 轴范围', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      const priceAxis = option.yAxis[0];
      expect(priceAxis.min).toBeDefined();
      expect(priceAxis.max).toBeDefined();
      
      // Y 轴应该对称于昨收价
      const prevClose = mockStockInfo.prevClose;
      const range = priceAxis.max - priceAxis.min;
      const midPoint = (priceAxis.max + priceAxis.min) / 2;
      
      // 中点应该接近昨收价
      expect(Math.abs(midPoint - prevClose)).toBeLessThan(range * 0.1);
    });
  });

  describe('视觉样式', () => {
    it('应该为价格线设置平滑曲线', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      const priceSeries = option.series.find((s: any) => s.name === '价格');
      expect(priceSeries.smooth).toBe(true);
    });

    it('应该为价格线添加区域填充', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      const priceSeries = option.series.find((s: any) => s.name === '价格');
      expect(priceSeries.areaStyle).toBeDefined();
    });

    it('应该为成交量柱设置半透明样式', () => {
      render(
        <IntradayChart
          data={mockIntradayData}
          stockInfo={mockStockInfo}
        />
      );

      const chart = screen.getByTestId('echarts-mock');
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');

      const volumeSeries = option.series.find((s: any) => s.name === '成交量');
      expect(volumeSeries.itemStyle).toBeDefined();
      expect(volumeSeries.itemStyle.opacity).toBeLessThan(1);
    });
  });
});
