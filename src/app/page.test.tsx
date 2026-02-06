/**
 * Dashboard 主页测试
 * Phase 7.9: 测试 Dashboard 页面集成
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock hooks
vi.mock('@/hooks/usePortfolioIntraday', () => ({
  usePortfolioIntraday: vi.fn(),
}));

vi.mock('@/hooks/usePortfolioRealtime', () => ({
  usePortfolioRealtime: vi.fn(),
}));

// Mock components
vi.mock('@/components/charts/PortfolioTotalChart', () => ({
  PortfolioTotalChart: ({ points }: any) => (
    <div data-testid="portfolio-total-chart">
      Portfolio Chart with {points.length} points
    </div>
  ),
}));

vi.mock('@/components/portfolio/HoldingsPricePanel', () => ({
  HoldingsPricePanel: ({ holdings }: any) => (
    <div data-testid="holdings-price-panel">
      Holdings: {holdings.length} items
    </div>
  ),
}));

vi.mock('@/components/dashboard/RefreshControl', () => ({
  RefreshControl: ({ config, onManualRefresh }: any) => (
    <button data-testid="refresh-control" onClick={onManualRefresh}>
      Refresh ({config.interval}s)
    </button>
  ),
}));

vi.mock('@/components/dashboard/ConfigModal', () => ({
  ConfigModal: ({ isOpen }: any) => (
    isOpen ? <div data-testid="config-modal">Config Modal</div> : null
  ),
  ConfigButton: ({ onClick }: any) => (
    <button data-testid="config-button" onClick={onClick}>
      Config
    </button>
  ),
}));

// Import after mocks
import HomePage from './page';
import { usePortfolioIntraday } from '@/hooks/usePortfolioIntraday';
import { usePortfolioRealtime } from '@/hooks/usePortfolioRealtime';

describe('HomePage (Dashboard)', () => {
  const mockIntradayData = {
    points: [
      { timestamp: '2025-02-06T09:30:00Z', totalValue: 100000 },
      { timestamp: '2025-02-06T10:00:00Z', totalValue: 101000 },
    ],
    holdings: [
      {
        code: 'sh600519',
        name: '贵州茅台',
        quantity: 100,
        costPrice: 1000,
        currentPrice: 1010,
      },
    ],
    total: {
      totalAssets: 101000,
      totalMarketValue: 101000,
      availableCash: 0,
      dailyPnl: 1000,
      dailyPnlPercent: 1.0,
      floatingPnl: 1000,
      floatingPnlPercent: 1.0,
    },
  };

  const mockRealtimePoints = [
    { timestamp: '2025-02-06T10:30:00Z', totalValue: 102000 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    (usePortfolioIntraday as any).mockReturnValue({
      data: mockIntradayData,
      refreshConfig: { autoRefresh: true, interval: 3 },
      setRefreshConfig: vi.fn(),
      refresh: vi.fn(),
      isRefreshing: false,
      lastUpdateTime: new Date('2025-02-06T10:30:00Z'),
      error: null,
    });

    (usePortfolioRealtime as any).mockReturnValue({
      points: mockRealtimePoints,
      error: null,
    });
  });

  describe('页面布局', () => {
    it('应该渲染 Header 导航栏', () => {
      render(<HomePage />);

      expect(screen.getByText('A股AI交易模拟平台')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Dashboard')).toBeInTheDocument();
    });

    it('应该渲染导航链接', () => {
      render(<HomePage />);

      expect(screen.getByText('总览')).toBeInTheDocument();
      expect(screen.getByText('回测')).toBeInTheDocument();
      expect(screen.getByText('实盘')).toBeInTheDocument();
      expect(screen.getByText('历史')).toBeInTheDocument();
    });

    it('应该渲染资产概览卡片', () => {
      render(<HomePage />);

      // 使用 getAllByText 因为有多个相同的标签
      expect(screen.getAllByText('当日盈亏').length).toBeGreaterThan(0);
      expect(screen.getAllByText('浮动盈亏').length).toBeGreaterThan(0);
      expect(screen.getByText('总资产')).toBeInTheDocument();
      expect(screen.getByText('总市值')).toBeInTheDocument();
      expect(screen.getByText('可用资金')).toBeInTheDocument();
    });

    it('应该渲染资产曲线图', () => {
      render(<HomePage />);

      expect(screen.getByTestId('portfolio-total-chart')).toBeInTheDocument();
    });

    it('应该渲染持仓价格面板', () => {
      render(<HomePage />);

      expect(screen.getByTestId('holdings-price-panel')).toBeInTheDocument();
    });
  });

  describe('数据获取', () => {
    it('应该调用 usePortfolioIntraday hook', () => {
      render(<HomePage />);

      expect(usePortfolioIntraday).toHaveBeenCalledWith({
        initialRefreshConfig: expect.objectContaining({
          autoRefresh: true,
          interval: 3,
        }),
      });
    });

    it('应该调用 usePortfolioRealtime hook', () => {
      render(<HomePage />);

      expect(usePortfolioRealtime).toHaveBeenCalledWith({
        intervalMs: 1000,
      });
    });

    it('应该优先显示实时数据', () => {
      render(<HomePage />);

      const chart = screen.getByTestId('portfolio-total-chart');
      expect(chart.textContent).toContain('1 points'); // 实时数据优先
    });

    it('应该在无实时数据时显示分时数据', () => {
      (usePortfolioRealtime as any).mockReturnValue({
        points: [],
        error: null,
      });

      render(<HomePage />);

      const chart = screen.getByTestId('portfolio-total-chart');
      expect(chart.textContent).toContain('2 points'); // 分时数据
    });
  });

  describe('时间范围选择', () => {
    it('应该渲染时间范围选择器', () => {
      render(<HomePage />);

      expect(screen.getByText('全部')).toBeInTheDocument();
      expect(screen.getByText('1天')).toBeInTheDocument();
      expect(screen.getByText('72小时')).toBeInTheDocument();
      expect(screen.getByText('1周')).toBeInTheDocument();
      expect(screen.getByText('1月')).toBeInTheDocument();
    });

    it('应该默认选中"全部"', () => {
      render(<HomePage />);

      const allButton = screen.getByText('全部');
      expect(allButton.className).toContain('bg-white');
    });
  });

  describe('刷新控制', () => {
    it('应该渲染刷新控制组件', () => {
      render(<HomePage />);

      expect(screen.getByTestId('refresh-control')).toBeInTheDocument();
    });

    it('应该显示配置按钮', () => {
      render(<HomePage />);

      expect(screen.getByTestId('config-button')).toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    it('应该在加载时显示加载指示器', () => {
      (usePortfolioIntraday as any).mockReturnValue({
        data: null,
        refreshConfig: { autoRefresh: true, interval: 3 },
        setRefreshConfig: vi.fn(),
        refresh: vi.fn(),
        isRefreshing: false,
        lastUpdateTime: null,
        error: null,
      });

      (usePortfolioRealtime as any).mockReturnValue({
        points: [],
        error: null,
      });

      render(<HomePage />);

      expect(screen.getByText('加载数据中...')).toBeInTheDocument();
    });
  });

  describe('错误处理', () => {
    it('应该显示分时数据错误', () => {
      (usePortfolioIntraday as any).mockReturnValue({
        data: null,
        refreshConfig: { autoRefresh: true, interval: 3 },
        setRefreshConfig: vi.fn(),
        refresh: vi.fn(),
        isRefreshing: false,
        lastUpdateTime: null,
        error: '获取分时数据失败',
      });

      render(<HomePage />);

      expect(screen.getByText('获取分时数据失败')).toBeInTheDocument();
    });

    it('应该显示实时数据错误', () => {
      (usePortfolioRealtime as any).mockReturnValue({
        points: [],
        error: '获取实时数据失败',
      });

      render(<HomePage />);

      expect(screen.getByText('获取实时数据失败')).toBeInTheDocument();
    });
  });

  describe('数据展示', () => {
    it('应该正确显示当日盈亏', () => {
      render(<HomePage />);

      // 应该显示正盈亏（红色）
      const dailyPnlElements = screen.getAllByText(/\+¥1,000\.00/);
      expect(dailyPnlElements.length).toBeGreaterThan(0);
    });

    it('应该正确显示浮动盈亏', () => {
      render(<HomePage />);

      const floatingPnlElements = screen.getAllByText(/\+¥1,000\.00/);
      expect(floatingPnlElements.length).toBeGreaterThan(0);
    });

    it('应该正确显示总资产', () => {
      render(<HomePage />);

      // 使用 getAllByText 因为可能有多个地方显示总资产
      const totalAssetElements = screen.getAllByText(/¥101,000\.00/);
      expect(totalAssetElements.length).toBeGreaterThan(0);
    });

    it('应该正确显示最后更新时间', () => {
      render(<HomePage />);

      // 应该显示时间
      const timeElements = screen.getAllByText(/\d{1,2}:\d{2}:\d{2}/);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe('响应式设计', () => {
    it('应该使用响应式网格布局', () => {
      const { container } = render(<HomePage />);

      const grids = container.querySelectorAll('.grid');
      expect(grids.length).toBeGreaterThan(0);
    });
  });
});
