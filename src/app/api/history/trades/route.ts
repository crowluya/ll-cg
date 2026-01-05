import { NextRequest, NextResponse } from 'next/server';
import { getTrades } from '@/lib/db/queries';

/**
 * GET /api/history/trades
 * 查询历史交易记录
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const model = searchParams.get('model');
    const stock = searchParams.get('stock');
    const type = searchParams.get('type') as 'buy' | 'sell' | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const trades = await getTrades({
      model: model || undefined,
      stock: stock || undefined,
      type: type || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: trades,
      count: trades.length,
    });
  } catch (error) {
    console.error('Error in /api/history/trades:', error);
    return NextResponse.json(
      { success: false, error: '查询失败' },
      { status: 500 }
    );
  }
}
