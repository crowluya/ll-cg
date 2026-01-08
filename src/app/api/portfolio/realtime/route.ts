import { NextResponse } from 'next/server';
import { getPortfolioRealtimePoints } from '@/lib/portfolio/realtime';

export async function GET() {
  try {
    const points = getPortfolioRealtimePoints();
    return NextResponse.json({ success: true, data: { points } });
  } catch (error) {
    console.error('Error in /api/portfolio/realtime:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch portfolio realtime data',
      },
      { status: 500 }
    );
  }
}
