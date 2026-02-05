import { callOpenRouter, streamOpenRouter, getModelId, isApiKeyConfigured } from './client';
import { decisionSchema, type AIDecision, type DecisionInput, type ValidationContext } from './schema';
import { generateTradingPrompt, SYSTEM_PROMPT } from './prompts';
import { saveAIDecision } from '@/lib/db/queries';
import { formatDate } from '@/lib/utils/date';
import { validateDecisionWithContext } from './schema';
import type { AIModelKey, Account, TradingConfig, Position, StockData, AIDecisionRecord, RealtimeQuote, IntradayPoint } from '@/types';

// buildDecisionInput 参数接口
export interface BuildDecisionInputParams {
  stockCode: string;
  currentDate?: string;
  availableCapital: number;
  historyData: StockData[];
  currentPosition?: Position;
  account?: Account;
  config?: TradingConfig;
  realtimeQuotes?: Map<string, RealtimeQuote>;
  intradayData?: IntradayPoint[];
}

/**
 * 构建决策输入
 * Phase 4.4: 决策输入组装
 * @param params 构建参数
 * @returns 完整的决策输入
 */
export async function buildDecisionInput(
  params: BuildDecisionInputParams
): Promise<DecisionInput> {
  const {
    stockCode,
    currentDate,
    availableCapital,
    historyData,
    currentPosition,
    account,
    config,
    realtimeQuotes,
    intradayData,
  } = params;

  // 获取当前日期（默认今天）
  const today = new Date();
  const formattedDate = currentDate ?? formatDate(today);

  // 构建决策输入
  const input: DecisionInput = {
    stockCode,
    currentDate: formattedDate,
    availableCapital,
    historyData: historyData ?? [],
    currentPosition,
    account,
    config,
    realtimeQuotes,
    intradayData,
    currentTime: new Date().toISOString(),
  };

  return input;
}

/**
 * 获取 AI 交易决策
 * @param modelKey AI 模型键 (deepseek/gemini/claude)
 * @param input 决策输入参数
 * @returns AI 决策结果
 */
export async function getAIDecision(
  modelKey: AIModelKey,
  input: DecisionInput
): Promise<AIDecision> {
  // 检查 API Key 是否配置
  if (!isApiKeyConfigured()) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  try {
    const modelId = getModelId(modelKey);
    const basePrompt = generateTradingPrompt(input);

    // 添加 JSON 格式要求
    const jsonFormatPrompt = `${basePrompt}

请以 JSON 格式返回决策结果，格式如下：
{
  "action": "buy" | "sell" | "hold",
  "stock": "股票代码 (如果action是buy或sell)",
  "quantity": 数量 (如果action是buy，100的整数倍),
  "reason": "决策理由 (至少50字)",
  "confidence": 0.0-1.0 (可选，置信度)
}`;

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: jsonFormatPrompt },
    ];

    const text = await callOpenRouter(modelId, messages);

    // 解析 JSON 响应
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;

    const parsed = JSON.parse(jsonStr);

    // 使用 zod 验证解析结果
    return decisionSchema.parse(parsed);
  } catch (error) {
    console.error(`Error getting AI decision from ${modelKey}:`, error);
    throw error;
  }
}

/**
 * 批量获取多模型 AI 决策
 * @param modelKeys AI 模型键数组
 * @param input 决策输入参数
 * @returns Map<模型键, 决策结果>
 */
