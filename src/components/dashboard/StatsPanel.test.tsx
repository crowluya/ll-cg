/**
 * StatsPanel 组件测试
 * Phase 7.7: 测试底部统计面板
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsPanel } from './StatsPanel';

describe('StatsPanel', () => {
  const mockStats = {
    todayTrades: 15,
    winRate: 65.5,
    maxDrawdown: 8.2,
  };

  const mockModelStats = [
    {
      modelId: 'deepseek',
      modelName: 'DeepSeek',
      todayTrades: 8,
      winRate: 70.0,
      maxDrawdown: 5.5,
    },
    {
      modelId: 'gemini',
      modelName: 'Gemini 2.0',
      todayTrades: 7,
      winRate: 61.0,
      maxDrawdown: 10.8,
    },
  ];

  describe('基础渲染', () => {
    it('应该正确渲染统计面板', () => {
      render(<StatsPanel stats={mockStats} />);

      expect(screen.getByText('今日操作')).toBeInTheDocument();
      expect(screen.getByText('胜率')).toBeInTheDocument();
      expect(screen.getByText('最大回撤')).toBeInTheDocument();
    });

    it('应该显示今日操作次数', () => {
      render(<StatsPanel stats={mockStats} />);

      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('次')).toBeInTheDocument();
    });

    it('应该显示胜率百分比', () => {
      render(<StatsPanel stats={mockStats} />);

      expect(screen.getByText('65.5%')).toBeInTheDocument();
    });

    it('应该显示最大回撤百分比', () => {
      render(<StatsPanel stats={mockStats} />);

      expect(screen.getByText('8.2%')).toBeInTheDocument();
    });
  });

  describe('按模型筛选', () => {
    it('应该支持按模型筛选统计', () => {
      render(
        <StatsPanel
          stats={mockStats}
          modelStats={mockModelStats}
          selectedModel="deepseek"
        />
      );

      // 应该显示 DeepSeek 的统计
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('70.0%')).toBeInTheDocument();
      expect(screen.getByText('5.5%')).toBeInTheDocument();
    });

    it('应该在未选择模型时显示全局统计', () => {
      render(
        <StatsPanel
          stats={mockStats}
          modelStats={mockModelStats}
          selectedModel={undefined}
        />
      );

      // 应该显示全局统计
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('65.5%')).toBeInTheDocument();
      expect(screen.getByText('8.2%')).toBeInTheDocument();
    });

    it('应该处理不存在的模型 ID', () => {
      render(
        <StatsPanel
          stats={mockStats}
          modelStats={mockModelStats}
          selectedModel="nonexistent"
        />
      );

      // 应该回退到全局统计
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  describe('胜率计算', () => {
    it('应该正确显示高胜率（>= 60%）', () => {
      render(<StatsPanel stats={{ ...mockStats, winRate: 75.0 }} />);

      const winRateElement = screen.getByText('75.0%');
      expect(winRateElement).toBeInTheDocument();
      // 高胜率应该有绿色样式
      expect(winRateElement.className).toContain('text-green');
    });

    it('应该正确显示低胜率（< 60%）', () => {
      render(<StatsPanel stats={{ ...mockStats, winRate: 45.0 }} />);

      const winRateElement = screen.getByText('45.0%');
      expect(winRateElement).toBeInTheDocument();
      // 低胜率应该有红色样式
      expect(winRateElement.className).toContain('text-red');
    });

    it('应该处理 0% 胜率', () => {
      render(<StatsPanel stats={{ ...mockStats, winRate: 0 }} />);

      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });

    it('应该处理 100% 胜率', () => {
      render(<StatsPanel stats={{ ...mockStats, winRate: 100 }} />);

      expect(screen.getByText('100.0%')).toBeInTheDocument();
    });
  });

  describe('最大回撤显示', () => {
    it('应该正确显示回撤百分比', () => {
      render(<StatsPanel stats={{ ...mockStats, maxDrawdown: 12.5 }} />);

      expect(screen.getByText('12.5%')).toBeInTheDocument();
    });

    it('应该为高回撤（>= 10%）添加警告样式', () => {
      render(<StatsPanel stats={{ ...mockStats, maxDrawdown: 15.0 }} />);

      const drawdownElement = screen.getByText('15.0%');
      expect(drawdownElement).toBeInTheDocument();
      // 高回撤应该有红色警告样式
      expect(drawdownElement.className).toContain('text-red');
    });

    it('应该为低回撤（< 10%）使用正常样式', () => {
      render(<StatsPanel stats={{ ...mockStats, maxDrawdown: 5.0 }} />);

      const drawdownElement = screen.getByText('5.0%');
      expect(drawdownElement).toBeInTheDocument();
      // 低回撤应该使用正常样式
      expect(drawdownElement.className).not.toContain('text-red');
    });

    it('应该处理 0% 回撤', () => {
      render(<StatsPanel stats={{ ...mockStats, maxDrawdown: 0 }} />);

      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });
  });

  describe('今日操作次数', () => {
    it('应该显示 0 次操作', () => {
      render(<StatsPanel stats={{ ...mockStats, todayTrades: 0 }} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('应该显示大量操作次数', () => {
      render(<StatsPanel stats={{ ...mockStats, todayTrades: 999 }} />);

      expect(screen.getByText('999')).toBeInTheDocument();
    });
  });

  describe('空数据状态', () => {
    it('应该处理缺失的统计数据', () => {
      render(<StatsPanel stats={undefined} />);

      // 应该显示默认值或占位符
      expect(screen.getByText('今日操作')).toBeInTheDocument();
    });

    it('应该处理空的模型统计列表', () => {
      render(
        <StatsPanel
          stats={mockStats}
          modelStats={[]}
          selectedModel="deepseek"
        />
      );

      // 应该回退到全局统计
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  describe('数据格式化', () => {
    it('应该格式化胜率为一位小数', () => {
      render(<StatsPanel stats={{ ...mockStats, winRate: 66.666 }} />);

      expect(screen.getByText('66.7%')).toBeInTheDocument();
    });

    it('应该格式化回撤为一位小数', () => {
      render(<StatsPanel stats={{ ...mockStats, maxDrawdown: 8.888 }} />);

      expect(screen.getByText('8.9%')).toBeInTheDocument();
    });
  });

  describe('响应式布局', () => {
    it('应该使用网格布局', () => {
      const { container } = render(<StatsPanel stats={mockStats} />);

      const panel = container.firstChild;
      expect(panel).toHaveClass('grid');
    });

    it('应该在桌面端显示三列', () => {
      const { container } = render(<StatsPanel stats={mockStats} />);

      const panel = container.firstChild;
      // 应该有 grid-cols-3 或类似的类
      expect(panel?.className).toMatch(/grid-cols/);
    });
  });
});
