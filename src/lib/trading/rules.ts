import type { Position, StockData } from '@/types';

/**
 * 检查持仓是否可卖出
 * @param position 持仓信息
 * @param currentDate 当前日期 YYYY-MM-DD
 * @returns 是否可卖出
 */
export function canSellPosition(position: Position, currentDate: string): boolean {
  const buyDate = new Date(position.buyDate);
  const current = new Date(currentDate);

  // 计算日期差（天数）
  const daysDiff = Math.floor((current.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));

  // T+1规则：买入当天不能卖出，次日及之后可以卖出
  return daysDiff >= 1;
}

/**
 * 检查是否是交易日
 * @param date 日期字符串 YYYY-MM-DD
 * @returns 是否是交易日
 */
export function isTradingDay(date: string): boolean {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();

  // 周末不是交易日
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // TODO: 可以添加节假日判断
  return true;
}

/**
 * 检查当前是否在交易时间段
 * @returns 是否在交易时间段 (9:15-15:00)
 */
export function isTradingTime(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;

  // 交易时间：9:15-15:00
  const startMinutes = 9 * 60 + 15; // 9:15
  const endMinutes = 15 * 60; // 15:00

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * 获取交易时间段类型
 * @returns 当前处于哪个交易时段
 */
export function getTradingSession(): 'morning' | 'afternoon' | 'closed' | 'lunch' {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;

  const morningStart = 9 * 60 + 15; // 9:15
  const morningEnd = 11 * 60 + 30; // 11:30
  const afternoonStart = 13 * 60; // 13:00
  const afternoonEnd = 15 * 60; // 15:00

  if (currentMinutes < morningStart || currentMinutes >= afternoonEnd) {
    return 'closed';
  }
  if (currentMinutes >= morningStart && currentMinutes < morningEnd) {
    return 'morning';
  }
  if (currentMinutes >= morningEnd && currentMinutes < afternoonStart) {
    return 'lunch';
  }
  return 'afternoon';
}

/**
 * 计算买入数量（100股的整数倍）
 * @param capital 可用资金
 * @param price 股票价格
 * @returns 可买入数量（100的整数倍）
 */
export function calculateBuyQuantity(capital: number, price: number): number {
  const maxQuantity = Math.floor(capital / price);
  // 向下取整到100的倍数
  return Math.floor(maxQuantity / 100) * 100;
}

/**
 * 计算卖出数量（不超过持仓）
 * @param position 持仓信息
 * @param requestedQuantity 请求卖出数量
 * @returns 实际可卖出数量
 */
export function calculateSellQuantity(position: Position, requestedQuantity: number): number {
  return Math.min(requestedQuantity, position.quantity);
}

/**
 * 验证买入订单
 * @param stock 股票代码
 * @param quantity 数量
 * @param price 价格
 * @param capital 可用资金
 * @returns 验证结果
 */
export function validateBuyOrder(
  stock: string,
  quantity: number,
  price: number,
  capital: number
): {
  valid: boolean;
  error?: string;
} {
  // 检查数量是否是100的整数倍
  if (quantity % 100 !== 0) {
    return { valid: false, error: '买入数量必须是100的整数倍' };
  }

  // 检查数量是否大于0
  if (quantity <= 0) {
    return { valid: false, error: '买入数量必须大于0' };
  }

  // 检查价格是否大于0
  if (price <= 0) {
    return { valid: false, error: '价格必须大于0' };
  }

  // 检查资金是否充足
  const requiredAmount = quantity * price;
  if (requiredAmount > capital) {
    return { valid: false, error: `资金不足: 需要${requiredAmount.toFixed(2)}元，可用${capital.toFixed(2)}元` };
  }

  return { valid: true };
}

/**
 * 验证卖出订单
 * @param stock 股票代码
 * @param quantity 数量
 * @param position 持仓信息
 * @param currentDate 当前日期
 * @returns 验证结果
 */
export function validateSellOrder(
  stock: string,
  quantity: number,
  position: Position | undefined,
  currentDate: string
): {
  valid: boolean;
  error?: string;
} {
  // 检查是否有持仓
  if (!position) {
    return { valid: false, error: '无持仓可卖' };
  }

  // 检查股票代码是否匹配
  if (position.stock !== stock) {
    return { valid: false, error: '持仓股票代码不匹配' };
  }

  // 检查数量是否超过持仓
  if (quantity > position.quantity) {
    return { valid: false, error: `卖出数量超过持仓: 持仓${position.quantity}股` };
  }

  // 检查T+1规则
  if (!canSellPosition(position, currentDate)) {
    return { valid: false, error: '违反T+1规则: 当天买入的股票次日才能卖出' };
  }

  return { valid: true };
}

/**
 * 计算交易手续费
 * @param amount 交易金额
 * @param type 交易类型 buy/sell
 * @returns 手续费
 */
export function calculateCommission(amount: number, type: 'buy' | 'sell'): number {
  // A股手续费规则（简化版）:
  // 买入: 佣金（最低5元）+ 过户费（沪市）
  // 卖出: 佣金（最低5元）+ 过户费 + 印花税（0.1%）

  const commissionRate = 0.00025; // 佣金率 万分之2.5
  const minCommission = 5; // 最低佣金 5元
  const stampTaxRate = 0.001; // 印花税 千分之一（仅卖出）
  const transferFeeRate = 0.00001; // 过户费（沪市）万分之一

  let commission = amount * commissionRate;
  if (commission < minCommission) {
    commission = minCommission;
  }

  let total = commission;

  // 卖出时加印花税
  if (type === 'sell') {
    total += amount * stampTaxRate;
  }

  // 沪市加过户费
  total += amount * transferFeeRate;

  return total;
}

/**
 * 计算盈亏
 * @param positions 持仓列表
 * @param currentPrices 当前价格 Map<股票代码, 价格>
 * @returns 总盈亏和盈亏率
 */
export function calculateProfit(
  positions: Position[],
  currentPrices: Map<string, number>
): {
  totalProfit: number;
  profitRate: number;
  positions: Array<{
    stock: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    profit: number;
    profitRate: number;
  }>;
} {
  let totalCost = 0;
  let totalValue = 0;
  const details: Array<{
    stock: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    profit: number;
    profitRate: number;
  }> = [];

  for (const position of positions) {
    const currentPrice = currentPrices.get(position.stock) || position.avgPrice;
    const cost = position.quantity * position.avgPrice;
    const value = position.quantity * currentPrice;
    const profit = value - cost;
    const profitRate = cost > 0 ? (profit / cost) * 100 : 0;

    totalCost += cost;
    totalValue += value;

    details.push({
      stock: position.stock,
      quantity: position.quantity,
      avgPrice: position.avgPrice,
      currentPrice,
      profit,
      profitRate,
    });
  }

  const totalProfit = totalValue - totalCost;
  const profitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return {
    totalProfit,
    profitRate,
    positions: details,
  };
}

/**
 * 获取下一个交易日
 * @param date 当前日期
 * @param days 增加天数
 * @returns 下一个交易日 YYYY-MM-DD
 */
export function getNextTradingDay(date: string, days: number = 1): string {
  const result = new Date(date);
  let addedDays = 0;

  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dateStr = result.toISOString().split('T')[0];

    if (isTradingDay(dateStr)) {
      addedDays++;
    }
  }

  return result.toISOString().split('T')[0];
}

/**
 * 获取交易日列表
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 交易日列表
 */
export function getTradingDays(startDate: string, endDate: string): string[] {
  const tradingDays: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    if (isTradingDay(dateStr)) {
      tradingDays.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
  }

  return tradingDays;
}
