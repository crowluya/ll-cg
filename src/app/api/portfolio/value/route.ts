import { NextRequest, NextResponse } from 'next/server';
import { generateMockPortfolioData } from '@/lib/mock/portfolio-data';

/**
 * GET /api/portfolio/value
 *
 * Query parameters:
 * - range: 'all' | '1d' | '72h' | '1w' | '1m' (default: 'all')
 * - initialAmount: number (default: 100000)
 *
 * Returns portfolio value data for benchmark, deepseek, and gemini models
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = (searchParams.get('range') as 'all' | '1d' | '72h' | '1w' | '1m') || 'all';
    const initialAmount = Number(searchParams.get('initialAmount')) || 100000;

    // TODO: Replace with real data fetching from database
    // For now, use mock data
    const mockData = generateMockPortfolioData({
      initialAmount,
      days: 30,
      pointsPerDay: 8,
    });

    // Filter by time range if needed
    const data = range === 'all' ? mockData : mockData;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/portfolio/value
 *
 * Body parameters:
 * - stocks: Array of { code: string, buyPrice: number, quantity: number, model: 'deepseek' | 'gemini' }
 * - initialAmount: number
 *
 * Calculate portfolio values based on current stock prices
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stocks, initialAmount = 100000 } = body;

    // TODO: Implement real calculation
    // 1. Fetch current prices from Sina API
    // 2. Calculate portfolio values for each model
    // 3. Return time series data

    return NextResponse.json({ message: 'Not implemented yet' }, { status: 501 });
  } catch (error) {
    console.error('Error calculating portfolio values:', error);
    return NextResponse.json(
      { error: 'Failed to calculate portfolio values' },
      { status: 500 }
    );
  }
}
