# BTC Options Dashboard

React + TypeScript + Vite dashboard for BTC options GEX and Binance futures orderflow.

## Run locally

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run lint
npm run build
npm run preview
npm test
```

## Features

- Deribit and Binance BTC options data.
- GEX profile grouped by strike.
- Strike/expiry heatmap.
- Options chain with source and expiry labels.
- Binance 1-minute candlestick, volume and liquidation feed.
- Automatic refresh every 60 seconds.

## Data and deployment

### X / Twitter feed

Macro News embeds the public `@markets` timeline using X's official widget.
The widget script loads only when the X tab is opened. Script failures (10-second
timeout) and timeline failures (20-second overall timeout) show a retry button
and a direct link to the profile. Switching tabs cleans up the previous widget.
Browser privacy settings, network failures, or X service restrictions can prevent
the embed from loading; this integration cannot guarantee live post availability.
It does not require or expose an API token. `npm test` covers the widget lifecycle
with mocked X responses; it does not verify X's live service.

Browser requests use same-origin routes:

- `/api/binance-options/*` proxies Binance Options API.
- `/api/binance-spot/*` proxies Binance Spot API.

Local development uses the proxy in `vite.config.ts`. Vercel deployments use the serverless functions in `api/`; Netlify deployments use the equivalent functions in `netlify/functions` through `public/_redirects`. The server-side proxy avoids forwarding the browser `Origin` header that Binance may reject with HTTP 403. Other hosting providers need equivalent server-side rewrites or serverless functions.

GEX is normalized as dollar exposure for a 1% underlying move. Binance data currently assumes a 1 BTC contract, so the exchange contract multiplier should be revalidated if Binance changes its product specification.

This project is an analytics tool, not financial advice. Validate calculations against exchange data before using them for trading decisions.

### Per-asset headline tags

Each news card has a keyboard-accessible selector for NASDAQ, SP500, XAUUSD,
and WTI, inspired by the compact asset tag in economic calendars. Bullish and
Bearish describe explicit price moves reported in the English headline, not a
forecast of the asset's future reaction. Mixed means conflicting price moves;
Unclear means insufficient evidence, not a neutral outlook. Expand Headline
estimate to see the reason. Negated, conditional and expectation-based clauses
are intentionally left unclassified. Macro event names alone do not generate
an impact prediction. News sources are unchanged by this UI update.

### Live macro news

`/api/news` aggregates CNBC Markets, Federal Reserve monetary releases, BLS CPI
and Employment (Atom), BEA, and EIA Today in Energy. These sources replace the
obsolete WSJ/rss2json feed. Headlines link to the original publisher; full articles
are not republished. The old demonstration economic calendar has been removed.

GDELT adds an optional OSINT discovery category restricted to selected news
publishers (Reuters, AP, BBC, CNBC). Its timestamps are discovery times, not
verified publication times. GDELT is not a verification authority. If unavailable,
its source status is displayed without blocking the other feeds.

The visible Live News tab polls every 60 seconds and refreshes on return from a
background tab. Timers and requests stop when leaving Live News. New items appear
automatically near the top; while reading lower down, a button reveals queued
headlines without reloading or shifting the reading position. Failures retain
loaded items. Last checked and each source's last successful fetch are separate.

Server requests have 6-second timeouts, per-source in-memory caches (60 seconds;
15 minutes for GDELT) and shared in-flight requests per function instance. CDN
responses can be cached for 30 seconds. Caches are best effort, not durable across
serverless cold starts; the browser also retains current items on errors. Dates
older than 45 days, malformed dates and non-HTTP links are excluded. Older releases
are labeled. Polling frequency is not a guarantee that publishers release new
headlines every minute. No API key or paid service is required by this integration.

Vercel uses `api/news.js`; Netlify uses `netlify/functions/news.mjs` and its rewrite.
The Vite dev middleware exposes the same route locally. `npm test` covers RSS/Atom
parsing, deduplication, stale fallback, source failures, polling, visibility and
reading-position queues, as well as the existing sentiment and widget behavior.
