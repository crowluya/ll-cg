'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HistoryPage() {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [positions, setPositions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);

  const models = ['deepseek', 'gemini', 'claude'];

  useEffect(() => {
    // 加载历史数据
    if (selectedModel) {
      fetchHistoryData(selectedModel);
    }
  }, [selectedModel]);

  const fetchHistoryData = async (model: string) => {
    try {
      const [posRes, tradeRes, decisionRes] = await Promise.all([
        fetch(`/api/history/positions?model=${model}`),
        fetch(`/api/history/trades?model=${model}`),
        fetch(`/api/history/decisions?model=${model}`),
      ]);

      const posData = await posRes.json();
      const tradeData = await tradeRes.json();
      const decisionData = await decisionRes.json();

      setPositions(posData.success ? posData.data : []);
      setTrades(tradeData.success ? tradeData.data : []);
      setDecisions(decisionData.success ? decisionData.data : []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">历史记录</h1>
            <p className="text-gray-600 mt-1">查询历史持仓、交易和AI决策记录</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
            返回首页
          </Link>
        </header>

        {/* 筛选器 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="font-medium">选择模型:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">全部</option>
              {models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">历史持仓</p>
            <p className="text-2xl font-bold">{positions.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">交易记录</p>
            <p className="text-2xl font-bold">{trades.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">AI决策</p>
            <p className="text-2xl font-bold">{decisions.length}</p>
          </div>
        </div>

        {/* 交易记录表格 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">交易记录</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">日期</th>
                  <th className="px-4 py-2 text-left">模型</th>
                  <th className="px-4 py-2 text-left">类型</th>
                  <th className="px-4 py-2 text-left">股票</th>
                  <th className="px-4 py-2 text-right">价格</th>
                  <th className="px-4 py-2 text-right">数量</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 20).map((trade, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{trade.date}</td>
                    <td className="px-4 py-2">{trade.model}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        trade.type === 'buy' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {trade.type === 'buy' ? '买入' : '卖出'}
                      </span>
                    </td>
                    <td className="px-4 py-2">{trade.stock}</td>
                    <td className="px-4 py-2 text-right">¥{Number(trade.price).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">{trade.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI决策记录 */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">AI决策记录</h2>
          <div className="space-y-4">
            {decisions.slice(0, 10).map((decision, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">{decision.model}</span>
                  <span className="text-sm text-gray-500">{new Date(decision.decision_time || decision.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600">{decision.output_decision?.reason || decision.executionResult?.error || '无理由'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
