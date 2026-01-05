'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LivePage() {
  const [isActive, setIsActive] = useState(false);
  const [selectedStocks, setSelectedStocks] = useState<string[]>(['sh600000']);
  const [selectedModels, setSelectedModels] = useState<string[]>(['deepseek']);

  const availableStocks = [
    { code: 'sh600000', name: '浦发银行' },
    { code: 'sh600036', name: '招商银行' },
    { code: 'sh600519', name: '贵州茅台' },
    { code: 'sh601318', name: '中国平安' },
  ];

  const availableModels = [
    { key: 'deepseek', name: 'DeepSeek' },
    { key: 'gemini', name: 'Gemini' },
    { key: 'claude', name: 'Claude' },
  ];

  const handleToggle = () => {
    setIsActive(!isActive);
    // TODO: 调用实盘交易API
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">实盘交易</h1>
            <p className="text-gray-600 mt-1">实时AI交易模拟（非真实资金）</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
            返回首页
          </Link>
        </header>

        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">交易控制</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={handleToggle}
              className={`px-6 py-3 rounded-lg font-medium text-white ${
                isActive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isActive ? '停止交易' : '启动交易'}
            </button>
            <div className={`flex items-center gap-2 ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
              <span className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-600' : 'bg-gray-400'}`}></span>
              <span>{isActive ? '运行中' : '已停止'}</span>
            </div>
          </div>

          {/* 配置 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className="font-medium mb-2">选择股票</h3>
              <div className="flex flex-wrap gap-2">
                {availableStocks.map(stock => (
                  <button
                    key={stock.code}
                    onClick={() => {
                      if (isActive) return;
                      setSelectedStocks(prev =>
                        prev.includes(stock.code)
                          ? prev.filter(c => c !== stock.code)
                          : [...prev, stock.code]
                      );
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedStocks.includes(stock.code)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {stock.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">选择模型</h3>
              <div className="flex flex-wrap gap-2">
                {availableModels.map(model => (
                  <button
                    key={model.key}
                    onClick={() => {
                      if (isActive) return;
                      setSelectedModels(prev =>
                        prev.includes(model.key)
                          ? prev.filter(k => k !== model.key)
                          : [...prev, model.key]
                      );
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedModels.includes(model.key)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {model.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 实时状态 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-medium mb-2">实时行情</h3>
            <div className="text-gray-500">暂无数据</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-medium mb-2">持仓状态</h3>
            <div className="text-gray-500">暂无持仓</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-medium mb-2">盈亏统计</h3>
            <div className="text-gray-500">等待启动...</div>
          </div>
        </div>

        {/* 说明 */}
        <div className="mt-6 bg-yellow-50 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-2">风险提示</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• 实盘交易功能仅为模拟，不涉及真实资金</li>
            <li>• AI决策仅供参考，不构成投资建议</li>
            <li>• 交易时间段为 9:15-15:00</li>
            <li>• 遵守A股T+1交易规则</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
