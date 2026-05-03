import { toZonedTime } from 'date-fns-tz';
import type { IntradayBar, DailyBar } from '../providers/types';

const ET = 'America/New_York';
const PREMARKET_START = 4 * 60; // 04:00 ET
const REGULAR_OPEN = 9 * 60 + 30; // 09:30 ET
const REGULAR_CLOSE = 16 * 60; // 16:00 ET
const REGULAR_MINUTES = REGULAR_CLOSE - REGULAR_OPEN; // 390

function etMinutes(ts: number): number {
  const et = toZonedTime(ts, ET);
  return et.getHours() * 60 + et.getMinutes();
}

function etDate(ts: number): string {
  const et = toZonedTime(ts, ET);
  return `${et.getFullYear()}-${String(et.getMonth() + 1).padStart(2, '0')}-${String(et.getDate()).padStart(2, '0')}`;
}

export function isPremarket(ts: number): boolean {
  const m = etMinutes(ts);
  return m >= PREMARKET_START && m < REGULAR_OPEN;
}

export function isRegularHours(ts: number): boolean {
  const m = etMinutes(ts);
  return m >= REGULAR_OPEN && m < REGULAR_CLOSE;
}

/**
 * Approximate the cumulative-volume fraction expected by this point in the
 * trading day. Premarket counts for ~7% of average daily volume; the rest
 * grows linearly across the regular session.
 */
function expectedVolumeFraction(ts: number): number {
  const m = etMinutes(ts);
  if (m < PREMARKET_START) return 0.005;
  if (m < REGULAR_OPEN) {
    // Premarket: 0.5% → 7% across 04:00–09:30
    const pmFrac = (m - PREMARKET_START) / (REGULAR_OPEN - PREMARKET_START);
    return 0.005 + pmFrac * 0.065;
  }
  if (m < REGULAR_CLOSE) {
    const rthFrac = (m - REGULAR_OPEN) / REGULAR_MINUTES;
    return 0.07 + rthFrac * 0.93;
  }
  return 1;
}

export interface CalculatedMetrics {
  symbol: string;
  price: number;
  changePct5m: number | null;
  changePct15m: number | null;
  premarketHigh: number | null;
  distanceToPmHighPct: number | null;
  brokePmHigh: boolean;
  minutesSinceBreakout: number | null;
  recentResistance: number | null;
  brokeResistance: boolean;
  cumulativeVolume: number;
  relativeVolume: number | null;
  averageDailyVolume: number | null;
  lastBarTimestamp: number;
}

export function calculate(
  symbol: string,
  intraday: IntradayBar[],
  daily: DailyBar[],
  averageDailyVolumeFallback?: number,
): CalculatedMetrics | null {
  if (intraday.length === 0) return null;

  const sorted = [...intraday].sort((a, b) => a.timestamp - b.timestamp);
  const last = sorted[sorted.length - 1];
  const today = etDate(last.timestamp);
  const todays = sorted.filter((b) => etDate(b.timestamp) === today);
  if (todays.length === 0) return null;

  const premarketBars = todays.filter((b) => isPremarket(b.timestamp));
  const regularBars = todays.filter((b) => isRegularHours(b.timestamp));

  const premarketHigh = premarketBars.length > 0
    ? Math.max(...premarketBars.map((b) => b.high))
    : null;

  const distanceToPmHighPct = premarketHigh != null
    ? ((last.close - premarketHigh) / premarketHigh) * 100
    : null;

  const brokePmHigh = premarketHigh != null && last.close > premarketHigh;

  let minutesSinceBreakout: number | null = null;
  if (brokePmHigh && premarketHigh != null && regularBars.length > 0) {
    for (let i = regularBars.length - 1; i >= 0; i--) {
      const cur = regularBars[i];
      const prev = regularBars[i - 1];
      if (cur.close > premarketHigh && (!prev || prev.close <= premarketHigh)) {
        minutesSinceBreakout = Math.max(0, Math.round((last.timestamp - cur.timestamp) / 60000));
        break;
      }
    }
    // Gapped above at the open.
    if (minutesSinceBreakout == null && regularBars[0].close > premarketHigh) {
      minutesSinceBreakout = Math.round((last.timestamp - regularBars[0].timestamp) / 60000);
    }
  }

  // Recent resistance = highest high of the prior 30 minutes (excluding the last bar).
  const lookback = 30;
  const lastN = todays.slice(Math.max(0, todays.length - lookback - 1), todays.length - 1);
  const recentResistance = lastN.length > 0 ? Math.max(...lastN.map((b) => b.high)) : null;
  const brokeResistance = recentResistance != null && last.close > recentResistance;

  const priceMinutesAgo = (mins: number): number | null => {
    const target = last.timestamp - mins * 60_000;
    let closest: IntradayBar | null = null;
    let bestDiff = Infinity;
    for (const b of todays) {
      if (b.timestamp > target + 30_000) continue;
      const diff = Math.abs(b.timestamp - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        closest = b;
      }
    }
    return closest ? closest.close : null;
  };

  const p5 = priceMinutesAgo(5);
  const p15 = priceMinutesAgo(15);
  const changePct5m = p5 != null ? ((last.close - p5) / p5) * 100 : null;
  const changePct15m = p15 != null ? ((last.close - p15) / p15) * 100 : null;

  const cumulativeVolume = todays.reduce((sum, b) => sum + (b.volume || 0), 0);

  // Average daily volume from the previous N trading days, excluding today.
  const prevDays = daily.filter((d) => d.date !== today).slice(-30);
  const avgFromHistory = prevDays.length > 0
    ? prevDays.reduce((sum, d) => sum + d.volume, 0) / prevDays.length
    : null;
  const averageDailyVolume = avgFromHistory ?? averageDailyVolumeFallback ?? null;

  let relativeVolume: number | null = null;
  if (averageDailyVolume && averageDailyVolume > 0) {
    const fraction = expectedVolumeFraction(last.timestamp);
    if (fraction > 0) {
      relativeVolume = cumulativeVolume / (averageDailyVolume * fraction);
    }
  }

  return {
    symbol,
    price: last.close,
    changePct5m,
    changePct15m,
    premarketHigh,
    distanceToPmHighPct,
    brokePmHigh,
    minutesSinceBreakout,
    recentResistance,
    brokeResistance,
    cumulativeVolume,
    relativeVolume,
    averageDailyVolume,
    lastBarTimestamp: last.timestamp,
  };
}
