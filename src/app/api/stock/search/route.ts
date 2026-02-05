/**
 * 股票搜索API
 * Phase 6.4: 股票搜索API实现
 * 
 * GET /api/stock/search
 * 搜索股票（按代码或名称）
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchStock } from '@/lib/data/sina-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // 参数验证
    if (!query) {
      return NextResponse.json(
        { error: '请提供搜索关键词（q参数）' },
        { status: 400 }
      );
    }

    // 搜索股票
    const results = await searchStock(query);

    // 限制返回数量
    const limitedResults = results.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: limitedResults,
      count: limitedResults.length,
      total: results.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '搜索失败';
    
    console.error('[API] 股票搜索失败:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
