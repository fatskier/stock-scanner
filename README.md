# US Equity Breakout Scanner

A real-time scanner for short-term upside breakouts in US stocks. Surfaces names with elevated relative volume that are pushing through the premarket high or recent intraday resistance.

## Stack

- **Next.js 15 (App Router) + TypeScript** — single process for backend (Route Handlers) and frontend
- **React 19 + Tailwind CSS** — UI
- **`yahoo-finance2`** — default data provider (free, no API key, ~15-min delayed)
- **Recharts** — intraday line chart with reference lines for premarket high and resistance

## Setup

```bash
cd stock-scanner
npm install
cp .env.example .env.local   # optional — defaults work
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The scanner runs on first load and auto-refreshes every 30 seconds.

## What it does

For each candidate symbol the scanner computes:

| Metric | How |
| --- | --- |
| Relative volume | Cumulative today / (ADV × expected fraction-of-day elapsed) |
| 5-minute price change % | Last close vs close ~5 minutes ago |
| 15-minute price change % | Last close vs close ~15 minutes ago |
| Premarket high | Max high across 04:00–09:30 ET bars today |
| Distance to PMH | Last close vs premarket high (signed %) |
| Premarket-high breakout | Price above PMH; minutes since the cross |
| Recent resistance | Highest high in the prior 30 minutes (excl. last bar) |
| Resistance breakout | Last close above recent resistance |
| Average daily volume | Mean of last 30 trading days |

Results are filtered, scored, and ranked. The ranking weights relative volume, momentum strength, breakout freshness, and liquidity — all tunable in [src/lib/scanner/rank.ts](src/lib/scanner/rank.ts).

## Filters

Configurable from the UI panel and via the `filters` field on `POST /api/scan`. See [`FilterConfig`](src/lib/scanner/filter.ts):

- `minRelativeVolume` (default `1.5`; flip the **Aggressive** toggle for `2.0`)
- `minPrice`, `maxPrice`
- `minAverageDailyVolume`, `minCurrentVolume`
- `minChangePct5m`, `minChangePct15m`
- `withinPctOfPmHigh` — only show symbols within X% of premarket high
- `brokePmHighWithinMinutes` — only show fresh breakouts
- `requireBreakout` — only symbols currently above premarket high

## Scoring

```
score =  25 × normalize(rvol)            // 1x → 0,    5x → 1
       + 20 × normalize(5m %)            // 0% → 0,    3% → 1
       + 15 × normalize(15m %)           // 0% → 0,    5% → 1
       + 20 × freshness(pmh breakout)    // just now → 1, 30m → 0
       + 10 × normalize(distance > pmh)  // 0% → 0,    3% → 1
       + 10 × normalize(log10 ADV)       // ~100M → ~1
```

Tweak the weights in `DEFAULT_WEIGHTS` or pass a `weights` object on `POST /api/scan` to override per-request.

## Universe

Default candidates come from Yahoo's `most_actives` and `day_gainers` screeners (~50–100 symbols). To add a personal watchlist, send symbols in the `watchlist` field of `POST /api/scan`. The frontend currently passes none — wire up the field if you want to extend it.

## Architecture

```
src/
├── app/
│   ├── api/scan/route.ts          POST /api/scan
│   ├── api/symbol/[symbol]/...    GET /api/symbol/:sym
│   ├── layout.tsx
│   ├── page.tsx                   renders <Dashboard />
│   └── globals.css
├── components/
│   ├── Dashboard.tsx              top-level state, refresh loop
│   ├── FiltersPanel.tsx
│   ├── ScannerTable.tsx           sortable, color-coded breakout status
│   ├── SymbolDetail.tsx           detail card on row click
│   └── Chart.tsx                  intraday line + volume + ref lines
└── lib/
    ├── providers/
    │   ├── types.ts               DataProvider interface
    │   ├── yahoo.ts               Yahoo Finance implementation
    │   └── index.ts               provider factory
    └── scanner/
        ├── calculate.ts           per-symbol metrics
        ├── filter.ts              configurable filtering
        ├── rank.ts                scoring + reasons
        └── scan.ts                orchestrator
```

## Swapping the data provider

Yahoo is free but delayed and unsupported by Yahoo for production use. To plug in real-time:

1. Add `src/lib/providers/your-provider.ts` implementing the `DataProvider` interface from [providers/types.ts](src/lib/providers/types.ts).
2. Register it in [providers/index.ts](src/lib/providers/index.ts) under a new `case`.
3. Set `DATA_PROVIDER=your-provider` in `.env.local`.

Suggested upgrades:

| Provider | Notes |
| --- | --- |
| [Polygon.io](https://polygon.io) | Real-time US equity feeds. Free tier with limits. |
| [Alpaca](https://alpaca.markets) | Free real-time IEX feed; paid SIP feed. |
| [Finnhub](https://finnhub.io) | WebSockets for real-time. Free tier. |

The rest of the codebase is provider-agnostic.

## Disclaimer

This is a market scanner, not investment advice. Yahoo Finance data is delayed and may be inaccurate. Do not trade off it directly.
