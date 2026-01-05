import { NextRequest, NextResponse } from 'next/server';
import { fetchStockData, fetchBatchStockData, fetchRealtimeData, standardizeStockCode } from '@/lib/data/sina-api';
import { getOrSetStockData } from '@/lib/data/cache';

/**
 * GET /api/stock/data
 * 获取股票数据
 *
 * 查询参数:
 * - code: 股票代码 (必填)
 * - days: 天数 (可选，默认30)
 * - realtime: 是否获取实时数据 (可选，默认false)
 * - batch: 是否批量获取 (可选，默认false)
 * - codes: 批量获取时的股票代码列表 (逗号分隔)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const days = parseInt(searchParams.get('days') || '30', 10);
    const realtime = searchParams.get('realtime') === 'true';
    const batch = searchParams.get('batch') === 'true';
    const codesParam = searchParams.get('codes');

    // 参数验证
    if (batch && codesParam) {
      // 批量获取
      const codes = codesParam.split(',').map(c => c.trim()).filter(c => c);
      if (codes.length === 0) {
        return NextResponse.json(
          { success: false, error: '至少提供一个股票代码' },
          { status: 400 }
        );
      }

      // 限制批量数量
      if (codes.length > 20) {
        return NextResponse.json(
          { success: false, error: '批量获取最多支持20只股票' },
          { status: 400 }
        );
      }

      const data = await fetchBatchStockData(codes, days);

      // 转换 Map 为对象
      const result: Record<string, any> = {};
      for (const [key, value] of data.entries()) {
        result[key] = value;
      }

      return NextResponse.json({
        success: true,
        data: result,
        count: result.length,
      });
    }

    if (!code) {
      return NextResponse.json(
        { success: false, error: '请提供股票代码 (code 参数)' },
        { status: 400 }
        );
    }

    // 标准化股票代码
    const standardCode = standardizeStockCode(code);

    // 验证天数参数
    if (days < 1 || days > 365) {
      return NextResponse.json(
        { success: false, error: '天数参数应在 1-365 之间' },
        { status: 400 }
      );
    }

    // 获取实时数据
    if (realtime) {
      const realtimeData = await fetchRealtimeData(standardCode);

      if (!realtimeData) {
        return NextResponse.json(
          { success: false, error: '无法获取实时数据' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: realtimeData,
      });
    }

    // 获取历史K线数据（带缓存）
    const data = await getOrSetStockData(
      standardCode,
      days,
      () => fetchStockData(standardCode, days)
    );

    return NextResponse.json({
      success: true,
      data: {
        code: standardCode,
        days,
        count: data.length,
        quotes: data,
      },
    });

  } catch (error) {
    console.error('Error in /api/stock/data:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取股票数据失败',
      },
      { status: 500 }
    );
  }
}

/**
 * 获取股票列表（常用股票）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codes, days = 30 } = body;

    if (!Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供股票代码数组' },
        { status: 400 }
      );
    }

    // 限制批量数量
    if (codes.length > 20) {
      return NextResponse.json(
        { success: false, error: '批量获取最多支持20只股票' },
        { status: 400 }
      );
    }

    const data = await fetchBatchStockData(codes, days);

    // 转换 Map 为对象
    const result: Record<string, any> = {};
    for (const [key, value] of data.entries()) {
      result[key] = value;
    }

    return NextResponse.json({
      success: true,
      data: result,
      count: Object.keys(result).length,
    });

  } catch (error) {
    console.error('Error in /api/stock/data POST:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '批量获取股票数据失败',
      },
      { status: 500 }
    );
  }
}
