import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { BinanceWebSocket, type BinanceConnectionStatus, type LiquidationEvent, fetchHistoricalKlines } from '../services/binance';
import { formatCurrency } from '../utils/formatters';

export const OrderflowTerminal = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [candlestickSeries, setCandlestickSeries] = useState<any>(null);
  const [volumeSeries, setVolumeSeries] = useState<any>(null);
  
  const [liquidations, setLiquidations] = useState<LiquidationEvent[]>([]);
  const [price, setPrice] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<BinanceConnectionStatus>('connecting');
  const [lastStreamMessageAt, setLastStreamMessageAt] = useState<number | null>(null);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const newChart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.9)',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 1, // normal
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    });

    const candleSeries = (newChart as any).addSeries(CandlestickSeries, {
      upColor: '#00e676',
      downColor: '#ff1744',
      borderVisible: false,
      wickUpColor: '#00e676',
      wickDownColor: '#ff1744',
    });

    const volSeries = (newChart as any).addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay
    });
    
    volSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // 80% empty at top
        bottom: 0,
      },
    });

    setCandlestickSeries(candleSeries);
    setVolumeSeries(volSeries);

    let cancelled = false;

    const initData = async () => {
      try {
        const histData = await fetchHistoricalKlines('BTCUSDT', '1m', 100);
        if (cancelled) return;
        
        // Ensure data is sorted by time ascending and unique
        const uniqueData = Array.from(new Map(histData.map((item: any) => [item.time, item])).values())
          .sort((a: any, b: any) => a.time - b.time);

        candleSeries.setData(uniqueData.map((d: any) => ({
          time: d.time as any,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close
        })));
        
        volSeries.setData(uniqueData.map((d: any) => ({
          time: d.time as any,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(0, 230, 118, 0.4)' : 'rgba(255, 23, 68, 0.4)'
        })));
        
        if (uniqueData.length > 0) {
          setPrice((uniqueData[uniqueData.length - 1] as any).close);
        }
      } catch (err) {
        console.error("Error initializing chart data:", err);
      }
    };

    initData();

    const handleResize = () => {
      if (chartContainerRef.current) {
        newChart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      newChart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candlestickSeries || !volumeSeries) return;

    const ws = new BinanceWebSocket('btcusdt');

    ws.onKline((candle) => {
      try {
        candlestickSeries.update({
          time: candle.time as any,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        });
        volumeSeries.update({
          time: candle.time as any,
          value: candle.volume,
          color: candle.close >= candle.open
            ? 'rgba(0, 230, 118, 0.4)'
            : 'rgba(255, 23, 68, 0.4)',
        });
        setPrice(candle.close);
      } catch {
        // Ignore out of order or duplicate time errors from lightweight-charts
      }
    });

    ws.onLiquidation((liq) => {
      setLiquidations(prev => [liq, ...prev].slice(0, 50)); // keep last 50
    });
    ws.onStatus(setConnectionStatus);
    ws.onHeartbeat(setLastStreamMessageAt);

    return () => {
      ws.disconnect();
    };
  }, [candlestickSeries, volumeSeries]);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const streamHealthy = connectionStatus === 'connected'
    && lastStreamMessageAt !== null
    && clock - lastStreamMessageAt < 15_000;

  return (
    <div className="flex-col gap-6 w-full">
      <div className="panel" style={{ padding: 16 }}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="panel-title" style={{ fontSize: '1.5rem' }}>BTC/USDT Perpetual</h2>
            <div className="text-secondary">Binance Orderflow Data</div>
          </div>
          <div className="indicator-value" style={{ fontSize: '2rem', color: 'var(--accent-blue)' }}>
            {formatCurrency(price)}
          </div>
        </div>
      </div>

      <div className="flex gap-4 h-[600px] w-full">
        {/* Chart Area */}
        <div className="flex-1 rounded-xl p-4 flex flex-col" style={{ background: 'var(--bg-panel)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: 0 }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="panel-title text-sm" style={{ margin: 0 }}>1m Chart (Real-time)</h2>
          </div>
          <div ref={chartContainerRef} className="flex-1 w-full" />
        </div>

        {/* Liquidation Feed */}
        <div className="w-[450px] shrink-0 rounded-xl p-4 flex flex-col" style={{ background: 'var(--bg-panel)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="panel-title text-sm" style={{ margin: 0 }}>
              Liquidation Feed
              <span
                className="text-muted"
                style={{ fontSize: '0.7rem', marginLeft: 8 }}
              >
                {connectionStatus === 'connected'
                  ? streamHealthy ? 'LIVE' : 'STALE'
                  : connectionStatus.toUpperCase()}
              </span>
            </h2>
          </div>
          <div className="flex-1 mt-2" style={{ overflowY: 'auto' }}>
            <table className="w-full text-sm">
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 1 }}>
                <tr className="text-muted border-b border-gray-800">
                  <th className="text-left py-2 font-normal">TIME</th>
                  <th className="text-left py-2 font-normal">SIDE</th>
                  <th className="text-right py-2 font-normal">PRICE</th>
                  <th className="text-right py-2 font-normal">AMOUNT (BTC)</th>
                </tr>
              </thead>
              <tbody>
                {liquidations.map((liq, idx) => (
                  <tr key={idx} className="border-b border-gray-800/50">
                    <td className="text-left py-3 text-muted">{new Date(liq.time).toLocaleTimeString()}</td>
                    <td className="text-left py-3 font-bold" style={{ color: liq.side === 'SELL' ? 'var(--accent-put)' : 'var(--accent-call)' }}>
                      {liq.side === 'SELL' ? 'LONG LIQ' : 'SHORT LIQ'}
                    </td>
                    <td className="text-right py-3" style={{ color: liq.side === 'SELL' ? 'var(--accent-put)' : 'var(--accent-call)' }}>
                      {formatCurrency(liq.price)}
                    </td>
                    <td className="text-right py-3 text-gray-300">{liq.qty.toFixed(3)}</td>
                  </tr>
                ))}
                {liquidations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted" style={{ padding: '24px 0' }}>
                      {streamHealthy
                        ? 'Market stream live — waiting for liquidation events...'
                        : 'Connecting to Binance liquidation stream...'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
