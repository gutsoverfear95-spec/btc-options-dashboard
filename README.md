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
```

## Features

- Deribit and Binance BTC options data.
- GEX profile grouped by strike.
- Strike/expiry heatmap.
- Options chain with source and expiry labels.
- Binance 1-minute candlestick, volume and liquidation feed.
- Automatic refresh every 60 seconds.

## Data and deployment

Browser requests use same-origin routes:

- `/api/binance-options/*` proxies Binance Options API.
- `/api/binance-spot/*` proxies Binance Spot API.

Local development uses the proxy in `vite.config.ts`. Netlify deployments use the functions in `netlify/functions` through the matching rules in `public/_redirects`; this avoids forwarding the browser `Origin` header that Binance may reject with HTTP 403. Other hosting providers need equivalent server-side rewrites or serverless functions.

GEX is normalized as dollar exposure for a 1% underlying move. Binance data currently assumes a 1 BTC contract, so the exchange contract multiplier should be revalidated if Binance changes its product specification.

This project is an analytics tool, not financial advice. Validate calculations against exchange data before using them for trading decisions.
