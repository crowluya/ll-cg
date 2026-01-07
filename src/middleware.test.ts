/**
 * 认证中间件测试
 * 测试文件: src/middleware.test.ts
 *
 * 注意：由于中间件依赖 Next.js 内部对象，这些测试使用 mock 对象
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock 认证模块 - 必须在最前面
vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(),
}));

// 导入中间件（必须在 mock 之后）
import { middleware } from './middleware';
import { verifyToken } from '@/lib/auth';

const mockVerifyToken = vi.mocked(verifyToken);

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    next: () => ({
      status: 200,
      ok: true,
    }),
    json: (body: any, init?: any) => ({
      status: init?.status || 200,
      ok: init?.status < 400,
      body,
      cookies: new Map(),
      deleteCookie: function (name: string) {
        this.cookies.set(name, { deleted: true });
        return this;
      },
    }),
    redirect: (url: string | URL) => ({
      status: 307,
      ok: false,
      url: url.toString(),
      cookies: new Map(),
    }),
  },
  // Mock URL 类型
  URL: globalThis.URL,
}));

// 创建模拟请求对象
function createMockRequest(
  url: string,
  options: {
    cookies?: Record<string, string>;
  } = {}
) {
  const urlObj = new URL(url);

  return {
    nextUrl: {
      pathname: urlObj.pathname,
      href: urlObj.href,
    },
    url: urlObj.href,
    cookies: {
      get: (name: string) => {
        const value = options.cookies?.[name];
        return value ? { name, value } : undefined;
      },
      set: vi.fn(),
      delete: vi.fn(),
    },
  } as any;
}

describe('middleware - 路由保护测试', () => {
  const testUser = {
    id: 'test-user-123',
    username: 'testuser',
    name: 'Test User',
    role: 'trader' as const,
    expiresAt: new Date(Date.now() + 3600000),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============= 公开路径测试 =============

  describe('公开路径（无需登录）', () => {
    it('登录页面应该允许未登录访问', async () => {
      const request = createMockRequest('http://localhost:3000/login');

      const response = await middleware(request);
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    it('登录 API 应该允许未登录访问', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/auth/login'
      );

      const response = await middleware(request);
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });
  });

  // ============= 受保护页面测试 =============

  describe('受保护页面（需要登录）', () => {
    it('未登录访问首页应该重定向到登录页', async () => {
      const request = createMockRequest('http://localhost:3000/');

      mockVerifyToken.mockResolvedValue(null);

      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.url).toContain('/login');
    });

    it('未登录访问 history 页面应该重定向到登录页', async () => {
      const request = createMockRequest('http://localhost:3000/history');

      mockVerifyToken.mockResolvedValue(null);

      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.url).toContain('/login');
    });

    it('已登录用户应该允许访问首页', async () => {
      const request = createMockRequest('http://localhost:3000/', {
        cookies: { session: 'valid-token' },
      });

      mockVerifyToken.mockResolvedValue(testUser);

      const response = await middleware(request);
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    it('已登录用户应该允许访问 history 页面', async () => {
      const request = createMockRequest('http://localhost:3000/history', {
        cookies: { session: 'valid-token' },
      });

      mockVerifyToken.mockResolvedValue(testUser);

      const response = await middleware(request);
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });
  });

  // ============= 受保护 API 测试 =============

  describe('受保护 API（需要登录）', () => {
    it('未登录访问股票数据 API 应该返回 401', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/stock/data?code=sz000001'
      );

      mockVerifyToken.mockResolvedValue(null);

      const response = await middleware(request);
      expect(response.status).toBe(401);
      expect(response.ok).toBe(false);
      expect(response.body.error).toBe('UNAUTHORIZED');
    });

    it('未登录访问 AI 决策 API 应该返回 401', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/ai/decision'
      );

      mockVerifyToken.mockResolvedValue(null);

      const response = await middleware(request);
      expect(response.status).toBe(401);
      expect(response.ok).toBe(false);
      expect(response.body.error).toBe('UNAUTHORIZED');
    });

    it('已登录用户应该允许访问股票数据 API', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/stock/data?code=sz000001',
        { cookies: { session: 'valid-token' } }
      );

      mockVerifyToken.mockResolvedValue(testUser);

      const response = await middleware(request);
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });
  });

  // ============= 无效 Token 测试 =============

  describe('无效 Token 处理', () => {
    it('无效 token 应该重定向到登录页（页面）', async () => {
      const request = createMockRequest('http://localhost:3000/', {
        cookies: { session: 'invalid-token' },
      });

      mockVerifyToken.mockResolvedValue(null);

      const response = await middleware(request);
      expect(response.status).toBe(307);
      expect(response.url).toContain('/login');
    });

    it('无效 token 应该返回 401（API）', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/stock/data',
        { cookies: { session: 'invalid-token' } }
      );

      mockVerifyToken.mockResolvedValue(null);

      const response = await middleware(request);
      expect(response.status).toBe(401);
      expect(response.ok).toBe(false);
    });
  });

  // ============= Cookie 处理测试 =============

  describe('Cookie 处理', () => {
    it('没有 session cookie 应该被拦截', async () => {
      const request = createMockRequest('http://localhost:3000/');

      mockVerifyToken.mockResolvedValue(null);

      const response = await middleware(request);
      expect(response.status).toBe(307);
    });

    it('有效的 session cookie 应该被接受', async () => {
      const request = createMockRequest('http://localhost:3000/', {
        cookies: { session: 'valid-session-token' },
      });

      mockVerifyToken.mockResolvedValue(testUser);

      const response = await middleware(request);
      expect(response.status).toBe(200);
    });
  });

  // ============= 路径匹配测试 =============

  describe('路径匹配', () => {
    it('应该保护 /live 路径', async () => {
      const request = createMockRequest('http://localhost:3000/live');

      mockVerifyToken.mockResolvedValue(null);

      const response = await middleware(request);
      expect(response.status).toBe(307);
    });

    it('应该保护 /results 路径', async () => {
      const request = createMockRequest('http://localhost:3000/results');

      mockVerifyToken.mockResolvedValue(null);

      const response = await middleware(request);
      expect(response.status).toBe(307);
    });

    it('应该保护 /api/backtest/run 路径', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/backtest/run'
      );

      mockVerifyToken.mockResolvedValue(null);

      const response = await middleware(request);
      expect(response.status).toBe(401);
    });

    it('应该保护 /api/history/* 路径', async () => {
      const paths = [
        '/api/history/trades',
        '/api/history/positions',
        '/api/history/decisions',
      ];

      for (const path of paths) {
        const request = createMockRequest(`http://localhost:3000${path}`);

        mockVerifyToken.mockResolvedValue(null);

        const response = await middleware(request);
        expect(response.status).toBe(401);
      }
    });
  });

  // ============= 用户角色测试 =============

  describe('用户角色', () => {
    it('admin 用户应该可以访问所有页面', async () => {
      const adminUser = { ...testUser, role: 'admin' as const };
      const request = createMockRequest('http://localhost:3000/', {
        cookies: { session: 'admin-token' },
      });

      mockVerifyToken.mockResolvedValue(adminUser);

      const response = await middleware(request);
      expect(response.status).toBe(200);
    });

    it('trader 用户应该可以访问基本页面', async () => {
      const traderUser = { ...testUser, role: 'trader' as const };
      const request = createMockRequest('http://localhost:3000/live', {
        cookies: { session: 'trader-token' },
      });

      mockVerifyToken.mockResolvedValue(traderUser);

      const response = await middleware(request);
      expect(response.status).toBe(200);
    });
  });

  // ============= Token 验证调用测试 =============

  describe('Token 验证行为', () => {
    it('公开路径不应该调用 verifyToken', async () => {
      const request = createMockRequest('http://localhost:3000/login');

      await middleware(request);

      expect(mockVerifyToken).not.toHaveBeenCalled();
    });

    it('受保护路径应该调用 verifyToken', async () => {
      const request = createMockRequest('http://localhost:3000/', {
        cookies: { session: 'some-token' },
      });

      await middleware(request);

      expect(mockVerifyToken).toHaveBeenCalledWith('some-token');
    });

    it('没有 cookie 不应该调用 verifyToken', async () => {
      const request = createMockRequest('http://localhost:3000/');

      await middleware(request);

      expect(mockVerifyToken).not.toHaveBeenCalled();
    });
  });
});
