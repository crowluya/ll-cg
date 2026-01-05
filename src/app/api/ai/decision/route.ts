import { NextRequest, NextResponse } from 'next/server';
import { getAIDecision, getBatchAIDecisions, validateAIDecision } from '@/lib/ai/decision';
import { fetchStockData, standardizeStockCode } from '@/lib/data/sina-api';
import { isApiKeyConfigured } from '@/lib/ai/client';
import type { DecisionInput } from '@/lib/ai/schema';
import type { AIModelKey } from '@/types';

/**
 * POST /api/ai/decision
 * 获取 AI 交易决策
 *
 * 请求体:
 * - model: AI模型 (deepseek/gemini/claude) 或数组
 * - stockCode: 股票代码
 * - historyDays: 历史数据天数 (默认30)
 * - currentPosition: 当前持仓 (可选)
 * - availableCapital: 可用资金 (默认100000)
 * - currentDate: 当前日期 (默认今天)
 */
export async function POST(request: NextRequest) {
  try {
    // 检查 API Key
    if (!isApiKeyConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'OPENROUTER_API_KEY 未配置，请在 .env.local 中设置',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      model = 'deepseek',
      stockCode,
      historyDays = 30,
      currentPosition,
      availableCapital = 100000,
      currentDate = new Date().toISOString().split('T')[0],
    } = body;

    // 参数验证
    if (!stockCode) {
      return NextResponse.json(
        { success: false, error: '请提供股票代码 (stockCode)' },
        { status: 400 }
      );
    }

    // 验证模型参数
    const validModels: AIModelKey[] = ['deepseek', 'gemini', 'claude'];

    // 判断是单个模型还是批量
    const isBatch = Array.isArray(model);
    const models = isBatch
      ? (model as AIModelKey[]).filter(m => validModels.includes(m))
      : [model as AIModelKey];

    if (models.length === 0) {
      return NextResponse.json(
        { success: false, error: '无效的模型，可选: deepseek, gemini, claude' },
        { status: 400 }
      );
    }

    // 验证历史天数
    if (historyDays < 5 || historyDays > 365) {
      return NextResponse.json(
        { success: false, error: '历史天数应在 5-365 之间' },
        { status: 400 }
      );
    }

    // 验证可用资金
    if (availableCapital <= 0) {
      return NextResponse.json(
        { success: false, error: '可用资金必须大于0' },
        { status: 400 }
      );
    }

    // 标准化股票代码
    const standardCode = standardizeStockCode(stockCode);

    // 获取历史数据
    const historyData = await fetchStockData(standardCode, historyDays);

    if (historyData.length === 0) {
      return NextResponse.json(
        { success: false, error: `无法获取股票 ${standardCode} 的历史数据` },
        { status: 404 }
      );
    }

    // 构建决策输入
    const decisionInput: DecisionInput = {
      stockCode: standardCode,
      historyData,
      currentPosition,
      availableCapital,
      currentDate,
    };

    // 获取 AI 决策
    const decisions = await getBatchAIDecisions(models, decisionInput);

    // 验证决策
    const results: Record<string, any> = {};

    for (const [modelKey, decision] of decisions.entries()) {
      const validation = validateAIDecision(decision, decisionInput);

      results[modelKey] = {
        decision,
        validation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
        },
      };
    }

    // 如果是单个模型，简化返回格式
    if (!isBatch && models.length === 1) {
      const modelKey = models[0];
      const result = results[modelKey];

      return NextResponse.json({
        success: true,
        model: modelKey,
        stockCode: standardCode,
        decision: result.decision,
        validation: result.validation,
        input: {
          stockCode: standardCode,
          historyDays,
          currentPrice: historyData[historyData.length - 1].close,
          availableCapital,
          currentDate,
        },
      });
    }

    // 批量返回
    return NextResponse.json({
      success: true,
      stockCode: standardCode,
      decisions: results,
      input: {
        stockCode: standardCode,
        historyDays,
        currentPrice: historyData[historyData.length - 1].close,
        availableCapital,
        currentDate,
      },
    });

  } catch (error) {
    console.error('Error in /api/ai/decision:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取 AI 决策失败',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/decision
 * 查询 API 状态和可用模型
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    configured: isApiKeyConfigured(),
    availableModels: [
      {
        key: 'deepseek',
        name: 'DeepSeek Chat',
        description: '高性能中文对话模型',
      },
      {
        key: 'gemini',
        name: 'Gemini 2.0 Flash',
        description: 'Google 最新 Gemini 模型',
      },
      {
        key: 'claude',
        name: 'Claude 3.5 Sonnet',
        description: 'Anthropic 高性能模型',
      },
    ],
  });
}
