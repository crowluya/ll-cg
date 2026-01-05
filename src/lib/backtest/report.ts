import type { BacktestResult, StockData } from '@/types';

/**
 * 回测报告生成器
 */
export class BacktestReportGenerator {
  /**
   * 生成回测报告
   */
  generateReport(results: BacktestResult[]): string {
    const lines: string[] = [];

    lines.push('# 回测报告');
    lines.push('');
    lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
    lines.push(`模型数量: ${results.length}`);
    lines.push('');

    // 排名
    const sorted = [...results].sort((a, b) => b.profitRate - a.profitRate);

    lines.push('## 模型排名');
    lines.push('');
    lines.push('| 排名 | 模型 | 最终资产 | 盈亏 | 盈亏率 | 胜率 | 交易次数 |');
    lines.push('|------|------|----------|------|--------|------|----------|');

    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      lines.push(
        `| ${i + 1} | ${r.model} | ¥${r.finalValue.toFixed(2)} | ¥${r.profit.toFixed(2)} | ${r.profitRate.toFixed(2)}% | ${(r.winRate * 100).toFixed(1)}% | ${r.trades.length} |`
      );
    }

    lines.push('');

    // 详细分析
    for (const result of sorted) {
      lines.push(`## ${result.model} 详细分析`);
      lines.push('');
      lines.push(`- **初始资金**: ¥100,000.00`);
      lines.push(`- **最终资产**: ¥${result.finalValue.toFixed(2)}`);
      lines.push(`- **总盈亏**: ¥${result.profit.toFixed(2)} (${result.profitRate.toFixed(2)}%)`);
      lines.push(`- **胜率**: ${(result.winRate * 100).toFixed(2)}%`);
      lines.push(`- **交易次数**: ${result.trades.length}`);

      if (result.sharpeRatio !== undefined) {
        lines.push(`- **夏普比率**: ${result.sharpeRatio.toFixed(4)}`);
      }
      if (result.maxDrawdown !== undefined) {
        lines.push(`- **最大回撤**: ${(result.maxDrawdown * 100).toFixed(2)}%`);
      }

      lines.push('');

      // 最近交易
      const recentTrades = result.trades.slice(-10).reverse();
      if (recentTrades.length > 0) {
        lines.push('### 最近交易');
        lines.push('');
        lines.push('| 日期 | 类型 | 股票 | 价格 | 数量 | 金额 |');
        lines.push('|------|------|------|------|------|------|');

        for (const trade of recentTrades) {
          const amount = trade.price * trade.quantity;
          const type = trade.type === 'buy' ? '买入' : '卖出';
          lines.push(`| ${trade.date} | ${type} | ${trade.stock} | ¥${trade.price.toFixed(2)} | ${trade.quantity} | ¥${amount.toFixed(2)} |`);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 生成图表数据
   */
  generateChartData(results: BacktestResult[]): {
    profitRateChart: { model: string; value: number }[];
    tradeCountChart: { model: string; value: number }[];
    winRateChart: { model: string; value: number }[];
  } {
    const sorted = [...results].sort((a, b) => b.profitRate - a.profitRate);

    return {
      profitRateChart: sorted.map(r => ({ model: r.model, value: r.profitRate })),
      tradeCountChart: sorted.map(r => ({ model: r.model, value: r.trades.length })),
      winRateChart: sorted.map(r => ({ model: r.model, value: r.winRate * 100 })),
    };
  }

  /**
   * 生成资金曲线数据
   */
  generateFundCurveData(
    snapshots: Array<{ date: string; model: string; totalValue: number }>
  ): {
    dates: string[];
    series: Array<{ name: string; data: number[] }>;
  } {
    const models = [...new Set(snapshots.map(s => s.model))];
    const dates = [...new Set(snapshots.map(s => s.date))].sort();

    const series = models.map(model => {
      const modelSnapshots = snapshots
        .filter(s => s.model === model)
        .sort((a, b) => a.date.localeCompare(b.date));

      const data = dates.map(date => {
        const snapshot = modelSnapshots.find(s => s.date === date);
        return snapshot?.totalValue || 100000; // 默认初始资金
      });

      return { name: model, data };
    });

    return { dates, series };
  }

  /**
   * 生成K线图数据
   */
  generateKLineData(stockData: StockData[]): {
    dates: string[];
    values: number[][];
    ma5: number[];
    ma10: number[];
    ma20: number[];
  } {
    const dates = stockData.map(d => d.date);
    const values = stockData.map(d => [d.open, d.close, d.low, d.high]);

    // 计算均线
    const ma5: number[] = [];
    const ma10: number[] = [];
    const ma20: number[] = [];

    for (let i = 0; i < stockData.length; i++) {
      ma5.push(this.calculateMA(stockData, i, 5));
      ma10.push(this.calculateMA(stockData, i, 10));
      ma20.push(this.calculateMA(stockData, i, 20));
    }

    return { dates, values, ma5, ma10, ma20 };
  }

  private calculateMA(data: StockData[], index: number, period: number): number {
    if (index < period - 1) return NaN;
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[index - i].close;
    }
    return sum / period;
  }
}

/**
 * 计算回测指标
 */
export function calculateBacktestMetrics(trades: any[]): {
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  winRate: number;
  totalProfit: number;
  avgProfitPerTrade: number;
} {
  const buyTrades = trades.filter(t => t.type === 'buy').length;
  const sellTrades = trades.filter(t => t.type === 'sell').length;

  // 简化胜率计算
  const winRate = 0.5; // 实际需要配对买卖计算

  return {
    totalTrades: trades.length,
    buyTrades,
    sellTrades,
    winRate,
    totalProfit: 0,
    avgProfitPerTrade: 0,
  };
}

// 导出单例
export const reportGenerator = new BacktestReportGenerator();
