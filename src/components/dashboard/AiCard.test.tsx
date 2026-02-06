/**
 * AI 卡片组件测试
 * Phase 7.1: 测试 AI 卡片数据
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiCard } from './AiCard';
import type { Account } from '@/types';

describe('AiCard', () => {
  const mockAccount: Account = {
    agentId: 'deepseek-1',
    initialCapital: 100000,
    cash: 50000,
    positions: [
      {
        stock: 'sh600519',
        stockName: '贵州茅台',
        quantity: 100,
        avgPrice: 1800,
        currentPrice: 1850,
        buyDate: '2025-02-01',
        availableToday: 100,
        marketValue: 185000,
        profit: 5000,
        profitRate: 2.78,
      },
      {
        stock: 'sz000001',
        stockName: '平安银行',
        quantity: 1000,
        avgPrice: 12.5,
        currentPrice: 12.8,
        buyDate: '2025-02-02',
        availableToday: 1000,
        marketValue: 12800,
        profit: 300,
        profitRate: 2.4,
      },
    ],
    totalValue: 247800,
    marketValue: 197800,
    profit: 147800,
    profitRate: 147.8,
    dailyProfit: 5300,
    dailyProfitRate: 2.18,
  };

  describe('基础渲染', () => {
    it('应该正确渲染账户信息', () => {
      render(<AiCard model="DeepSeek" account={mockAccount} />);

      // 检查模型名称
      expect(screen.getByText('DeepSeek')).toBeInTheDocument();

      // 检查总资产
      expect(screen.getByText(/247,800/)).toBeInTheDocument();

      // 检查今日盈亏
      expect(screen.getByText(/5,300/)).toBeInTheDocument();

      // 检查累计盈亏
      expect(screen.getByText(/147,800/)).toBeInTheDocument();
    });

    it('应该显示持仓列表', () => {
      render(<AiCard model="DeepSeek" account={mockAccount} />);

      // 检查持仓股票名称
      expect(screen.getByText('贵州茅台')).toBeInTheDocument();
      expect(screen.getByText('平安银行')).toBeInTheDocument();

      // 检查持仓数量
      expect(screen.getByText(/100/)).toBeInTheDocument();
      expect(screen.getByText(/1000/)).toBeInTheDocument();
    });
  });

  describe('收益率颜色', () => {
    it('盈利时应该显示红色（中国股市习惯）', () => {
      render(<AiCard model="DeepSeek" account={mockAccount} />);

      const profitElement = screen.getByText(/\+147,800/);
      expect(profitElement).toHaveClass('text-red-600');
    });

    it('亏损时应该显示绿色（中国股市习惯）', () => {
      const lossAccount: Account = {
        ...mockAccount,
        profit: -10000,
        profitRate: -10,
        dailyProfit: -2000,
        dailyProfitRate: -2,
      };

      render(<AiCard model="DeepSeek" account={lossAccount} />);

      const profitElement = screen.getByText(/-10,000/);
      expect(profitElement).toHaveClass('text-green-600');
    });

    it('持平时应该显示灰色', () => {
      const flatAccount: Account = {
        ...mockAccount,
        profit: 0,
        profitRate: 0,
        dailyProfit: 0,
        dailyProfitRate: 0,
      };

      render(<AiCard model="DeepSeek" account={flatAccount} />);

      const profitElement = screen.getByText(/0\.00/);
      expect(profitElement).toHaveClass('text-gray-600');
    });
  });

  describe('持仓排序', () => {
    it('应该按市值从大到小排序', () => {
      render(<AiCard model="DeepSeek" account={mockAccount} />);

      const holdings = screen.getAllByTestId('holding-item');
      
      // 第一个应该是贵州茅台（市值185000）
      expect(holdings[0]).toHaveTextContent('贵州茅台');
      
      // 第二个应该是平安银行（市值12800）
      expect(holdings[1]).toHaveTextContent('平安银行');
    });
  });

  describe('空持仓状态', () => {
    it('无持仓时应该显示提示信息', () => {
      const emptyAccount: Account = {
        ...mockAccount,
        positions: [],
        marketValue: 0,
        totalValue: 100000,
      };

      render(<AiCard model="DeepSeek" account={emptyAccount} />);

      expect(screen.getByText(/暂无持仓/)).toBeInTheDocument();
    });
  });

  describe('点击事件', () => {
    it('点击卡片时应该触发onClick回调', () => {
      const handleClick = vi.fn();
      
      render(<AiCard model="DeepSeek" account={mockAccount} onClick={handleClick} />);

      const card = screen.getByRole('button');
      card.click();

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('格式化显示', () => {
    it('应该正确格式化货币金额', () => {
      render(<AiCard model="DeepSeek" account={mockAccount} />);

      // 检查千位分隔符
      expect(screen.getByText(/247,800/)).toBeInTheDocument();
      expect(screen.getByText(/185,000/)).toBeInTheDocument();
    });

    it('应该正确格式化百分比', () => {
      render(<AiCard model="DeepSeek" account={mockAccount} />);

      // 检查百分比显示
      expect(screen.getByText(/147\.80%/)).toBeInTheDocument();
      expect(screen.getByText(/2\.18%/)).toBeInTheDocument();
    });
  });
});
