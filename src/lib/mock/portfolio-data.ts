/**
 * Mock portfolio data for testing the dashboard UI
 * Generates realistic-looking portfolio value time series data
 */

export interface PortfolioDataPoint {
  timestamp: string;
  benchmark: number;
  deepseek: number;
  gemini: number;
}

export interface ModelSummary {
  name: string;
  currentValue: number;
  change: number;
  changePercent: number;
  color: string;
  icon: string;
}

export interface PortfolioData {
  dataPoints: PortfolioDataPoint[];
  benchmark: ModelSummary;
  deepseek: ModelSummary;
  gemini: ModelSummary;
}

// Model configurations
const MODELS = {
  benchmark: {
    name: '初始投资',
    color: '#9CA3AF', // gray-400
    icon: '⚖',
  },
  deepseek: {
    name: 'DeepSeek',
    color: '#3B82F6', // blue-500
    icon: '🔵',
  },
  gemini: {
    name: 'Gemini',
    color: '#A855F7', // purple-500
    icon: '🟣',
  },
};

/**
 * Generate a realistic-looking portfolio value series with volatility
 */
function generatePortfolioSeries(
  initialValue: number,
  days: number,
  volatility: number,
  trend: number = 0,
  seed: number = 0
): number[] {
  const values: number[] = [initialValue];
  let currentValue = initialValue;

  // Simple pseudo-random number generator
  const random = (i: number) => {
    const x = Math.sin(i + seed) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 1; i < days; i++) {
    // Daily change based on volatility and trend
    const dailyChange = (random(i) - 0.5) * 2 * volatility + trend;
    currentValue = currentValue * (1 + dailyChange);
    // Ensure value doesn't go below 10% of initial
    currentValue = Math.max(currentValue, initialValue * 0.1);
    values.push(currentValue);
  }

  return values;
}

/**
 * Interpolate daily data to hourly data points
 */
function interpolateToHourly(
  dailyValues: number[],
  pointsPerDay: number
): number[] {
  const result: number[] = [];

  for (let i = 0; i < dailyValues.length - 1; i++) {
    const start = dailyValues[i];
    const end = dailyValues[i + 1];

    for (let j = 0; j < pointsPerDay; j++) {
      const ratio = j / pointsPerDay;
      // Add some intra-day volatility
      const intraDayNoise = (Math.random() - 0.5) * 0.005;
      const value = start + (end - start) * ratio;
      result.push(value * (1 + intraDayNoise));
    }
  }

  // Add last day's final value
  result.push(dailyValues[dailyValues.length - 1]);

  return result;
}

/**
 * Generate timestamps for the data points
 */
function generateTimestamps(count: number, days: number, endDate: Date = new Date()): string[] {
  const timestamps: string[] = [];
  const startTime = new Date(endDate);
  startTime.setDate(startTime.getDate() - days);

  const msPerPoint = (endDate.getTime() - startTime.getTime()) / (count - 1);

  for (let i = 0; i < count; i++) {
    const time = new Date(startTime.getTime() + msPerPoint * i);
    timestamps.push(time.toISOString());
  }

  return timestamps;
}

/**
 * Generate mock portfolio data
 */
export function generateMockPortfolioData(options: {
  initialAmount?: number;
  days?: number;
  pointsPerDay?: number;
}): PortfolioData {
  const {
    initialAmount = 100000,
    days = 30,
    pointsPerDay = 8, // 8 data points per day (every 3 hours)
  } = options;

  const totalPoints = days * pointsPerDay;

  // Generate daily values first
  const dailyBenchmark = generatePortfolioSeries(initialAmount, days, 0, 0, 1);
  const dailyDeepSeek = generatePortfolioSeries(initialAmount, days, 0.03, 0.001, 2);
  const dailyGemini = generatePortfolioSeries(initialAmount, days, 0.025, 0.0005, 3);

  // Interpolate to hourly data
  const benchmarkValues = interpolateToHourly(dailyBenchmark, pointsPerDay);
  const deepseekValues = interpolateToHourly(dailyDeepSeek, pointsPerDay);
  const geminiValues = interpolateToHourly(dailyGemini, pointsPerDay);

  // Generate timestamps
  const timestamps = generateTimestamps(
    Math.min(benchmarkValues.length, totalPoints),
    days
  );

  // Create data points
  const dataPoints: PortfolioDataPoint[] = timestamps.map((timestamp, index) => ({
    timestamp,
    benchmark: benchmarkValues[index] || initialAmount,
    deepseek: deepseekValues[index] || initialAmount,
    gemini: geminiValues[index] || initialAmount,
  }));

  // Calculate summaries
  const lastPoint = dataPoints[dataPoints.length - 1];

  const createSummary = (
    values: number[],
    config: { name: string; color: string; icon: string }
  ): ModelSummary => {
    const currentValue = values[values.length - 1];
    const startValue = values[0];
    const change = currentValue - startValue;
    const changePercent = (change / startValue) * 100;

    return {
      name: config.name,
      currentValue,
      change,
      changePercent,
      color: config.color,
      icon: config.icon,
    };
  };

  return {
    dataPoints,
    benchmark: createSummary(benchmarkValues, MODELS.benchmark),
    deepseek: createSummary(deepseekValues, MODELS.deepseek),
    gemini: createSummary(geminiValues, MODELS.gemini),
  };
}

/**
 * Filter portfolio data by time range
 */
export function filterByTimeRange(
  data: PortfolioData,
  range: 'all' | '1d' | '72h' | '1w' | '1m'
): PortfolioData {
  if (range === 'all') return data;

  const now = new Date();
  let cutoffTime = new Date();

  switch (range) {
    case '1d':
      cutoffTime.setDate(now.getDate() - 1);
      break;
    case '72h':
      cutoffTime.setTime(now.getTime() - 72 * 60 * 60 * 1000);
      break;
    case '1w':
      cutoffTime.setDate(now.getDate() - 7);
      break;
    case '1m':
      cutoffTime.setMonth(now.getMonth() - 1);
      break;
  }

  const filteredPoints = data.dataPoints.filter(
    (point) => new Date(point.timestamp) >= cutoffTime
  );

  // Recalculate summaries based on filtered data
  const recalculateSummary = (key: 'benchmark' | 'deepseek' | 'gemini'): ModelSummary => {
    const original = data[key];
    const firstValue = filteredPoints[0]?.[key] || original.currentValue;
    const lastValue = filteredPoints[filteredPoints.length - 1]?.[key] || original.currentValue;
    const change = lastValue - firstValue;
    const changePercent = (change / firstValue) * 100;

    return {
      ...original,
      currentValue: lastValue,
      change,
      changePercent,
    };
  };

  return {
    dataPoints: filteredPoints,
    benchmark: recalculateSummary('benchmark'),
    deepseek: recalculateSummary('deepseek'),
    gemini: recalculateSummary('gemini'),
  };
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage change
 */
export function formatPercent(value: number, showSign: boolean = true): string {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string, range: string): string {
  const date = new Date(timestamp);

  switch (range) {
    case '1d':
    case '72h':
      // Show time only: "14:30"
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    case '1w':
      // Show day + time: "10-18 14:30"
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    default:
      // Show full date: "10-18"
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
  }
}
