'use client';

import React from 'react';
import { formatCurrency, formatPercent } from '@/lib/mock/portfolio-data';
import type { PortfolioIntradayHolding } from '@/hooks/usePortfolioIntraday';
import { Sparkline } from '@/components/charts/Sparkline';

export function HoldingsPricePanel(props: { holdings: PortfolioIntradayHolding[] }) {
  const { holdings } = props;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">持仓股票</div>
          <div className="text-lg font-semibold text-gray-900">价格与持仓市值</div>
        </div>
        <div className="text-xs text-gray-500">共 {holdings.length} 只</div>
      </div>

      <div className="divide-y divide-gray-100">
        {holdings.map((h) => {
          const up = h.changePercent >= 0;
          const pnlUp = h.pnl >= 0;
          const dailyUp = h.dailyPnl >= 0;
          const sparkColor = up ? '#ef4444' : '#22c55e';

          return (
            <div key={h.code} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-gray-900 truncate">{h.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{h.code}</div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">持仓 {h.quantity.toLocaleString('zh-CN')} 股 · 成本 {h.cost.toFixed(3)}</div>
                </div>

                <div className="hidden sm:block">
                  <Sparkline values={h.intradayPrices} width={140} height={40} stroke={sparkColor} strokeWidth={2} />
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 tabular-nums">{h.price.toFixed(2)}</div>
                  <div className={`text-xs font-medium ${up ? 'text-red-600' : 'text-green-600'}`}>
                    {up ? '+' : ''}{formatPercent(h.changePercent, true)}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <div className="text-xs text-gray-500">市值</div>
                  <div className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(h.value)}</div>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <div className="text-xs text-gray-500">盈亏</div>
                  <div className={`text-sm font-semibold tabular-nums ${pnlUp ? 'text-red-600' : 'text-green-600'}`}>
                    {pnlUp ? '+' : ''}{formatCurrency(h.pnl)}
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <div className="text-xs text-gray-500">当日盈亏</div>
                  <div className={`text-sm font-semibold tabular-nums ${dailyUp ? 'text-red-600' : 'text-green-600'}`}>
                    {dailyUp ? '+' : ''}{formatCurrency(h.dailyPnl)}
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <div className="text-xs text-gray-500">盈亏率</div>
                  <div className={`text-sm font-semibold tabular-nums ${pnlUp ? 'text-red-600' : 'text-green-600'}`}>
                    {pnlUp ? '+' : ''}{h.pnlPercent.toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <div className="text-xs text-gray-500">昨收</div>
                  <div className="text-sm font-semibold text-gray-900 tabular-nums">{h.close.toFixed(2)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
