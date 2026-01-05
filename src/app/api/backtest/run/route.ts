import { NextRequest, NextResponse } from 'next/server';
import { runBacktest } from '@/lib/backtest/runner';
import type { BacktestConfig } from '@/types';

/**
 * POST /api/backtest/run
 * 执行回测
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 解析和验证参数
    const {
      stocks,
      models,
      startDate,
      endDate,
      historyDays = 30,
      initialCapital = 100000,
    } = body as BacktestConfig;

    // 参数验证
    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供股票列表 (stocks)' },
        { status: 400 }
      );
    }

    if (!models || !Array.isArray(models) || models.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供模型列表 (models)' },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: '请提供开始日期 (startDate) 和结束日期 (endDate)' },
        { status: 400 }
      );
    }

    // 验证日期格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { success: false, error: '日期格式应为 YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // 验证日期范围
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return NextResponse.json(
        { success: false, error: '开始日期必须早于结束日期' },
        { status: 400 }
      );
    }

    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      return NextResponse.json(
        { success: false, error: '回测时间范围不能超过365天' },
        { status: 400 }
      );
    }

    // 执行回测
    const results = await runBacktest({
      stocks,
      models,
      startDate,
      endDate,
      historyDays,
      initialCapital,
    });

    // 转换 Map 为数组
    const resultsArray = Array.from(results.values());

    // 计算汇总
    const summary = {
      totalModels: resultsArray.length,
      totalTrades: resultsArray.reduce((sum, r) => sum + r.trades.length, 0),
      profitableModels: resultsArray.filter(r => r.profit > 0).length,
      bestModel: resultsArray.sort((a, b) => b.profitRate - a.profitRate)[0]?.model || null,
      worstModel: resultsArray.sort((a, b) => a.profitRate - b.profitRate)[0]?.model || null,
      avgProfitRate: resultsArray.reduce((sum, r) => sum + r.profitRate, 0) / resultsArray.length,
    };

    return NextResponse.json({
      success: true,
      config: {
        stocks,
        models,
        startDate,
        endDate,
        historyDays,
        initialCapital,
      },
      results: resultsArray,
      summary,
    });

  } catch (error) {
    console.error('Error in /api/backtest/run:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '回测执行失败',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/backtest/run
 * 获取回测API状态和配置
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    availableModels: ['deepseek', 'gemini', 'claude'],
    availableStocks: [
      { code: 'sh600000', name: '浦发银行' },
      { code: 'sh600036', name: '招商银行' },
      { code: 'sh600519', name: '贵州茅台' },
      { code: 'sz000001', name: '平安银行' },
      { code: 'sz000002', name: '万科A' },
      { code: 'sz300750', name: '宁德时代' },
    ],
    maxDaysRange: 365,
    defaultHistoryDays: 30,
    defaultInitialCapital: 100000,
  });
}
