import type { CalculatedMetrics } from './calculate';
import type { Quote } from '../providers/types';

export interface FilterConfig {
  minRelativeVolume: number;
  minPrice: number;
  maxPrice: number;
  minAverageDailyVolume: number;
  minCurrentVolume: number;
  minChangePct5m: number;
  minChangePct15m: number;
  /** Only show symbols whose last price is within this many % of the premarket high (above or below). null = off. */
  withinPctOfPmHigh: number | null;
  /** Only show symbols that broke premarket high within the last N minutes. null = off. */
  brokePmHighWithinMinutes: number | null;
  requireBreakout: boolean;
}

export const DEFAULT_FILTERS: FilterConfig = {
  minRelativeVolume: 1.5,
  minPrice: 1,
  maxPrice: 1000,
  minAverageDailyVolume: 500_000,
  minCurrentVolume: 100_000,
  minChangePct5m: 0,
  minChangePct15m: 0,
  withinPctOfPmHigh: null,
  brokePmHighWithinMinutes: null,
  requireBreakout: false,
};

export function applyFilters(
  m: CalculatedMetrics,
  q: Quote | undefined,
  cfg: FilterConfig,
): boolean {
  if (m.price < cfg.minPrice || m.price > cfg.maxPrice) return false;

  if (cfg.minAverageDailyVolume > 0) {
    const adv = m.averageDailyVolume ?? q?.averageDailyVolume3Month ?? 0;
    if (adv < cfg.minAverageDailyVolume) return false;
  }

  if (m.cumulativeVolume < cfg.minCurrentVolume) return false;

  if (cfg.minRelativeVolume > 0) {
    if (m.relativeVolume == null || m.relativeVolume < cfg.minRelativeVolume) return false;
  }

  if (cfg.minChangePct5m > 0) {
    if (m.changePct5m == null || m.changePct5m < cfg.minChangePct5m) return false;
  }

  if (cfg.minChangePct15m > 0) {
    if (m.changePct15m == null || m.changePct15m < cfg.minChangePct15m) return false;
  }

  if (cfg.withinPctOfPmHigh != null) {
    if (m.distanceToPmHighPct == null) return false;
    if (Math.abs(m.distanceToPmHighPct) > cfg.withinPctOfPmHigh) return false;
  }

  if (cfg.brokePmHighWithinMinutes != null) {
    if (!m.brokePmHigh) return false;
    if (m.minutesSinceBreakout == null || m.minutesSinceBreakout > cfg.brokePmHighWithinMinutes) {
      return false;
    }
  }

  if (cfg.requireBreakout && !m.brokePmHigh) return false;

  return true;
}
