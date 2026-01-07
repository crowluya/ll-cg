import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// JWT 密钥（应该从环境变量读取）
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

// Session 有效期（7天）
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000;

// 用户信息类型
export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'trader';
}

// Session 数据类型
export interface SessionData extends User {
  expiresAt: Date;
}

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 生成 JWT Token
 */
export async function generateToken(user: User): Promise<string> {
  return new SignJWT({
    userId: user.id,
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * 验证 JWT Token
 */
export async function verifyToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // 从数据库获取完整用户信息
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId as string),
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as 'admin' | 'trader',
      expiresAt: new Date((payload.exp as number) * 1000),
    };
  } catch {
    return null;
  }
}

/**
 * 设置登录 Cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY / 1000,
    path: '/',
  });
}

/**
 * 清除登录 Cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

/**
 * 获取当前会话用户
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (!sessionToken) {
    return null;
  }

  return verifyToken(sessionToken);
}

/**
 * 验证用户名密码并返回用户信息
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<User | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role as 'admin' | 'trader',
  };
}

/**
 * 检查是否为管理员
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === 'admin';
}

/**
 * 需要登录的 API 路由保护
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

/**
 * 需要管理员权限的 API 路由保护
 */
export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth();
  if (session.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return session;
}
