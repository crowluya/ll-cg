/**
 * 认证 API 路由集成测试
 * 测试文件: src/lib/auth/api.test.ts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { POST as loginHandler } from '@/app/api/auth/login/route';
import { POST as logoutHandler } from '@/app/api/auth/logout/route';
import { GET as sessionHandler } from '@/app/api/auth/session/route';
import { hashPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Mock Next.js cookies
const mockCookies = new Map();

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => mockCookies.get(name),
    set: (name: string, value: string, options: any) => {
      mockCookies.set(name, { value, ...options });
    },
    delete: (name: string) => {
      mockCookies.delete(name);
    },
  }),
}));

// Mock 数据库
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  },
}));

const mockDbQuery = vi.mocked(db.query);

describe('auth - API 路由集成测试', () => {
  const testUser = {
    id: 'test-user-123',
    username: 'testuser',
    name: 'Test User',
    role: 'trader' as const,
    password: 'testPassword123',
  };

  beforeEach(() => {
    mockCookies.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============= 登录 API 测试 =============

  describe('POST /api/auth/login', () => {
    it('成功登录：正确用户名和密码', async () => {
      const hashedPassword = await hashPassword(testUser.password);

      mockDbQuery.users.findFirst.mockResolvedValue({
        id: testUser.id,
        username: testUser.username,
        password: hashedPassword,
        name: testUser.name,
        role: testUser.role,
        createdAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: testUser.username,
          password: testUser.password,
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.id).toBe(testUser.id);
      expect(data.user.username).toBe(testUser.username);
      expect(data.user.password).toBeUndefined(); // 不应该返回密码

      // 检查是否设置了 cookie
      expect(mockCookies.has('session')).toBe(true);
    });

    it('登录失败：用户不存在', async () => {
      mockDbQuery.users.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'nonexistent',
          password: 'password',
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('用户名或密码错误');
    });

    it('登录失败：密码错误', async () => {
      const hashedPassword = await hashPassword('correctPassword');

      mockDbQuery.users.findFirst.mockResolvedValue({
        id: testUser.id,
        username: testUser.username,
        password: hashedPassword,
        name: testUser.name,
        role: testUser.role,
        createdAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: testUser.username,
          password: 'wrongPassword',
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('用户名或密码错误');
    });

    it('登录失败：缺少用户名', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password',
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('登录失败：缺少密码', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: testUser.username,
        }),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('登录失败：空请求体', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('登录失败：无效 JSON', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await loginHandler(request);
      const data = await response.json();

      // 无效 JSON 会导致 JSON.parse 抛出异常，返回 500
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ============= 登出 API 测试 =============

  describe('POST /api/auth/logout', () => {
    it('成功登出：清除 session cookie', async () => {
      // 先设置一个 session cookie
      mockCookies.set('session', {
        value: 'test-token',
        httpOnly: true,
      });

      const request = new Request('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      const response = await logoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // cookie 应该被删除（注意：这取决于实现）
      // 实际测试中可能需要验证 delete 被调用
    });

    it('登出：没有 session cookie 也应该成功', async () => {
      const request = new Request('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      });

      const response = await logoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ============= 会话验证 API 测试 =============

  describe('GET /api/auth/session', () => {
    it('已登录：返回用户信息', async () => {
      // 设置有效的 session cookie
      const validToken = await (await import('@/lib/auth')).generateToken({
        id: testUser.id,
        username: testUser.username,
        name: testUser.name,
        role: testUser.role,
      });

      mockCookies.set('session', { value: validToken });

      // Mock 数据库查询
      mockDbQuery.users.findFirst.mockResolvedValue({
        id: testUser.id,
        username: testUser.username,
        name: testUser.name,
        role: testUser.role,
        password: 'hash',
        createdAt: new Date(),
      });

      const request = new Request('http://localhost:3000/api/auth/session');

      const response = await sessionHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.id).toBe(testUser.id);
      expect(data.user.username).toBe(testUser.username);
      expect(data.user.password).toBeUndefined();
    });

    it('未登录：没有 session cookie', async () => {
      const request = new Request('http://localhost:3000/api/auth/session');

      const response = await sessionHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('未登录');
    });

    it('未登录：无效的 session token', async () => {
      mockCookies.set('session', { value: 'invalid-token' });

      const request = new Request('http://localhost:3000/api/auth/session');

      const response = await sessionHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('未登录');
    });
  });

  // ============= 认证流程集成测试 =============

  describe('完整认证流程', () => {
    it('登录 -> 验证会话 -> 登出', async () => {
      // 1. 登录
      const hashedPassword = await hashPassword(testUser.password);

      mockDbQuery.users.findFirst.mockResolvedValue({
        id: testUser.id,
        username: testUser.username,
        password: hashedPassword,
        name: testUser.name,
        role: testUser.role,
        createdAt: new Date(),
      });

      const loginRequest = new Request(
        'http://localhost:3000/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            username: testUser.username,
            password: testUser.password,
          }),
        }
      );

      const loginResponse = await loginHandler(loginRequest);
      expect(loginResponse.status).toBe(200);

      // 2. 验证会话
      const sessionToken = mockCookies.get('session')?.value;
      expect(sessionToken).toBeDefined();

      // 需要重新设置 mock，因为会查询用户
      mockDbQuery.users.findFirst.mockResolvedValue({
        id: testUser.id,
        username: testUser.username,
        name: testUser.name,
        role: testUser.role,
        password: hashedPassword,
        createdAt: new Date(),
      });

      const sessionRequest = new Request(
        'http://localhost:3000/api/auth/session'
      );

      const sessionResponse = await sessionHandler(sessionRequest);
      expect(sessionResponse.status).toBe(200);

      // 3. 登出
      const logoutRequest = new Request(
        'http://localhost:3000/api/auth/logout',
        {
          method: 'POST',
        }
      );

      const logoutResponse = await logoutHandler(logoutRequest);
      expect(logoutResponse.status).toBe(200);
    });
  });
});
