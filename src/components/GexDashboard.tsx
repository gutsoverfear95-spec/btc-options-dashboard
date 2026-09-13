import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchOptionsData, type OptionData } from '../services/deribit';
import { fetchBinanceOptionsData } from '../services/binanceOptions';
import { MarketSummary } from './MarketSummary';
import { GexChart } from './GexChart';
import { OptionsTable } from './OptionsTable';
import { GexHeatmap } from './GexHeatmap';
import { RefreshCcw } from 'lucide-react';

export const GexDashboard = () => {
  const [deribitOptions, setDeribitOptions] = useState<OptionData[]>([]);
  const [binanceOptions, setBinanceOptions] = useState<OptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [filterMode, setFilterMode] = useState<string>('all');
  const [dataSource, setDataSource] = useState<string>('all'); // 'all' | 'deribit' | 'binance'
  const [dataError, setDataError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const requestIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const results = await Promise.allSettled([
      fetchOptionsData(),
      fetchBinanceOptionsData(),
    ]);

    if (requestId !== requestIdRef.current) return;

    const [deribitResult, binanceResult] = results;
    const errors: string[] = [];
    const nextDeribitOptions = deribitResult.status === 'fulfilled'
      ? deribitResult.value
      : (errors.push(`Deribit: ${getErrorMessage(deribitResult.reason)}`), []);
    const nextBinanceOptions = binanceResult.status === 'fulfilled'
      ? binanceResult.value
      : (errors.push(`Binance: ${getErrorMessage(binanceResult.reason)}`), []);

    setDeribitOptions(nextDeribitOptions);
    setBinanceOptions(nextBinanceOptions);
    setDataError(errors.length > 0 ? errors.join(' | ') : null);
    setLastUpdate(new Date());
    setNow(Date.now());
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      void loadData();
    }, 0);
    const interval = setInterval(loadData, 60000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
      requestIdRef.current += 1;
    };
  }, [loadData]);

  const options = useMemo(() => {
    if (dataSource === 'deribit') return deribitOptions;
    if (dataSource === 'binance') return binanceOptions;
    
    // Aggregator: Merge Deribit and Binance
    // We can just concat them! The indicators and charts will naturally sum up the GEX
    // because they group by Strike or Expiry.
    return [...deribitOptions, ...binanceOptions];
  }, [deribitOptions, binanceOptions, dataSource]);

  const activeOptions = useMemo(
    () => options.filter(option => option.expiry >= now),
    [options, now],
  );

  const filteredOptions = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    if (filterMode === 'all') return activeOptions;

    const nearestExpiry = activeOptions
      .map(option => option.expiry)
      .sort((a, b) => a - b)[0];
    const nearestExpiryDate = nearestExpiry
      ? new Date(nearestExpiry).toISOString().slice(0, 10)
      : '';

    return activeOptions.filter(o => {
      const dte = (o.expiry - now) / dayMs;
      
      switch (filterMode) {
        case '0dte': return new Date(o.expiry).toISOString().slice(0, 10) === nearestExpiryDate;
        case '1w': return dte <= 7;
        case '1m': return dte <= 30;
        case '3m': return dte <= 90;
        default: return true;
      }
    });
  }, [activeOptions, filterMode, now]);

  return (
    <div className="flex-col gap-6 w-full">
      <div className="flex justify-between items-center" style={{ marginBottom: '-8px' }}>
        <h2 className="panel-title" style={{ color: 'var(--text-secondary)' }}>Market Maker GEX Profile</h2>
        
        <div className="flex items-center gap-4">
          <div className="filter-scroll" style={{ padding: 4, background: 'var(--bg-panel)', borderRadius: 8 }}>
            <button type="button" className={`filter-tab ${dataSource === 'all' ? 'active' : ''}`} onClick={() => setDataSource('all')} style={{ padding: '4px 12px', fontSize: '0.9rem' }}>Aggregated (All)</button>
            <button type="button" className={`filter-tab ${dataSource === 'deribit' ? 'active' : ''}`} onClick={() => setDataSource('deribit')} style={{ padding: '4px 12px', fontSize: '0.9rem' }}>Deribit</button>
            <button type="button" className={`filter-tab ${dataSource === 'binance' ? 'active' : ''}`} onClick={() => setDataSource('binance')} style={{ padding: '4px 12px', fontSize: '0.9rem' }}>Binance</button>
          </div>
          
          <button className="btn" onClick={loadData} disabled={loading}>
            <RefreshCcw size={16} className={loading ? 'spinner' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Refresh'}
          </button>
        </div>
      </div>

      {dataError && (
        <div className="panel" style={{ color: 'var(--accent-put)', padding: 12 }}>
          Data refresh warning: {dataError}
        </div>
      )}

      {loading && options.length === 0 ? (
        <div className="loader-container">
          <div className="spinner"></div>
          <div>Loading advanced options data...</div>
        </div>
      ) : options.length === 0 ? (
        <div className="panel" style={{ padding: 16 }}>
          No active options data is available.
        </div>
      ) : (
        <>
          <div className="panel" style={{ padding: 16 }}>
            <MarketSummary options={filteredOptions} />
          </div>

          <div className="dashboard-grid">
            <div className="flex-col gap-6">
              <div className="panel">
                <div className="panel-header" style={{ marginBottom: 12 }}>
                  <h2 className="panel-title">Net GEX Profile</h2>
                  <div className="filter-scroll" style={{ maxWidth: '100%' }}>
                    <button type="button" className={`filter-tab ${filterMode === 'all' ? 'active' : ''}`} onClick={() => setFilterMode('all')}>All Exp</button>
                    <button type="button" className={`filter-tab ${filterMode === '0dte' ? 'active' : ''}`} onClick={() => setFilterMode('0dte')}>0DTE</button>
                    <button type="button" className={`filter-tab ${filterMode === '1w' ? 'active' : ''}`} onClick={() => setFilterMode('1w')}>&le; 1 Week</button>
                    <button type="button" className={`filter-tab ${filterMode === '1m' ? 'active' : ''}`} onClick={() => setFilterMode('1m')}>&le; 1 Month</button>
                    <button type="button" className={`filter-tab ${filterMode === '3m' ? 'active' : ''}`} onClick={() => setFilterMode('3m')}>&le; 3 Months</button>
                  </div>
                </div>
                <GexChart options={filteredOptions} />
              </div>
              <OptionsTable options={filteredOptions} />
            </div>
            <div className="flex-col gap-6">
              <GexHeatmap options={activeOptions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : 'Unknown request error';
};
