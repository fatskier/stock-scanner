import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers';
import { calculate } from '@/lib/scanner/calculate';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase();
  const provider = getProvider();

  try {
    const [intraday, daily, quotes] = await Promise.all([
      provider.getIntraday(symbol, { includePrePost: true, days: 7 }),
      provider.getDaily(symbol, 30),
      provider.getQuotes([symbol]),
    ]);

    const quote = quotes[0];
    const advFallback = quote?.averageDailyVolume3Month ?? quote?.averageDailyVolume10Day;
    const metrics = calculate(symbol, intraday, daily, advFallback);

    return NextResponse.json({
      ok: true,
      symbol,
      quote,
      metrics,
      bars: intraday,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? 'failed' },
      { status: 500 },
    );
  }
}
