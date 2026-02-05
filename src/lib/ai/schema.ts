import { z } from 'zod';
import type { StockData, Position } from '@/types';

// 验证上下文接口
export interface ValidationContext {
  availableCapital?: number;
  currentPosition?: Position;
  currentPrice?: number;
  maxPositionRatio?: number;
  currentDate?: string;
}

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

// ==================== Phase 4.6: 决策输出验证增强 ====================

/**
 * 增强的决策 Schema（带条件验证）
 * - 买入决策必须包含股票和数量
 * - 卖出决策必须包含股票和数量
 * - 持有决策不应包含股票和数量
 */
export const enhancedDecisionSchema = decisionSchema
  .refine(
    (data) => {
      if (data.action === 'buy') {
        return data.stock !== undefined && data.quantity !== undefined;
      }
      return true;
    },
    {
      message: '买入决策必须包含股票代码和数量',
      path: ['action'],
    }
  )
  .refine(
    (data) => {
      if (data.action === 'sell') {
        return data.stock !== undefined && data.quantity !== undefined;
      }
      return true;
    },
    {
      message: '卖出决策必须包含股票代码和数量',
      path: ['action'],
    }
  )
  .refine(
    (data) => {
      if (data.action === 'hold') {
        return data.stock === undefined && data.quantity === undefined;
      }
      return true;
    },
    {
      message: '持有决策不应包含股票代码和数量',
      path: ['action'],
    }
  );

/**
 * 验证决策结果
 */
export interface DecisionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 结合上下文验证决策
 * Phase 4.6: 决策输出验证增强
 * @param decision AI 决策
 * @param context 验证上下文
 * @returns 验证结果
 */
export function validateDecisionWithContext(
  decision: unknown,
  context: ValidationContext = {}
): DecisionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 首先使用增强的 schema 验证基本格式
  const schemaResult = enhancedDecisionSchema.safeParse(decision);

  if (!schemaResult.success) {
    schemaResult.error.errors.forEach((err) => {
      errors.push(err.message);
    });
    return { valid: false, errors, warnings };
  }

  const validatedDecision = schemaResult.data;

  // 资金检查（买入决策）
  if (validatedDecision.action === 'buy') {
    if (context.availableCapital && context.currentPrice && validatedDecision.quantity) {
      const requiredAmount = validatedDecision.quantity * context.currentPrice;
      if (requiredAmount > context.availableCapital) {
        errors.push(
          `资金不足: 需要 ${requiredAmount.toFixed(2)} 元，可用 ${context.availableCapital.toFixed(2)} 元`
        );
      }
    } else if (context.availableCapital && validatedDecision.quantity && !context.currentPrice) {
      // 如果没有提供当前价格，记录警告但仍允许验证通过（价格检查由调用方处理）
      warnings.push('未提供当前价格，无法进行资金检查');
    }

    // 持仓比例检查
    if (context.currentPosition && context.currentPrice && context.maxPositionRatio && validatedDecision.quantity) {
      const existingValue = context.currentPosition.quantity * context.currentPosition.avgPrice;
      const newValue = validatedDecision.quantity * context.currentPrice;
      const totalValue = existingValue + newValue;

      // 简化计算：假设总资产约为可用资金的2倍（现金+持仓）
      const estimatedTotalAssets = context.availableCapital * 2;
      const maxValue = estimatedTotalAssets * context.maxPositionRatio;

      if (totalValue >= maxValue) {
        warnings.push(
          `持仓比例较高: 买入后市值 ${totalValue.toFixed(2)} 元达到或超过上限 ${maxValue.toFixed(2)} 元`
        );
      }
    }

    // 数量是 100 的整数倍检查
    if (validatedDecision.quantity && validatedDecision.quantity % 100 !== 0) {
      warnings.push('买入数量最好是 100 的整数倍（1 手）');
    }
  }

  // 持仓检查（卖出决策）
  if (validatedDecision.action === 'sell') {
    if (!context.currentPosition) {
      errors.push('无持仓可卖');
    } else {
      // 检查股票代码是否匹配
      if (validatedDecision.stock && validatedDecision.stock !== context.currentPosition.stock) {
        errors.push(`持仓股票不匹配: 持有 ${context.currentPosition.stock}，尝试卖出 ${validatedDecision.stock}`);
      }

      // 检查数量是否超过持仓
      if (validatedDecision.quantity && validatedDecision.quantity > context.currentPosition.quantity) {
        errors.push(
          `卖出数量超过持仓: 持仓 ${context.currentPosition.quantity} 股，尝试卖出 ${validatedDecision.quantity} 股`
        );
      }

      // T+1 规则检查
      if (context.currentPosition && context.currentDate) {
        const buyDate = new Date(context.currentPosition.buyDate);
        const currentDate = new Date(context.currentDate);
        const daysDiff = Math.floor((currentDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff < 1) {
          errors.push('违反 T+1 规则: 当天买入的股票次日才能卖出');
        }
      }
    }
  }

  // 置信度检查
  if (validatedDecision.confidence !== undefined) {
    if (validatedDecision.confidence < 0.3) {
      warnings.push(`决策置信度较低 (${(validatedDecision.confidence * 100).toFixed(0)}%)，建议谨慎操作`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
