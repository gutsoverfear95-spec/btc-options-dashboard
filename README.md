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
