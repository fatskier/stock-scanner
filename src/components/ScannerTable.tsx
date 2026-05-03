'use client';

import { useState } from 'react';
import type { ScanResult } from '@/lib/scanner/scan';

type SortKey =
  | 'score'
  | 'symbol'
  | 'price'
  | 'changePct5m'
  | 'changePct15m'
  | 'relativeVolume'
  | 'distanceToPmHighPct'
  | 'cumulativeVolume';

interface Props {
  results: ScanResult[];
  onSelect: (sym: string) => void;
  selected: string | null;
}

export default function ScannerTable({ results, onSelect, selected }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [asc, setAsc] = useState(false);

  const sorted = [...results].sort((a, b) => {
    if (sortKey === 'symbol') {
      return asc ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
    }
    const av = (a[sortKey] ?? -Infinity) as number;
    const bv = (b[sortKey] ?? -Infinity) as number;
    return asc ? av - bv : bv - av;
  });

  const sortBtn = (key: SortKey, label: string, align: 'left' | 'right' = 'left') => (
    <button
      onClick={() => {
        if (sortKey === key) setAsc(!asc);
        else {
          setSortKey(key);
          setAsc(false);
        }
      }}
      className={`hover:text-emerald-400 ${align === 'right' ? 'w-full text-right' : ''}`}
    >
      {label}
      {sortKey === key && <span className="ml-0.5">{asc ? '▲' : '▼'}</span>}
    </button>
  );

  return (
    <div className="border border-gray-800 rounded overflow-hidden bg-gray-900/30">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 text-[11px] uppercase tracking-wide">
            <tr>
              <th className="text-left px-2 py-2">{sortBtn('score', 'Score')}</th>
              <th className="text-left px-2 py-2">{sortBtn('symbol', 'Symbol')}</th>
              <th className="text-right px-2 py-2">{sortBtn('price', 'Price', 'right')}</th>
              <th className="text-right px-2 py-2">{sortBtn('changePct5m', '5m %', 'right')}</th>
              <th className="text-right px-2 py-2">{sortBtn('changePct15m', '15m %', 'right')}</th>
              <th className="text-right px-2 py-2">{sortBtn('relativeVolume', 'RVol', 'right')}</th>
              <th className="text-right px-2 py-2">{sortBtn('distanceToPmHighPct', 'vs PMH', 'right')}</th>
              <th className="text-right px-2 py-2">{sortBtn('cumulativeVolume', 'Vol', 'right')}</th>
              <th className="text-left px-2 py-2">Status</th>
              <th className="text-left px-2 py-2">Why</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-10 text-gray-500">
                  No matches. Adjust filters or wait for the next refresh.
                </td>
              </tr>
            )}
            {sorted.map((r) => {
              const status = statusFor(r);
              const isSel = selected === r.symbol;
              return (
                <tr
                  key={r.symbol}
                  onClick={() => onSelect(r.symbol)}
                  className={`cursor-pointer border-t border-gray-800 hover:bg-gray-900 ${
                    isSel ? 'bg-gray-900' : ''
                  }`}
                >
                  <td className="px-2 py-1.5 font-mono text-emerald-300">{r.score.toFixed(1)}</td>
                  <td className="px-2 py-1.5 font-medium">{r.symbol}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">${r.price.toFixed(2)}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${pctColor(r.changePct5m)}`}>
                    {fmtPct(r.changePct5m)}
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${pctColor(r.changePct15m)}`}>
                    {fmtPct(r.changePct15m)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {r.relativeVolume != null ? `${r.relativeVolume.toFixed(2)}x` : '—'}
                  </td>
                  <td className={`px-2 py-1.5 text-right tabular-nums ${pctColor(r.distanceToPmHighPct)}`}>
                    {fmtPct(r.distanceToPmHighPct)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-gray-400">
                    {fmtVol(r.cumulativeVolume)}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${status.cls}`}>{status.label}</span>
                  </td>
                  <td className="px-2 py-1.5 text-xs text-gray-400 max-w-[280px] truncate">
                    {r.reasons.join(' · ') || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusFor(r: ScanResult): { label: string; cls: string } {
  if (r.brokePmHigh && r.minutesSinceBreakout != null && r.minutesSinceBreakout <= 5) {
    return { label: 'Fresh breakout', cls: 'bg-emerald-500 text-emerald-950 font-medium' };
  }
  if (r.brokePmHigh) {
    return { label: 'Above PMH', cls: 'bg-emerald-900/70 text-emerald-300' };
  }
  if (r.distanceToPmHighPct != null && Math.abs(r.distanceToPmHighPct) < 0.5) {
    return { label: 'Near PMH', cls: 'bg-amber-900/60 text-amber-300' };
  }
  return { label: '—', cls: 'bg-gray-800 text-gray-500' };
}

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

function pctColor(v: number | null): string {
  if (v == null) return 'text-gray-500';
  if (v > 0) return 'text-emerald-400';
  if (v < 0) return 'text-rose-400';
  return 'text-gray-400';
}

function fmtVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}
