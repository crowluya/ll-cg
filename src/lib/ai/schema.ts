import { z } from 'zod';
import type { StockData, Position } from '@/types';

// AI 决策输出 schema
export const decisionSchema = z.object({
  action: z.enum(['buy', 'sell', 'hold']),
  stock: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  reason: z.string().min(10, '请提供至少10个字符的理由'),
  confidence: z.number().min(0).max(1).optional(), // 置信度 0-1
});

// AI 决策输入 schema
export const decisionInputSchema = z.object({
  stockCode: z.string().regex(/^(sh|sz|SH|SZ)\d{6}$/, '无效的股票代码格式'),
  historyData: z.array(z.object({
    code: z.string(),
    date: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number(),
  })).min(5, '至少需要5天的历史数据'),
  currentPosition: z.object({
    stock: z.string(),
    quantity: z.number(),
    buyDate: z.string(),
    avgPrice: z.number(),
  }).optional(),
  availableCapital: z.number().positive('可用资金必须大于0'),
  currentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
});

// 批量决策请求 schema
export const batchDecisionSchema = z.object({
  models: z.array(z.enum(['deepseek', 'gemini', 'claude'])).min(1),
  stockCode: z.string(),
  historyDays: z.number().int().min(5).max(365).default(30),
  availableCapital: z.number().positive().default(100000),
  currentDate: z.string().default(() => new Date().toISOString().split('T')[0]),
});

// 类型导出
export type AIDecision = z.infer<typeof decisionSchema>;
export type DecisionInput = z.infer<typeof decisionInputSchema>;
export type BatchDecisionInput = z.infer<typeof batchDecisionSchema>;

// 决策结果 schema（包含执行结果）
export const decisionResultSchema = z.object({
  decision: decisionSchema,
  executed: z.boolean(),
  tradeId: z.string().optional(),
  error: z.string().optional(),
});

export type DecisionResult = z.infer<typeof decisionResultSchema>;

// 决策分析 schema（用于历史记录分析）
export const decisionAnalysisSchema = z.object({
  totalDecisions: z.number(),
  buyCount: z.number(),
  sellCount: z.number(),
  holdCount: z.number(),
  executionRate: z.number(), // 执行率
  avgConfidence: z.number().optional(),
});

export type DecisionAnalysis = z.infer<typeof decisionAnalysisSchema>;

// 技术指标辅助函数
export const technicalIndicatorsSchema = z.object({
  ma5: z.number().optional(),
  ma10: z.number().optional(),
  ma20: z.number().optional(),
  rsi: z.number().min(0).max(100).optional(),
  macd: z.number().optional(),
  volumeRatio: z.number().optional(),
});

export type TechnicalIndicators = z.infer<typeof technicalIndicatorsSchema>;

/**
 * 计算简单移动平均线
 * @param data 股票数据数组
 * @param period 周期
 * @returns MA 值
 */
export function calculateMA(data: StockData[], period: number): number | undefined {
  if (data.length < period) return undefined;

  const sum = data.slice(-period).reduce((acc, item) => acc + item.close, 0);
  return sum / period;
}

/**
 * 计算相对强弱指标 RSI
 * @param data 股票数据数组
 * @param period 周期，默认14
 * @returns RSI 值 (0-100)
 */
export function calculateRSI(data: StockData[], period: number = 14): number | undefined {
  if (data.length < period + 1) return undefined;

  let gains = 0;
  let losses = 0;

  for (let i = data.length - period; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * 计算技术指标
 * @param data 股票数据数组
 * @returns 技术指标对象
 */
export function calculateTechnicalIndicators(data: StockData[]): TechnicalIndicators {
  return {
    ma5: calculateMA(data, 5),
    ma10: calculateMA(data, 10),
    ma20: calculateMA(data, 20),
    rsi: calculateRSI(data, 14),
  };
}
