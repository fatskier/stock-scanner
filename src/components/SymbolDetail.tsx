'use client';

import { useEffect, useState } from 'react';
import IntradayChart from './Chart';
import type { CalculatedMetrics } from '@/lib/scanner/calculate';
import type { IntradayBar, Quote } from '@/lib/providers/types';

interface SymbolResponse {
  ok: boolean;
  symbol: string;
  quote?: Quote;
  metrics?: CalculatedMetrics | null;
  bars?: IntradayBar[];
  error?: string;
}

export default function SymbolDetail({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  const [data, setData] = useState<SymbolResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/symbol/${encodeURIComponent(symbol)}`)
      .then((r) => r.json() as Promise<SymbolResponse>)
      .then((d) => {
        if (cancelled) return;
        if (!d.ok) throw new Error(d.error ?? 'failed');
        setData(d);
      })
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div className="border border-gray-800 rounded p-3 space-y-3 bg-gray-900/40">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">{symbol}</h2>
          {data?.quote?.shortName && (
            <div className="text-xs text-gray-500 truncate max-w-[200px]">{data.quote.shortName}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data?.metrics && (
            <span className="text-sm text-gray-300">${data.metrics.price.toFixed(2)}</span>
          )}
          <button
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-300"
            aria-label="Close detail"
          >
            ✕
          </button>
        </div>
      </div>

      {loading && <div className="text-xs text-gray-500">Loading…</div>}
      {error && <div className="text-xs text-red-400">{error}</div>}

      {data?.bars && data.metrics && (
        <>
          <IntradayChart
            bars={data.bars}
            premarketHigh={data.metrics.premarketHigh}
            recentResistance={data.metrics.recentResistance}
          />
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <Row label="PM high" value={data.metrics.premarketHigh?.toFixed(2) ?? '—'} />
            <Row label="vs PMH" value={fmtPct(data.metrics.distanceToPmHighPct)} />
            <Row label="5m" value={fmtPct(data.metrics.changePct5m)} />
            <Row label="15m" value={fmtPct(data.metrics.changePct15m)} />
            <Row label="RVol" value={data.metrics.relativeVolume?.toFixed(2) ?? '—'} />
            <Row label="Vol" value={fmtVol(data.metrics.cumulativeVolume)} />
            <Row label="ADV (30d)" value={data.metrics.averageDailyVolume ? fmtVol(data.metrics.averageDailyVolume) : '—'} />
            <Row label="Mkt cap" value={data.quote?.marketCap ? fmtVol(data.quote.marketCap) : '—'} />
          </dl>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-200 text-right tabular-nums">{value}</dd>
    </>
  );
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

function fmtVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}
