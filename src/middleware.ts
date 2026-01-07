import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// 指定使用 Node.js runtime（因为需要 jose 和其他 Node.js 模块）
export const runtime = 'nodejs';

// 不需要登录的路径
const publicPaths = ['/login', '/api/auth/login'];

// API 路径前缀
const apiPrefix = '/api';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是公开路径
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // 对于 API 路由，检查 session cookie
  // 对于页面路由，检查 session cookie
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    // 未登录，跳转到登录页
    if (pathname.startsWith(apiPrefix)) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 验证 token
  const session = await verifyToken(sessionToken);

  if (!session) {
    // token 无效，清除 cookie 并跳转到登录页
    const response = pathname.startsWith(apiPrefix)
      ? NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));

    response.cookies.delete('session');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (favicon 文件)
     * - public folder 中的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
