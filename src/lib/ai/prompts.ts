import type { StockData, Position } from '@/types';
import { calculateMA, calculateRSI } from './schema';

/**
 * 生成交易决策提示词
 * @param params 决策输入参数
 * @returns 格式化的提示词字符串
 */
export function generateTradingPrompt(params: {
  stockCode: string;
  historyData: StockData[];
  currentPosition?: Position;
  availableCapital: number;
  currentDate: string;
}): string {
  const {
    stockCode,
    historyData,
    currentPosition,
    availableCapital,
    currentDate,
  } = params;

  // 计算技术指标
  const ma5 = calculateMA(historyData, 5);
  const ma10 = calculateMA(historyData, 10);
  const ma20 = calculateMA(historyData, 20);
  const rsi = calculateRSI(historyData, 14);

  // 获取最近价格
  const latest = historyData[historyData.length - 1];
  const previous = historyData[historyData.length - 2];

  // 计算价格变化
  const priceChange = latest.close - previous.close;
  const priceChangePercent = (priceChange / previous.close) * 100;

  // 构建历史数据摘要
  const dataSummary = historyData.slice(-10).map((d, i) => {
    const change = i > 0 ? ((d.close - historyData[historyData.length - 10 + i - 1].close) / historyData[historyData.length - 10 + i - 1].close * 100).toFixed(2) : 'N/A';
    return `${d.date}: 开${d.open.toFixed(2)} 高${d.high.toFixed(2)} 低${d.low.toFixed(2)} 收${d.close.toFixed(2)} 量${(d.volume / 10000).toFixed(0)}万 (${change}%)`;
  }).join('\n');

  // 构建当前持仓信息
  const positionInfo = currentPosition
    ? `
当前持仓:
- 股票: ${currentPosition.stock}
- 数量: ${currentPosition.quantity}股
- 成本: ${currentPosition.avgPrice.toFixed(2)}元
- 买入日期: ${currentPosition.buyDate}
- 盈亏: ${((latest.close - currentPosition.avgPrice) / currentPosition.avgPrice * 100).toFixed(2)}%
`
    : '当前无持仓\n';

  return `你是一个专业的A股交易AI分析师，负责根据历史数据做出交易决策。

## 股票信息
- 股票代码: ${stockCode}
- 分析日期: ${currentDate}

## 资金状况
- 可用资金: ${availableCapital.toLocaleString()}元
- 初始资金: 100,000元
${positionInfo}

## 技术指标
- 最新收盘价: ${latest.close.toFixed(2)}元
- 前日收盘价: ${previous.close.toFixed(2)}元
- 涨跌幅: ${priceChangePercent.toFixed(2)}%
- MA5: ${ma5?.toFixed(2) || 'N/A'}
- MA10: ${ma10?.toFixed(2) || 'N/A'}
- MA20: ${ma20?.toFixed(2) || 'N/A'}
- RSI(14): ${rsi?.toFixed(2) || 'N/A'}

## 最近10日K线数据
${dataSummary}

## A股交易规则
1. **T+1规则**: 当天买入的股票，次日才能卖出
2. **交易时间**: 周一至周五 9:15-15:00 (法定节假日除外)
3. **最小单位**: 买入必须是100股的整数倍(1手)
4. **涨跌限制**: 主板10%、创业板/科创板20%

## 分析要求
1. 综合分析技术指标(MA、RSI)和价格走势
2. 考虑当前持仓情况和可用资金
3. 严格遵守T+1交易规则
4. 评估风险收益比
5. 给出明确的交易建议

## 决策输出
请根据以上信息，给出今日的交易决策：
- **买入(buy)**: 技术面显示上涨趋势，且资金充足
- **卖出(sell)**: 已有持仓且技术面显示下跌趋势，或止盈止损
- **持有(hold)**: 观望或持仓不变

请给出决策理由，至少包含：
1. 技术面分析结论
2. 风险评估
3. 具体操作建议`;
}

/**
 * 生成数据分析提示词
 * @param data 股票数据数组
 * @param focus 分析重点
 * @returns 格式化的提示词字符串
 */
