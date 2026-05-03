'use client';

import { useCallback, useEffect, useState } from 'react';
import FiltersPanel from './FiltersPanel';
import ScannerTable from './ScannerTable';
import SymbolDetail from './SymbolDetail';
import { DEFAULT_FILTERS, type FilterConfig } from '@/lib/scanner/filter';
import type { ScanResult } from '@/lib/scanner/scan';

const REFRESH_MS = 30_000;

export default function Dashboard() {
  const [filters, setFilters] = useState<FilterConfig>(DEFAULT_FILTERS);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ts, setTs] = useState<number | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [selected, setSelected] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);

  const runScan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'scan failed');
      setResults(data.results);
      setTs(data.ts);
      setProvider(data.provider);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    runScan();
  }, [runScan]);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(runScan, REFRESH_MS);
    return () => clearInterval(id);
  }, [auto, runScan]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-semibold">US Equity Breakout Scanner</h1>
          <span className="text-xs text-gray-500">
            {provider && `${provider}`}
            {ts && ` · updated ${new Date(ts).toLocaleTimeString()}`}
            {loading && ' · scanning…'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-400 select-none">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
              className="accent-emerald-500"
            />
            Auto-refresh 30s
          </label>
          <button
            onClick={runScan}
            disabled={loading}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 rounded text-xs font-medium"
          >
            {loading ? 'Scanning…' : 'Run scan'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4 p-4">
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
          <FiltersPanel filters={filters} onChange={setFilters} />
        </aside>

        <main className="col-span-12 md:col-span-9 lg:col-span-7">
          {error && (
            <div className="mb-2 p-2 bg-red-900/40 border border-red-800 text-red-300 text-sm rounded">
              {error}
            </div>
          )}
          <ScannerTable results={results} onSelect={setSelected} selected={selected} />
        </main>

        <section className="col-span-12 lg:col-span-3">
          {selected ? (
            <SymbolDetail symbol={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="text-gray-500 text-sm p-4 border border-gray-800 rounded bg-gray-900/30">
              Select a row to see chart, premarket high, recent resistance, and volume.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
