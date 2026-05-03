export interface IntradayBar {
  timestamp: number; // ms epoch
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DailyBar {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  shortName?: string;
  price: number;
  marketCap?: number;
  sharesOutstanding?: number;
  averageDailyVolume3Month?: number;
  averageDailyVolume10Day?: number;
}

export interface IntradayOptions {
  includePrePost?: boolean;
  days?: number;
}

export interface DataProvider {
  readonly name: string;
  /** Candidate symbols to scan (e.g. most-active + day-gainers). */
  getUniverse(): Promise<string[]>;
  /** Batch quote lookup. */
  getQuotes(symbols: string[]): Promise<Quote[]>;
  /** 1-minute bars for a symbol. */
  getIntraday(symbol: string, opts?: IntradayOptions): Promise<IntradayBar[]>;
  /** Daily bars for a symbol (most recent first or last is fine). */
  getDaily(symbol: string, days: number): Promise<DailyBar[]>;
}
