'use client';

import type { FilterConfig } from '@/lib/scanner/filter';

interface Props {
  filters: FilterConfig;
  onChange: (f: FilterConfig) => void;
}

function NumField({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-gray-400">
      {label}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100"
      />
    </label>
  );
}

function NullableNumField({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-gray-400">
      {label}
      <input
        type="number"
        step={step}
        value={value ?? ''}
        placeholder="off"
        onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
        className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100"
      />
    </label>
  );
}

export default function FiltersPanel({ filters, onChange }: Props) {
  const set = <K extends keyof FilterConfig>(k: K, v: FilterConfig[K]) =>
    onChange({ ...filters, [k]: v });

  const aggressive = filters.minRelativeVolume >= 2;

  return (
    <div className="space-y-3 p-3 border border-gray-800 rounded bg-gray-900/40">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-sm">Filters</h2>
        <button
          onClick={() => set('minRelativeVolume', aggressive ? 1.5 : 2)}
          className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wide ${
            aggressive ? 'bg-emerald-600 text-emerald-50' : 'bg-gray-800 text-gray-400'
          }`}
          title="Toggle relative-volume floor between 1.5x and 2.0x"
        >
          {aggressive ? 'Aggressive' : 'Standard'}
        </button>
      </div>

      <div className="space-y-2">
        <NumField
          label="Min relative volume"
          value={filters.minRelativeVolume}
          onChange={(n) => set('minRelativeVolume', n)}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Min price ($)" value={filters.minPrice} onChange={(n) => set('minPrice', n)} step={1} />
          <NumField label="Max price ($)" value={filters.maxPrice} onChange={(n) => set('maxPrice', n)} step={1} />
        </div>
        <NumField
          label="Min ADV (shares)"
          value={filters.minAverageDailyVolume}
          onChange={(n) => set('minAverageDailyVolume', n)}
          step={100_000}
        />
        <NumField
          label="Min current volume"
          value={filters.minCurrentVolume}
          onChange={(n) => set('minCurrentVolume', n)}
          step={10_000}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Min 5m %" value={filters.minChangePct5m} onChange={(n) => set('minChangePct5m', n)} />
          <NumField label="Min 15m %" value={filters.minChangePct15m} onChange={(n) => set('minChangePct15m', n)} />
        </div>
        <NullableNumField
          label="Within X% of PMH"
          value={filters.withinPctOfPmHigh}
          onChange={(n) => set('withinPctOfPmHigh', n)}
        />
        <NullableNumField
          label="Broke PMH in last N min"
          value={filters.brokePmHighWithinMinutes}
          onChange={(n) => set('brokePmHighWithinMinutes', n)}
          step={1}
        />
        <label className="flex items-center gap-2 text-[11px] text-gray-400 select-none pt-1">
          <input
            type="checkbox"
            checked={filters.requireBreakout}
            onChange={(e) => set('requireBreakout', e.target.checked)}
            className="accent-emerald-500"
          />
          Require PMH breakout
        </label>
      </div>
    </div>
  );
}