export function generateAnalysisPrompt(
  data: StockData[],
  focus: 'trend' | 'volatility' | 'support' | 'resistance' = 'trend'
): string {
  const latest = data[data.length - 1];
  const first = data[0];

  const overallChange = ((latest.close - first.close) / first.close * 100).toFixed(2);

  return `请分析以下股票数据，重点关注${getFocusDescription(focus)}。

数据概况:
- 数据范围: ${data.length}个交易日
- 起始日期: ${first.date}
- 结束日期: ${latest.date}
- 起始价格: ${first.close.toFixed(2)}元
- 最新价格: ${latest.close.toFixed(2)}元
- 涨跌幅: ${overallChange}%

最近价格走势:
${data.slice(-5).map(d => `${d.date}: ${d.close.toFixed(2)}元`).join('\n')}

请给出专业分析结论。`;
}

/**
 * 生成批量对比分析提示词
 * @param stocksData 多只股票的数据
 * @returns 格式化的提示词字符串
 */
export function generateComparisonPrompt(stocksData: Map<string, StockData[]>): string {
  let prompt = '请对比分析以下几只股票的投资价值：\n\n';

  for (const [code, data] of stocksData.entries()) {
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    const change = ((latest.close - previous.close) / previous.close * 100).toFixed(2);

    prompt += `## ${code}\n`;
    prompt += `- 最新价格: ${latest.close.toFixed(2)}元\n`;
    prompt += `- 日涨跌幅: ${change}%\n`;
    prompt += `- 成交量: ${(latest.volume / 10000).toFixed(0)}万股\n`;
    prompt += `- 数据周期: ${data.length}天\n\n`;
  }

  prompt += `请从以下维度进行对比分析：
1. 短期走势强度
2. 技术面健康度
3. 风险水平
4. 推荐排序（最具投资价值排序）`;

  return prompt;
}

/**
 * 生成回测分析提示词
 * @param params 回测参数
 * @returns 格式化的提示词字符串
 */
export function generateBacktestPrompt(params: {
  trades: Array<{ date: string; type: 'buy' | 'sell'; price: number; quantity: number }>;
  finalValue: number;
  profit: number;
  profitRate: number;
  winRate: number;
}): string {
  const { trades, finalValue, profit, profitRate, winRate } = params;

  const buyCount = trades.filter(t => t.type === 'buy').length;
  const sellCount = trades.filter(t => t.type === 'sell').length;

  return `请分析以下回测结果，给出策略评估和建议：

## 回测结果摘要
- 初始资金: 100,000元
- 最终资产: ${finalValue.toFixed(2)}元
- 总盈亏: ${profit > 0 ? '+' : ''}${profit.toFixed(2)}元 (${profitRate > 0 ? '+' : ''}${profitRate.toFixed(2)}%)
- 交易次数: ${trades.length}次 (买入${buyCount}次, 卖出${sellCount}次)
- 胜率: ${(winRate * 100).toFixed(2)}%

## 最近交易记录
${trades.slice(-10).map(t => `${t.date}: ${t.type === 'buy' ? '买入' : '卖出'} ${t.quantity}股 @ ${t.price.toFixed(2)}元`).join('\n')}

请从以下维度进行分析：
1. 策略盈利能力评估
2. 风险控制水平
3. 交易频率合理性
4. 改进建议`;
}

/**
 * 获取分析重点描述
 */
function getFocusDescription(focus: string): string {
  const descriptions: Record<string, string> = {
    trend: '价格趋势（上升/下降/震荡）',
    volatility: '价格波动率（振幅、波动程度）',
    support: '支撑位分析（关键支撑价位）',
    resistance: '阻力位分析（关键阻力价位）',
  };
  return descriptions[focus] || focus;
}

/**
 * 系统提示词（所有AI调用的基础提示）
 */
export const SYSTEM_PROMPT = `你是一个专业的A股交易AI助手，具备以下特点：

1. **专业性**: 深入理解A股市场特点和交易规则
2. **客观性**: 基于数据分析，避免情绪化判断
3. **风险意识**: 始终将风险控制放在首位
4. **规则遵守**: 严格遵守T+1等交易规则
5. **清晰表达**: 决策理由明确易懂

重要提醒：
- 所有建议仅供参考，不构成投资建议
- 股市有风险，投资需谨慎
- 过往表现不代表未来收益`;
