'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function BacktestPage() {
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>(['deepseek']);
  const [historyDays, setHistoryDays] = useState(30);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRunning, setIsRunning] = useState(false);

  const availableStocks = [
    { code: 'sh600000', name: '浦发银行' },
    { code: 'sh600036', name: '招商银行' },
    { code: 'sh600519', name: '贵州茅台' },
    { code: 'sh601318', name: '中国平安' },
    { code: 'sz000001', name: '平安银行' },
    { code: 'sz000002', name: '万科A' },
    { code: 'sz300750', name: '宁德时代' },
  ];

  const availableModels = [
    { key: 'deepseek', name: 'DeepSeek Chat' },
    { key: 'gemini', name: 'Gemini 2.0 Flash' },
    { key: 'claude', name: 'Claude 3.5 Sonnet' },
  ];

  const handleStockToggle = (code: string) => {
    setSelectedStocks(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleModelToggle = (key: string) => {
    setSelectedModels(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleRun = async () => {
    if (selectedStocks.length === 0) {
      alert('请至少选择一只股票');
      return;
    }
    if (selectedModels.length === 0) {
      alert('请至少选择一个模型');
      return;
    }

    setIsRunning(true);

    try {
      const response = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stocks: selectedStocks,
          models: selectedModels,
          startDate,
          endDate,
          historyDays,
          initialCapital: 100000,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const params = new URLSearchParams({
          results: JSON.stringify(data.results),
          summary: JSON.stringify(data.summary),
        });
        window.location.href = `/results?${params.toString()}`;
      } else {
        alert(`回测失败: ${data.error}`);
      }
    } catch (error) {
      alert(`请求失败: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">回测模式</h1>
          <p className="text-gray-600">选择股票和AI模型进行历史回测</p>
        </header>

        <nav className="flex gap-4 mb-8 border-b pb-4">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            总览
          </Link>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            回测模式
          </button>
          <Link
            href="/live"
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            实盘模式
          </Link>
          <Link
            href="/history"
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            历史记录
          </Link>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 股票选择 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">选择股票</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableStocks.map(stock => (
                <label key={stock.code} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStocks.includes(stock.code)}
                    onChange={() => handleStockToggle(stock.code)}
                    className="w-4 h-4"
                  />
                  <span className="flex-1">{stock.name}</span>
                  <span className="text-sm text-gray-500">{stock.code}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">已选择: {selectedStocks.length} 只</p>
          </div>

          {/* 模型选择 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">选择AI模型</h2>
            <div className="space-y-2">
              {availableModels.map(model => (
                <label key={model.key} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model.key)}
                    onChange={() => handleModelToggle(model.key)}
                    className="w-4 h-4"
                  />
                  <span className="flex-1">{model.name}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">已选择: {selectedModels.length} 个</p>
          </div>

          {/* 参数设置 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">回测参数</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  历史数据天数
                </label>
                <input
                  type="number"
                  value={historyDays}
                  onChange={(e) => setHistoryDays(Number(e.target.value))}
                  min={5}
                  max={365}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  开始日期
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  结束日期
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>初始资金:</span>
                  <span className="font-medium">¥100,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleRun}
            disabled={isRunning || selectedStocks.length === 0 || selectedModels.length === 0}
            className={`px-8 py-3 rounded-lg font-medium text-white ${
              isRunning || selectedStocks.length === 0 || selectedModels.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isRunning ? '回测运行中...' : '开始回测'}
          </button>
        </div>

        {/* 说明 */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">使用说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 选择要回测的股票和AI模型</li>
            <li>• 设置历史数据天数（AI用于决策的参考数据量）</li>
            <li>• 选择回测时间段</li>
            <li>• 每个模型独立运行，初始资金均为¥100,000</li>
            <li>• 遵循A股T+1交易规则</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
