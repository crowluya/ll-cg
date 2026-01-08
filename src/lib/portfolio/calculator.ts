/**
 * Portfolio value calculation service
 * Computes portfolio values based on positions and current stock prices
 */

export interface Position {
  stockCode: string;
  stockName: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
}

export interface StockPrice {
  code: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface PortfolioValue {
  totalValue: number;
  cost: number;
  profit: number;
  profitPercent: number;
  cash: number;
  positionsValue: number;
}

export interface ModelPortfolio {
  modelId: 'deepseek' | 'gemini';
  initialAmount: number;
  positions: Position[];
  currentPortfolio: PortfolioValue;
}

/**
 * Calculate portfolio value based on positions and current prices
 */
export function calculatePortfolioValue(
  positions: Position[],
  currentPrices: Map<string, StockPrice>,
  initialAmount: number,
  cash?: number
): PortfolioValue {
  let positionsValue = 0;
  let cost = 0;

  for (const position of positions) {
    const price = currentPrices.get(position.stockCode);
    if (price) {
      positionsValue += price.price * position.quantity;
    }
    cost += position.buyPrice * position.quantity;
  }

  // If cash not provided, assume it's the remaining from initial amount
  const remainingCash = cash ?? initialAmount - cost;
  const totalValue = positionsValue + remainingCash;
  const profit = totalValue - initialAmount;
  const profitPercent = (profit / initialAmount) * 100;

  return {
    totalValue,
    cost,
    profit,
    profitPercent,
    cash: remainingCash,
    positionsValue,
  };
}

/**
 * Get stock prices from Sina API for multiple stocks
 */
export async function getStockPrices(
  stockCodes: string[]
): Promise<Map<string, StockPrice>> {
  const priceMap = new Map<string, StockPrice>();

  try {
    // Batch fetch from Sina API
    const response = await fetch(
      `https://hq.sinajs.cn/?list=${stockCodes.join(',')}`
    );
    const text = await response.text();

    // Parse Sina API response
    const lines = text.split('\n').filter((line) => line.trim());
    for (const line of lines) {
      const match = line.match(/var hq_str_(.+?)="(.+?)";/);
      if (match) {
        const code = match[1];
        const values = match[2].split(',');

        if (values.length >= 4) {
          const name = values[0];
          const price = parseFloat(values[3]);
          const prevClose = parseFloat(values[2]);

          if (!isNaN(price) && !isNaN(prevClose) && prevClose > 0) {
            const change = price - prevClose;
            const changePercent = (change / prevClose) * 100;

            priceMap.set(code, {
              code,
              price,
              change,
              changePercent,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching stock prices:', error);
  }

  return priceMap;
}

/**
 * Calculate portfolio history for a model
 */
export async function getPortfolioHistory(
  modelId: 'deepseek' | 'gemini',
  timeRange: 'all' | '1d' | '72h' | '1w' | '1m',
  initialAmount: number
): Promise<{ timestamp: string; value: number }[]> {
  // TODO: Implement database query to fetch account snapshots
  // For now, return empty array
  return [];
}

/**
 * Get real-time portfolio value for a model
 */
export async function getRealtimePortfolioValue(
  modelId: 'deepseek' | 'gemini',
  initialAmount: number
): Promise<PortfolioValue | null> {
  // TODO: Implement database query to fetch current positions
  // and calculate real-time value
  return null;
}

/**
 * Standardize stock code for Sina API
 * e.g., 600519 -> sh600519, 000001 -> sz000001
 */
export function normalizeStockCode(code: string): string {
  const trimmed = code.trim().toUpperCase();

  // Already has prefix
  if (trimmed.startsWith('SH') || trimmed.startsWith('SZ')) {
    return trimmed.toLowerCase();
  }

  // Add prefix based on code pattern
  if (/^[6]/.test(trimmed)) {
    return `sh${trimmed}`;
  } else if (/^[0-3]/.test(trimmed) || trimmed.startsWith('30')) {
    return `sz${trimmed}`;
  }

  return trimmed;
}

/**
 * Batch normalize stock codes
 */
export function normalizeStockCodes(codes: string[]): string[] {
  return codes.map(normalizeStockCode);
}
