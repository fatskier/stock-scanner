import type { CalculatedMetrics } from './calculate';

export interface RankWeights {
  relativeVolume: number;
  change5m: number;
  change15m: number;
  breakoutFreshness: number;
  distanceAbovePmHigh: number;
  liquidity: number;
}

export const DEFAULT_WEIGHTS: RankWeights = {
  relativeVolume: 25,
  change5m: 20,
  change15m: 15,
  breakoutFreshness: 20,
  distanceAbovePmHigh: 10,
  liquidity: 10,
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function score(m: CalculatedMetrics, w: RankWeights = DEFAULT_WEIGHTS): number {
  const rvol = m.relativeVolume ?? 0;
  const ch5 = m.changePct5m ?? 0;
  const ch15 = m.changePct15m ?? 0;
  const dist = m.distanceToPmHighPct ?? 0;
  const adv = m.averageDailyVolume ?? 0;

  const rvolScore = clamp01((rvol - 1) / 4);                 // rvol 1→0, rvol 5→1
  const ch5Score = clamp01(ch5 / 3);                         // +3% in 5m → 1
  const ch15Score = clamp01(ch15 / 5);                       // +5% in 15m → 1
  const distScore = m.brokePmHigh ? clamp01(dist / 3) : 0;   // 3% above PMH → 1
  const liqScore = clamp01(Math.log10(Math.max(1, adv / 100_000)) / 3); // ~100M ADV → 1
  const freshScore = m.brokePmHigh && m.minutesSinceBreakout != null
    ? clamp01(1 - m.minutesSinceBreakout / 30)               // breakout 0min → 1, 30min → 0
    : 0;

  return (
    w.relativeVolume * rvolScore +
    w.change5m * ch5Score +
    w.change15m * ch15Score +
    w.breakoutFreshness * freshScore +
    w.distanceAbovePmHigh * distScore +
    w.liquidity * liqScore
  );
}

export function reasonsFor(m: CalculatedMetrics): string[] {
  const reasons: string[] = [];

  if (m.relativeVolume != null) {
    if (m.relativeVolume >= 2) reasons.push(`RVol ${m.relativeVolume.toFixed(1)}x (high)`);
    else if (m.relativeVolume >= 1.5) reasons.push(`RVol ${m.relativeVolume.toFixed(1)}x`);
  }

  if (m.brokePmHigh && m.minutesSinceBreakout != null && m.minutesSinceBreakout <= 5) {
    reasons.push(`Broke PMH ${m.minutesSinceBreakout}m ago`);
  } else if (m.brokePmHigh && m.distanceToPmHighPct != null) {
    reasons.push(`Above PMH +${m.distanceToPmHighPct.toFixed(2)}%`);
  } else if (m.distanceToPmHighPct != null && Math.abs(m.distanceToPmHighPct) < 0.5) {
    reasons.push('Testing PMH');
  }

  if (m.changePct5m != null && m.changePct5m >= 1) {
    reasons.push(`+${m.changePct5m.toFixed(2)}% 5m`);
  }
  if (m.changePct15m != null && m.changePct15m >= 2) {
    reasons.push(`+${m.changePct15m.toFixed(2)}% 15m`);
  }
  if (m.brokeResistance) reasons.push('Broke 30m high');

  return reasons;
}
