import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers';
import { scan } from '@/lib/scanner/scan';
import { DEFAULT_FILTERS, type FilterConfig } from '@/lib/scanner/filter';
import { DEFAULT_WEIGHTS, type RankWeights } from '@/lib/scanner/rank';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ScanRequest {
  filters?: Partial<FilterConfig>;
  weights?: Partial<RankWeights>;
  watchlist?: string[];
}

export async function POST(req: NextRequest) {
  let body: ScanRequest = {};
  try {
    body = await req.json();
  } catch {
    // empty body is OK — use defaults
  }

  const filters: FilterConfig = { ...DEFAULT_FILTERS, ...(body.filters ?? {}) };
  const weights: RankWeights = { ...DEFAULT_WEIGHTS, ...(body.weights ?? {}) };
  const watchlist = (body.watchlist ?? []).filter((s) => typeof s === 'string').map((s) => s.toUpperCase());

  const provider = getProvider();
  try {
    const results = await scan({ provider, filters, weights, watchlist });
    return NextResponse.json({
      ok: true,
      provider: provider.name,
      results,
      ts: Date.now(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? 'scan failed' },
      { status: 500 },
    );
  }
}
