import { NextRequest, NextResponse } from 'next/server';
import { getAIDecisions } from '@/lib/db/queries';

/**
 * GET /api/history/decisions
 * 查询AI操作记录
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const model = searchParams.get('model');
    const stock = searchParams.get('stock');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const decisions = await getAIDecisions({
      model: model || undefined,
      stock: stock || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: decisions,
      count: decisions.length,
    });
  } catch (error) {
    console.error('Error in /api/history/decisions:', error);
    return NextResponse.json(
      { success: false, error: '查询失败' },
      { status: 500 }
    );
  }
}
