'use client';

import React, { useState } from 'react';

export interface PortfolioConfig {
  initialAmount: number;
  deepseek: {
    initialAmount: number;
    enabled: boolean;
  };
  gemini: {
    initialAmount: number;
    enabled: boolean;
  };
}

interface ConfigModalProps {
  isOpen: boolean;
  config: PortfolioConfig;
  onSave: (config: PortfolioConfig) => void;
  onClose: () => void;
}

const DEFAULT_CONFIG: PortfolioConfig = {
  initialAmount: 100000,
  deepseek: {
    initialAmount: 100000,
    enabled: true,
  },
  gemini: {
    initialAmount: 100000,
    enabled: true,
  },
};

export function ConfigModal({
  isOpen,
  config,
  onSave,
  onClose,
}: ConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<PortfolioConfig>(
    config || DEFAULT_CONFIG
  );

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_CONFIG);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">配置设置</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-6">
          {/* Initial Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              初始投资金额 (¥)
            </label>
            <input
              type="number"
              value={localConfig.initialAmount}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  initialAmount: Number(e.target.value),
                })
              }
              min="1000"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* DeepSeek Config */}
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔵</span>
                <span className="font-semibold text-gray-900">DeepSeek</span>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={localConfig.deepseek.enabled}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      deepseek: {
                        ...localConfig.deepseek,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-600">启用</span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                初始资金 (¥)
              </label>
              <input
                type="number"
                value={localConfig.deepseek.initialAmount}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    deepseek: {
                      ...localConfig.deepseek,
                      initialAmount: Number(e.target.value),
                    },
                  })
                }
                min="1000"
                step="1000"
                disabled={!localConfig.deepseek.enabled}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
          </div>

          {/* Gemini Config */}
          <div className="p-4 bg-purple-50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🟣</span>
                <span className="font-semibold text-gray-900">Gemini</span>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={localConfig.gemini.enabled}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      gemini: {
                        ...localConfig.gemini,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-gray-600">启用</span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                初始资金 (¥)
              </label>
              <input
                type="number"
                value={localConfig.gemini.initialAmount}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    gemini: {
                      ...localConfig.gemini,
                      initialAmount: Number(e.target.value),
                    },
                  })
                }
                min="1000"
                step="1000"
                disabled={!localConfig.gemini.enabled}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            重置默认
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Config button that opens the modal
 */
interface ConfigButtonProps {
  onClick: () => void;
}

export function ConfigButton({ onClick }: ConfigButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <span>配置</span>
    </button>
  );
}
