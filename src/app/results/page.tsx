'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { BacktestResult } from '@/types';

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    const resultsParam = searchParams.get('results');
    const summaryParam = searchParams.get('summary');

    if (resultsParam) {
      try {
        setResults(JSON.parse(resultsParam));
      } catch (e) {
        console.error('Failed to parse results:', e);
      }
    }

    if (summaryParam) {
      try {
        setSummary(JSON.parse(summaryParam));
      } catch (e) {
        console.error('Failed to parse summary:', e);
      }
    }
  }, [searchParams]);

  if (results.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">无回测结果</h1>
          <p className="text-gray-600 mb-8">请先在首页运行回测</p>
          <Link href="/" className="text-blue-600 hover:underline">返回首页</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">回测结果</h1>
            <p className="text-gray-600 mt-1">各模型盈亏对比与详细分析</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
            返回首页
          </Link>
        </header>

        {/* 汇总卡片 */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">模型数量</p>
              <p className="text-2xl font-bold">{summary.totalModels}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">总交易次数</p>
              <p className="text-2xl font-bold">{summary.totalTrades}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">盈利模型</p>
              <p className="text-2xl font-bold text-green-600">{summary.profitableModels}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">最佳模型</p>
              <p className="text-lg font-bold text-blue-600">{summary.bestModel}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">平均盈亏率</p>
              <p className={`text-2xl font-bold ${summary.avgProfitRate >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summary.avgProfitRate >= 0 ? '+' : ''}{summary.avgProfitRate.toFixed(2)}%
              </p>
            </div>
          </div>
        )}

        {/* 结果卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {results.map((result, index) => (
            <div key={result.model} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{result.model}</h3>
                  <p className="text-sm text-gray-500">排名 #{index + 1}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  result.profit >= 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {result.profit >= 0 ? '盈利' : '亏损'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">最终资产</span>
                  <span className="font-medium">¥{result.finalValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总盈亏</span>
                  <span className={`font-medium ${result.profit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ¥{result.profit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">盈亏率</span>
                  <span className={`font-medium ${result.profitRate >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {result.profitRate >= 0 ? '+' : ''}{result.profitRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">胜率</span>
                  <span className="font-medium">{(result.winRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">交易次数</span>
                  <span className="font-medium">{result.trades.length}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 交易记录 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">交易记录</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">模型</th>
                  <th className="px-4 py-2 text-left">日期</th>
                  <th className="px-4 py-2 text-left">类型</th>
                  <th className="px-4 py-2 text-left">股票</th>
                  <th className="px-4 py-2 text-right">价格</th>
                  <th className="px-4 py-2 text-right">数量</th>
                  <th className="px-4 py-2 text-right">金额</th>
                </tr>
              </thead>
              <tbody>
                {results.flatMap(result =>
                  result.trades.map(trade => ({ ...trade, model: result.model }))
                ).slice(0, 50).map((trade, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{trade.model}</td>
                    <td className="px-4 py-2">{trade.date}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        trade.type === 'buy' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {trade.type === 'buy' ? '买入' : '卖出'}
                      </span>
                    </td>
                    <td className="px-4 py-2">{trade.stock}</td>
                    <td className="px-4 py-2 text-right">¥{trade.price.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">{trade.quantity}</td>
                    <td className="px-4 py-2 text-right">¥{(trade.price * trade.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
