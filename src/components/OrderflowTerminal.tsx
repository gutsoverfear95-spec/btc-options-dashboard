import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { BinanceWebSocket, type LiquidationEvent, fetchHistoricalKlines } from '../services/binance';
import { formatCurrency } from '../utils/formatters';

export const OrderflowTerminal = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [candlestickSeries, setCandlestickSeries] = useState<any>(null);
  const [volumeSeries, setVolumeSeries] = useState<any>(null);
  
  const [liquidations, setLiquidations] = useState<LiquidationEvent[]>([]);
  const [price, setPrice] = useState(0);

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

    const candleSeries = (newChart as any).addCandlestickSeries({
      upColor: '#00e676',
      downColor: '#ff1744',
      borderVisible: false,
      wickUpColor: '#00e676',
      wickDownColor: '#ff1744',
    });

    const volSeries = (newChart as any).addHistogramSeries({
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

    const initData = async () => {
      try {
        const histData = await fetchHistoricalKlines('BTCUSDT', '1m', 100);
        
        // Ensure data is sorted by time ascending and unique
        const uniqueData = Array.from(new Map(histData.map(item => [item.time, item])).values())
          .sort((a, b) => a.time - b.time);

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
          setPrice(uniqueData[uniqueData.length - 1].close);
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
        setPrice(candle.close);
      } catch (err) {
        // Ignore out of order or duplicate time errors from lightweight-charts
      }
    });

    ws.onLiquidation((liq) => {
      setLiquidations(prev => [liq, ...prev].slice(0, 50)); // keep last 50
      
      // Optionally place a marker on the chart for large liquidations
      if (liq.qty > 1) { // 1 BTC
        // Marker Logic here if needed
      }
    });

    return () => {
      ws.disconnect();
    };
  }, [candlestickSeries, volumeSeries]);

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

      <div className="dashboard-grid">
        {/* Chart Area */}
        <div className="panel flex-col" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="panel-header" style={{ padding: '16px 16px 0 16px' }}>
            <h2 className="panel-title">1m Chart (Real-time)</h2>
          </div>
          <div ref={chartContainerRef} style={{ width: '100%', height: '500px' }} />
        </div>

        {/* Liquidation Feed */}
        <div className="panel flex-col" style={{ height: '500px', overflow: 'hidden' }}>
          <div className="panel-header">
            <h2 className="panel-title">Liquidation Feed</h2>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th className="text-left">Time</th>
                  <th className="text-left">Side</th>
                  <th>Price</th>
                  <th>Amount (BTC)</th>
                </tr>
              </thead>
              <tbody>
                {liquidations.map((liq, idx) => (
                  <tr key={idx}>
                    <td className="text-left text-muted">{new Date(liq.time).toLocaleTimeString()}</td>
                    <td className="text-left font-bold" style={{ color: liq.side === 'SELL' ? 'var(--accent-put)' : 'var(--accent-call)' }}>
                      {liq.side === 'SELL' ? 'LONG LIQ' : 'SHORT LIQ'}
                    </td>
                    <td style={{ color: liq.side === 'SELL' ? 'var(--accent-put)' : 'var(--accent-call)' }}>
                      {formatCurrency(liq.price)}
                    </td>
                    <td>{liq.qty.toFixed(3)}</td>
                  </tr>
                ))}
                {liquidations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted" style={{ padding: '24px 0' }}>
                      Waiting for liquidations...
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
