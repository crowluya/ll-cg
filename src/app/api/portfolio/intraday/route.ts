import { NextResponse } from 'next/server';
import { getPortfolioIntradayData } from '@/lib/portfolio/intraday';

export async function GET() {
  try {
    const data = await getPortfolioIntradayData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in /api/portfolio/intraday:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch intraday portfolio data',
      },
      { status: 500 }
    );
  }
}