export async function getBatchAIDecisions(
  modelKeys: AIModelKey[],
  input: DecisionInput
): Promise<Map<AIModelKey, AIDecision>> {
  const results = new Map<AIModelKey, AIDecision>();

  // 并行调用所有模型
  const promises = modelKeys.map(async (modelKey) => {
    try {
      const decision = await getAIDecision(modelKey, input);
      results.set(modelKey, decision);
    } catch (error) {
      console.error(`Failed to get decision from ${modelKey}:`, error);
      // 失败时返回 hold 决策
      results.set(modelKey, {
        action: 'hold',
        reason: `AI服务调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  });

  await Promise.all(promises);
  return results;
}

/**
 * 获取 AI 决策（带流式输出）
 * @param modelKey AI 模型键
 * @param input 决策输入参数
 * @returns 流式生成器和最终决策
 */
export async function streamAIDecision(
  modelKey: AIModelKey,
  input: DecisionInput
): Promise<{
  stream: ReadableStream;
  decision: Promise<AIDecision>;
}> {
  if (!isApiKeyConfigured()) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const modelId = getModelId(modelKey);
  const basePrompt = generateTradingPrompt(input);

  const jsonFormatPrompt = `${basePrompt}

请以 JSON 格式返回决策结果，格式如下：
{
  "action": "buy" | "sell" | "hold",
  "stock": "股票代码",
  "quantity": 数量,
  "reason": "决策理由",
  "confidence": 0.0-1.0
}`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: jsonFormatPrompt },
  ];

  const stream = await streamOpenRouter(modelId, messages);

  // 收集完整响应以解析决策
  const decisionPromise = (async () => {
    try {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line: string) => line.startsWith('data:'));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(5).trim());
            if (data.choices?.[0]?.delta?.content) {
              fullText += data.choices[0].delta.content;
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      // 解析 JSON
      const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/) || fullText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : fullText;
      const parsed = JSON.parse(jsonStr);
      return decisionSchema.parse(parsed);
    } catch (error) {
      return {
        action: 'hold' as const,
        reason: '解析AI响应失败',
      };
    }
  })();

  return {
    stream,
    decision: decisionPromise,
  };
}

/**
 * 验证 AI 决策的有效性
 * @param decision AI 决策
 * @param input 决策输入
 * @returns 验证结果
 */
export function validateAIDecision(
  decision: AIDecision,
  input: DecisionInput
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 验证决策与输入的一致性
  if (decision.action === 'buy') {
    if (!decision.stock) {
      errors.push('买入决策必须指定股票代码');
    }
    if (!decision.quantity) {
      errors.push('买入决策必须指定数量');
    } else {
      // 检查资金是否充足
      if (input.historyData.length > 0) {
        const latestPrice = input.historyData[input.historyData.length - 1].close;
        const requiredAmount = decision.quantity * latestPrice;
        if (requiredAmount > input.availableCapital) {
          errors.push(`资金不足: 需要${requiredAmount.toFixed(2)}元，可用${input.availableCapital.toFixed(2)}元`);
        }
      } else {
        warnings.push('无历史数据，无法验证资金是否充足');
      }
      // 检查数量是否是100的整数倍
      if (decision.quantity % 100 !== 0) {
        warnings.push('买入数量最好是100的整数倍(1手)');
      }
    }
  }

  if (decision.action === 'sell') {
    if (!input.currentPosition) {
      errors.push('无持仓可卖');
    } else {
      // 检查T+1规则
      const buyDate = new Date(input.currentPosition.buyDate);
      const currentDate = new Date(input.currentDate);
      const daysDiff = Math.floor((currentDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff < 1) {
        errors.push('违反T+1规则: 当天买入的股票次日才能卖出');
      }
    }
  }

  if (decision.action === 'hold' && (decision.stock || decision.quantity)) {
    warnings.push('持有决策不应包含股票和数量信息');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 聚合多个模型的决策
 * @param decisions 多个模型的决策
 * @returns 聚合结果
 */
export function aggregateDecisions(
  decisions: Map<AIModelKey, AIDecision>
): {
  consensus: 'buy' | 'sell' | 'hold';
  buyCount: number;
  sellCount: number;
  holdCount: number;
  confidence: number;
} {
  let buyCount = 0;
  let sellCount = 0;
  let holdCount = 0;

  for (const decision of decisions.values()) {
    if (decision.action === 'buy') buyCount++;
    else if (decision.action === 'sell') sellCount++;
    else holdCount++;
  }

  const total = decisions.size;
  const maxCount = Math.max(buyCount, sellCount, holdCount);

  // 确定共识
  let consensus: 'buy' | 'sell' | 'hold' = 'hold';
  if (buyCount === maxCount && buyCount > 0) consensus = 'buy';
  else if (sellCount === maxCount && sellCount > 0) consensus = 'sell';

  // 计算置信度（多数派占比）
  const confidence = maxCount / total;

  return {
    consensus,
    buyCount,
    sellCount,
    holdCount,
    confidence,
  };
}

/**
 * 格式化决策为可读文本
 * @param decision AI 决策
 * @returns 格式化的文本
 */
export function formatDecision(decision: AIDecision): string {
  const actionMap = {
    buy: '买入',
    sell: '卖出',
    hold: '持有',
  };

  let text = `决策: ${actionMap[decision.action]}\n`;

  if (decision.stock) {
    text += `股票: ${decision.stock}\n`;
  }

  if (decision.quantity) {
    text += `数量: ${decision.quantity}股\n`;
  }

  if (decision.confidence !== undefined) {
    text += `置信度: ${(decision.confidence * 100).toFixed(0)}%\n`;
  }

  text += `\n理由:\n${decision.reason}`;

  return text;
}

// Re-export validateDecisionWithContext from schema for convenience
export { validateDecisionWithContext };

// ==================== Phase 4.8: 决策记录保存 ====================

/**
 * 决策执行结果接口
 */
export interface DecisionExecutionResult {
  executed: boolean;
  tradeId?: string;
  error?: string;
}

/**
 * 保存决策记录
 * Phase 4.8: 决策记录保存
 * @param model AI 模型
 * @param decision AI 决策
 * @param input 决策输入
 * @param result 执行结果
 * @returns 决策记录 ID
 */
export async function saveDecisionRecord(
  model: AIModelKey,
  decision: AIDecision,
  input: DecisionInput,
  result: DecisionExecutionResult
): Promise<string> {
  // 构建决策记录
  const record: AIDecisionRecord = {
    id: `${model}-${decision.stock || 'hold'}-${Date.now()}`,
    model,
    stock: decision.stock || input.stockCode,
    decisionTime: new Date(),
    inputData: {
      historyData: input.historyData,
      currentPosition: input.currentPosition,
      availableCapital: input.availableCapital,
      currentDate: input.currentDate,
    },
    outputDecision: decision,
    executionResult: result,
  };

  // 保存到数据库
  try {
    const recordId = await saveAIDecision(record);
    return recordId;
  } catch (error) {
    console.error('Failed to save decision record:', error);
    // 即使保存失败，也返回记录 ID 用于日志追踪
    return record.id;
  }
}
