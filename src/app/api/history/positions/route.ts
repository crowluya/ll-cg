import { NextRequest, NextResponse } from 'next/server';
import { getHistoryPositions, getTrades, getAIDecisions } from '@/lib/db/queries';

/**
 * GET /api/history/positions
 * 查询历史持仓
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const model = searchParams.get('model');
    const stock = searchParams.get('stock');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const positions = await getHistoryPositions({
      model: model || undefined,
      stock: stock || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return NextResponse.json({
      success: true,
      data: positions,
      count: positions.length,
    });
  } catch (error) {
    console.error('Error in /api/history/positions:', error);
    return NextResponse.json(
      { success: false, error: '查询失败' },
      { status: 500 }
    );
  }
}
