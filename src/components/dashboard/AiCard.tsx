/**
 * AI 卡片组件
 * Phase 7.2: 实现 AI 卡片组件
 * 
 * 显示单个AI模型的账户状态，包括：
 * - 总资产
 * - 今日盈亏
 * - 累计盈亏
 * - 当前持仓列表
 */

'use client';

import React, { useMemo } from 'react';
import type { Account } from '@/types';

interface AiCardProps {
  model: string;
  account: Account;
  onClick?: () => void;
}

/**
 * 格式化货币金额
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value).replace('¥', '¥');
}

/**
 * 格式化百分比
 */
function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/**
 * 获取盈亏颜色类名（中国股市习惯：红涨绿跌）
 */
function getProfitColorClass(value: number): string {
  if (value > 0) return 'text-red-600';
  if (value < 0) return 'text-green-600';
  return 'text-gray-600';
}

export function AiCard({ model, account, onClick }: AiCardProps) {
  // 按市值从大到小排序持仓
  const sortedPositions = useMemo(() => {
    return [...account.positions].sort((a, b) => b.marketValue - a.marketValue);
  }, [account.positions]);

  const profitColorClass = getProfitColorClass(account.profit);
  const dailyProfitColorClass = getProfitColorClass(account.dailyProfit);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
      role="button"
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{model}</h3>
        <div className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
          运行中
        </div>
      </div>

      {/* 总资产 */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-1">总资产</div>
        <div className="text-2xl font-bold text-gray-900 tabular-nums">
          {formatCurrency(account.totalValue)}
        </div>
      </div>

      {/* 盈亏信息 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* 今日盈亏 */}
        <div>
          <div className="text-xs text-gray-500 mb-1">今日盈亏</div>
          <div className={`text-sm font-semibold tabular-nums ${dailyProfitColorClass}`}>
            {account.dailyProfit >= 0 ? '+' : ''}{formatCurrency(account.dailyProfit)}
          </div>
          <div className={`text-xs tabular-nums ${dailyProfitColorClass}`}>
            {formatPercent(account.dailyProfitRate)}
          </div>
        </div>

        {/* 累计盈亏 */}
        <div>
          <div className="text-xs text-gray-500 mb-1">累计盈亏</div>
          <div className={`text-sm font-semibold tabular-nums ${profitColorClass}`}>
            {account.profit >= 0 ? '+' : ''}{formatCurrency(account.profit)}
          </div>
          <div className={`text-xs tabular-nums ${profitColorClass}`}>
            {formatPercent(account.profitRate)}
          </div>
        </div>
      </div>

      {/* 持仓列表 */}
      <div className="border-t border-gray-100 pt-4">
        <div className="text-xs text-gray-500 mb-2">当前持仓</div>
        
        {sortedPositions.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">
            暂无持仓
          </div>
        ) : (
          <div className="space-y-2">
            {sortedPositions.map((position) => {
              const positionProfitColor = getProfitColorClass(position.profit);
              
              return (
                <div
                  key={position.stock}
                  data-testid="holding-item"
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{position.stockName}</div>
                    <div className="text-xs text-gray-500">
                      {position.quantity}股 · 成本¥{position.avgPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 tabular-nums">
                      {formatCurrency(position.marketValue)}
                    </div>
                    <div className={`text-xs tabular-nums ${positionProfitColor}`}>
                      {position.profit >= 0 ? '+' : ''}{position.profitRate.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-gray-500">现金：</span>
          <span className="font-medium text-gray-900 tabular-nums">
            {formatCurrency(account.cash)}
          </span>
        </div>
        <div>
          <span className="text-gray-500">市值：</span>
          <span className="font-medium text-gray-900 tabular-nums">
            {formatCurrency(account.marketValue)}
          </span>
        </div>
      </div>
    </button>
  );
}

/**
 * AI 卡片网格容器
 */
interface AiCardGridProps {
  accounts: Array<{ model: string; account: Account }>;
  onCardClick?: (agentId: string) => void;
}

export function AiCardGrid({ accounts, onCardClick }: AiCardGridProps) {
  // 按收益率排序
  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => b.account.profitRate - a.account.profitRate);
  }, [accounts]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedAccounts.map(({ model, account }) => (
        <AiCard
          key={account.agentId}
          model={model}
          account={account}
          onClick={() => onCardClick?.(account.agentId)}
        />
      ))}
    </div>
  );
}
