/**
 * Mock 工具函数
 * 用于在测试中模拟外部依赖
 */

import { vi } from 'vitest';
import type { AxiosMock } from 'vitest-mock-extended';
import {
  MOCK_SINA_API_RESPONSE,
  MOCK_SINA_REALTIME_RESPONSE,
  MOCK_OPENROUTER_BUY_RESPONSE,
  MOCK_OPENROUTER_SELL_RESPONSE,
  MOCK_OPENROUTER_HOLD_RESPONSE,
  MOCK_API_ERROR_RESPONSE,
  MOCK_STOCK_DATA,
} from './mock-data';

// ============= Axios Mock =============

let axiosMock: {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

/**
 * 创建 axios mock
 */
export function createAxiosMock() {
  axiosMock = {
    get: vi.fn(),
    post: vi.fn(),
  };
  return axiosMock;
}

/**
 * 设置 axios 返回成功响应
 */
export function mockAxiosSuccess(data: unknown) {
  axiosMock.get.mockResolvedValue({ data });
  axiosMock.post.mockResolvedValue({ data });
}

/**
 * 设置 axios 返回错误响应
 */
export function mockAxiosError(message: string, status = 500) {
  const error = new Error(message);
  (error as unknown as { status: number }).status = status;
  axiosMock.get.mockRejectedValue(error);
  axiosMock.post.mockRejectedValue(error);
}

/**
 * Mock Sina API 成功响应
 */
export function mockSinaApiSuccess(stockCode: string) {
  axiosMock.get.mockResolvedValue({
    data: MOCK_SINA_API_RESPONSE,
  });
}

/**
 * Mock Sina API 实时行情成功响应
 */
export function mockSinaRealtimeSuccess(stockCode: string) {
  axiosMock.get.mockResolvedValue({
    data: MOCK_SINA_REALTIME_RESPONSE,
  });
}

/**
 * Mock Sina API 批量获取成功响应
 */
export function mockSinaBatchSuccess() {
  axiosMock.get.mockResolvedValue({
    data: MOCK_SINA_API_RESPONSE,
  });
}

/**
 * 重置 axios mock
 */
export function resetAxiosMock() {
  axiosMock?.get.mockReset();
  axiosMock?.post.mockReset();
}

/**
 * 获取 axios mock
 */
export function getAxiosMock() {
  return axiosMock;
}

// ============= OpenRouter API Mock =============

let openRouterMock: {
  post: ReturnType<typeof vi.fn>;
};

/**
 * 创建 OpenRouter API mock
 */
export function createOpenRouterMock() {
  openRouterMock = {
    post: vi.fn(),
  };
  return openRouterMock;
}

/**
 * Mock OpenRouter 买入决策响应
 */
export function mockOpenRouterBuyDecision() {
  openRouterMock.post.mockResolvedValue({
    data: MOCK_OPENROUTER_BUY_RESPONSE,
  });
}

/**
 * Mock OpenRouter 卖出决策响应
 */
export function mockOpenRouterSellDecision() {
  openRouterMock.post.mockResolvedValue({
    data: MOCK_OPENROUTER_SELL_RESPONSE,
  });
}

/**
 * Mock OpenRouter 持有决策响应
 */
export function mockOpenRouterHoldDecision() {
  openRouterMock.post.mockResolvedValue({
    data: MOCK_OPENROUTER_HOLD_RESPONSE,
  });
}

/**
 * Mock OpenRouter API 错误响应
 */
export function mockOpenRouterError() {
  openRouterMock.post.mockRejectedValue({
    response: { data: MOCK_API_ERROR_RESPONSE },
  });
}

/**
 * 重置 OpenRouter mock
 */
export function resetOpenRouterMock() {
  openRouterMock?.post.mockReset();
}

/**
 * 获取 OpenRouter mock
 */
export function getOpenRouterMock() {
  return openRouterMock;
}

// ============= 数据库 Mock =============

interface MockDB {
  trades: unknown[];
  positions: unknown[];
  decisions: unknown[];
  snapshots: unknown[];
}

let mockDB: MockDB = {
  trades: [],
  positions: [],
  decisions: [],
  snapshots: [],
};

/**
 * 创建数据库 mock
 */
export function createMockDB() {
  mockDB = {
    trades: [],
    positions: [],
    decisions: [],
    snapshots: [],
  };
  return mockDB;
}

/**
 * 重置 mock 数据库
 */
export function resetMockDB() {
  mockDB = {
    trades: [],
    positions: [],
    decisions: [],
    snapshots: [],
  };
}

/**
 * 获取 mock 数据库
 */
export function getMockDB() {
  return mockDB;
}

/**
 * 向 mock 数据库插入交易记录
 */
export function insertMockTrade(trade: unknown) {
  mockDB.trades.push(trade);
}

/**
 * 向 mock 数据库插入持仓
 */
export function insertMockPosition(position: unknown) {
  mockDB.positions.push(position);
}

/**
 * 向 mock 数据库插入AI决策
 */
export function insertMockDecision(decision: unknown) {
  mockDB.decisions.push(decision);
}

// ============= 全局 Mock 设置 =============

/**
 * 设置所有全局 mock
 */
export function setupGlobalMocks() {
  // Mock 环境变量
  process.env.OPENROUTER_API_KEY = 'test-api-key';
  process.env.NEXT_PUBLIC_SINA_API_BASE = 'https://test.sinajs.cn';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

  // Mock console 方法以减少测试输出噪音
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
}

/**
 * 清理所有全局 mock
 */
export function cleanupGlobalMocks() {
  vi.restoreAllMocks();
  resetAxiosMock();
  resetOpenRouterMock();
  resetMockDB();
}
