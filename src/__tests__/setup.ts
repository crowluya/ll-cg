/**
 * Vitest 全局测试设置文件
 * 在所有测试运行前执行
 */

import { vi, afterAll } from 'vitest';
import '@testing-library/jest-dom'; // 添加jest-dom匹配器

// 设置测试环境变量
process.env.OPENROUTER_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_SINA_API_BASE = 'https://test.sinajs.cn';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';

// 减少 console 输出噪音（可选）
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

// 全局测试结束后清理
afterAll(() => {
  vi.restoreAllMocks();
});
