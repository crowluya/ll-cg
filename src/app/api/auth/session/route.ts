import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: session.id,
        username: session.username,
        name: session.name,
        role: session.role,
      },
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: '获取会话失败' },
      { status: 500 }
    );
  }
}
