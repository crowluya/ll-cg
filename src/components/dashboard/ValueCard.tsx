'use client';

import React from 'react';
import { formatCurrency, formatPercent } from '@/lib/mock/portfolio-data';

export interface ModelSummary {
  name: string;
  currentValue: number;
  change: number;
  changePercent: number;
  color: string;
  icon: string;
}

interface ValueCardProps {
  model: ModelSummary;
}

export function ValueCard({ model }: ValueCardProps) {
  const isPositive = model.changePercent >= 0;

  return (
    <div
      className="relative overflow-hidden rounded-xl p-4 text-white shadow-lg transition-transform hover:scale-[1.02]"
      style={{ backgroundColor: model.color }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/30" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/20" />
      </div>

      {/* Content */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl" role="img" aria-label="icon">
            {model.icon}
          </span>
          <span className="text-sm font-medium opacity-90">{model.name}</span>
        </div>

        <div className="text-2xl font-bold tracking-tight mb-1">
          {formatCurrency(model.currentValue)}
        </div>

        <div className="flex items-center gap-1 text-sm opacity-90">
          <span>{isPositive ? '↑' : '↓'}</span>
          <span>{formatPercent(Math.abs(model.changePercent))}</span>
          <span className="opacity-75">
            ({formatCurrency(Math.abs(model.change))})
          </span>
        </div>
      </div>
    </div>
  );
}

interface ValueCardGridProps {
  models: ModelSummary[];
}

export function ValueCardGrid({ models }: ValueCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {models.map((model) => (
        <ValueCard key={model.name} model={model} />
      ))}
    </div>
  );
}

/**
 * Compact value label for inline display
 */
export function CompactValueLabel({ model }: ValueCardProps) {
  const isPositive = model.changePercent >= 0;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium shadow-md"
      style={{ backgroundColor: model.color }}
    >
      <span className="text-base" role="img" aria-label="icon">
        {model.icon}
      </span>
      <span>{formatCurrency(model.currentValue)}</span>
      <span className={`text-xs ${isPositive ? 'text-green-200' : 'text-red-200'}`}>
        {isPositive ? '+' : ''}
        {model.changePercent.toFixed(2)}%
      </span>
    </div>
  );
}
