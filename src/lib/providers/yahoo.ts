import YahooFinance from 'yahoo-finance2';
import type {
  DataProvider,
  IntradayBar,
  DailyBar,
  Quote,
  IntradayOptions,
} from './types';

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
  // Yahoo's response shape drifts. Be lenient so unknown fields don't crash us.
  validation: { logErrors: false, logOptionsErrors: false, allowAdditionalProps: true },
});

const SCREENERS = ['most_actives', 'day_gainers'] as const;
const SYMBOL_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;

export class YahooProvider implements DataProvider {
  readonly name = 'yahoo';

  async getUniverse(): Promise<string[]> {
    const symbols = new Set<string>();
    await Promise.all(
      SCREENERS.map(async (scrIds) => {
        try {
          const result = await yahooFinance.screener({ scrIds, count: 50 });
          for (const q of result.quotes ?? []) {
            const sym = (q as { symbol?: string }).symbol;
            if (sym && SYMBOL_RE.test(sym)) symbols.add(sym);
          }
        } catch (err) {
          console.error(`[yahoo] screener ${scrIds} failed:`, (err as Error).message);
        }
      }),
    );
    return Array.from(symbols);
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];
    try {
      const result = await yahooFinance.quote(symbols);
      const arr = Array.isArray(result) ? result : [result];
      return arr
        .filter((q) => q?.regularMarketPrice != null)
        .map((q) => ({
          symbol: q.symbol,
          shortName: q.shortName ?? q.longName,
          price: q.regularMarketPrice as number,
          marketCap: q.marketCap,
          sharesOutstanding: q.sharesOutstanding,
          averageDailyVolume3Month: q.averageDailyVolume3Month,
          averageDailyVolume10Day: q.averageDailyVolume10Day,
        }));
    } catch (err) {
      console.error('[yahoo] quote batch failed:', (err as Error).message);
      return [];
    }
  }

  async getIntraday(symbol: string, opts: IntradayOptions = {}): Promise<IntradayBar[]> {
    const days = opts.days ?? 7;
    const period2 = new Date();
    const period1 = new Date(period2);
    period1.setDate(period1.getDate() - days);

    const result = await yahooFinance.chart(symbol, {
      period1,
      period2,
      interval: '1m',
      includePrePost: opts.includePrePost ?? true,
    });

    return (result.quotes ?? [])
      .filter((b) => b.close != null && b.open != null && b.high != null && b.low != null)
      .map((b) => ({
        timestamp: new Date(b.date).getTime(),
        open: b.open as number,
        high: b.high as number,
        low: b.low as number,
        close: b.close as number,
        volume: b.volume ?? 0,
      }));
  }

  async getDaily(symbol: string, days: number): Promise<DailyBar[]> {
    const period2 = new Date();
    const period1 = new Date(period2);
    period1.setDate(period1.getDate() - Math.max(days * 2, 60));

    const result = await yahooFinance.chart(symbol, {
      period1,
      period2,
      interval: '1d',
    });

    return (result.quotes ?? [])
      .filter((b) => b.close != null)
      .map((b) => ({
        date: new Date(b.date).toISOString().slice(0, 10),
        open: b.open ?? 0,
        high: b.high ?? 0,
        low: b.low ?? 0,
        close: b.close as number,
        volume: b.volume ?? 0,
      }));
  }
}
