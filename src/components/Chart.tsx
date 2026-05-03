'use client';

import {
  Bar,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { IntradayBar } from '@/lib/providers/types';

interface Props {
  bars: IntradayBar[];
  premarketHigh?: number | null;
  recentResistance?: number | null;
}

export default function IntradayChart({ bars, premarketHigh, recentResistance }: Props) {
  const slice = bars.slice(-180);
  const data = slice.map((b) => ({
    t: new Date(b.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York',
    }),
    price: b.close,
    volume: b.volume,
  }));

  const tickInterval = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="space-y-1">
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="t"
              tick={{ fontSize: 9, fill: '#888' }}
              interval={tickInterval}
              axisLine={{ stroke: '#333' }}
              tickLine={false}
            />
            <YAxis
              domain={['dataMin - 0.05', 'dataMax + 0.05']}
              tick={{ fontSize: 9, fill: '#888' }}
              width={48}
              axisLine={{ stroke: '#333' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: '#0b0b0b', border: '1px solid #333', fontSize: 11 }}
              labelStyle={{ color: '#aaa' }}
            />
            <Line type="monotone" dataKey="price" stroke="#10b981" dot={false} strokeWidth={1.5} />
            {premarketHigh != null && (
              <ReferenceLine
                y={premarketHigh}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{ value: 'PMH', fontSize: 9, fill: '#f59e0b', position: 'right' }}
              />
            )}
            {recentResistance != null && (
              <ReferenceLine
                y={recentResistance}
                stroke="#6366f1"
                strokeDasharray="2 2"
                label={{ value: 'R', fontSize: 9, fill: '#6366f1', position: 'right' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div style={{ width: '100%', height: 50 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis tick={{ fontSize: 9, fill: '#888' }} width={48} axisLine={{ stroke: '#333' }} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#0b0b0b', border: '1px solid #333', fontSize: 11 }}
              labelStyle={{ color: '#aaa' }}
            />
            <Bar dataKey="volume" fill="#475569" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
