export interface LiquidationEvent {
  symbol: string;
  side: 'SELL' | 'BUY'; // SELL means long liquidation, BUY means short liquidation
  price: number;
  qty: number;
  time: number;
}

export interface TradeEvent {
  price: number;
  qty: number;
  isBuyerMaker: boolean; // if true, it's a market SELL. if false, it's a market BUY.
  time: number;
}

export class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private liquidationCallbacks: ((event: LiquidationEvent) => void)[] = [];
  private tradeCallbacks: ((event: TradeEvent) => void)[] = [];
  private klineCallbacks: ((candle: any) => void)[] = [];

  private symbol: string;

  constructor(symbol: string = 'btcusdt') {
    this.symbol = symbol;
    this.connect();
  }

  private connect() {
    // Connect to multiple streams: aggTrade, forceOrder (liquidations), and kline_1m
    const streamUrl = `wss://fstream.binance.com/stream?streams=${this.symbol}@aggTrade/${this.symbol}@forceOrder/${this.symbol}@kline_1m`;
    this.ws = new WebSocket(streamUrl);

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!data || !data.data) return;

      const stream = data.stream;
      const payload = data.data;

      if (stream.endsWith('@forceOrder')) {
        const order = payload.o;
        this.liquidationCallbacks.forEach(cb => cb({
          symbol: order.s,
          side: order.S,
          price: parseFloat(order.p),
          qty: parseFloat(order.q),
          time: order.T
        }));
      } else if (stream.endsWith('@aggTrade')) {
        this.tradeCallbacks.forEach(cb => cb({
          price: parseFloat(payload.p),
          qty: parseFloat(payload.q),
          isBuyerMaker: payload.m,
          time: payload.T
        }));
      } else if (stream.endsWith('@kline_1m')) {
        const k = payload.k;
        this.klineCallbacks.forEach(cb => cb({
          time: k.t / 1000, // lightweight-charts uses seconds for time
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          isFinal: k.x // is this candle closed?
        }));
      }
    };

    this.ws.onclose = () => {
      console.log('Binance WS disconnected. Reconnecting in 3s...');
      setTimeout(() => this.connect(), 3000);
    };
  }

  onLiquidation(cb: (event: LiquidationEvent) => void) {
    this.liquidationCallbacks.push(cb);
  }

  onTrade(cb: (event: TradeEvent) => void) {
    this.tradeCallbacks.push(cb);
  }

  onKline(cb: (candle: any) => void) {
    this.klineCallbacks.push(cb);
  }

  disconnect() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
  }
}

// Fetch historical klines for initial chart data
export const fetchHistoricalKlines = async (symbol: string = 'BTCUSDT', interval: string = '1m', limit: number = 200) => {
  const res = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  const data = await res.json();
  
  return data.map((d: any) => ({
    time: d[0] / 1000,
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5])
  }));
};
