import type { DataProvider, Quote } from '../providers/types';
import { calculate, type CalculatedMetrics } from './calculate';
import { applyFilters, type FilterConfig } from './filter';
import { score, reasonsFor, type RankWeights, DEFAULT_WEIGHTS } from './rank';

export interface ScanResult extends CalculatedMetrics {
  score: number;
  reasons: string[];
  shortName?: string;
  marketCap?: number;
  sharesOutstanding?: number;
}

export interface ScanOptions {
  provider: DataProvider;
  filters: FilterConfig;
  weights?: RankWeights;
  /** Extra symbols to include beyond the provider universe. */
  watchlist?: string[];
  concurrency?: number;
}

export async function scan(opts: ScanOptions): Promise<ScanResult[]> {
  const { provider, filters } = opts;
  const weights = opts.weights ?? DEFAULT_WEIGHTS;
  const concurrency = opts.concurrency ?? 8;

  const universeSymbols = await provider.getUniverse();
  const allSymbols = Array.from(new Set([...universeSymbols, ...(opts.watchlist ?? [])]));
  if (allSymbols.length === 0) return [];

  const quotes = await provider.getQuotes(allSymbols);
  const quoteMap = new Map<string, Quote>(quotes.map((q) => [q.symbol, q]));

  // Pre-filter using cheap quote-level signals to avoid pulling intraday for obvious misses.
  const candidates = quotes
    .filter((q) => {
      if (!q.price) return false;
      if (q.price < filters.minPrice || q.price > filters.maxPrice) return false;
      const adv = q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? 0;
      if (filters.minAverageDailyVolume > 0 && adv < filters.minAverageDailyVolume) return false;
      return true;
    })
    .map((q) => q.symbol);

  const results: ScanResult[] = [];

  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (sym): Promise<ScanResult | null> => {
        try {
          const q = quoteMap.get(sym);
          const advFallback = q?.averageDailyVolume3Month ?? q?.averageDailyVolume10Day;
          const [intraday, daily] = await Promise.all([
            provider.getIntraday(sym, { includePrePost: true, days: 7 }),
            provider.getDaily(sym, 30),
          ]);
          const m = calculate(sym, intraday, daily, advFallback);
          if (!m) return null;
          if (!applyFilters(m, q, filters)) return null;
          return {
            ...m,
            score: score(m, weights),
            reasons: reasonsFor(m),
            shortName: q?.shortName,
            marketCap: q?.marketCap,
            sharesOutstanding: q?.sharesOutstanding,
          };
        } catch (err) {
          console.error(`[scan] ${sym} failed:`, (err as Error).message);
          return null;
        }
      }),
    );
    for (const r of batchResults) if (r) results.push(r);
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
