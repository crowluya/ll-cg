import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, generateToken, setSessionCookie } from '@/lib/auth';
import { z } from 'zod';

// 登录请求验证 schema
const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证请求参数
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: '请求参数错误', details: result.error.errors },
        { status: 400 }
      );
    }

    const { username, password } = result.data;

    // 验证用户名密码
    const user = await authenticateUser(username, password);
    if (!user) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 生成 token
    const token = await generateToken(user);

    // 设置 cookie
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
