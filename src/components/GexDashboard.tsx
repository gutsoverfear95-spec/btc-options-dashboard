import { useEffect, useState, useMemo } from 'react';
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

  const loadData = async () => {
    setLoading(true);
    // Fetch from both sources in parallel
    const [deribitData, binanceData] = await Promise.all([
      fetchOptionsData(),
      fetchBinanceOptionsData()
    ]);
    setDeribitOptions(deribitData);
    setBinanceOptions(binanceData);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const options = useMemo(() => {
    if (dataSource === 'deribit') return deribitOptions;
    if (dataSource === 'binance') return binanceOptions;
    
    // Aggregator: Merge Deribit and Binance
    // We can just concat them! The indicators and charts will naturally sum up the GEX
    // because they group by Strike or Expiry.
    return [...deribitOptions, ...binanceOptions];
  }, [deribitOptions, binanceOptions, dataSource]);

  const filteredOptions = useMemo(() => {
    if (filterMode === 'all') return options;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    const uniqueExpirations = Array.from(new Set(options.map(o => o.expiry))).sort((a, b) => a - b);
    const nearestExpiry = uniqueExpirations.length > 0 ? uniqueExpirations[0] : 0;

    return options.filter(o => {
      const dte = (o.expiry - now) / dayMs;
      
      switch (filterMode) {
        case '0dte': return o.expiry === nearestExpiry;
        case '1w': return dte <= 7;
        case '1m': return dte <= 30;
        case '3m': return dte <= 90;
        default: return true;
      }
    });
  }, [options, filterMode]);

  return (
    <div className="flex-col gap-6 w-full">
      <div className="flex justify-between items-center" style={{ marginBottom: '-8px' }}>
        <h2 className="panel-title" style={{ color: 'var(--text-secondary)' }}>Market Maker GEX Profile</h2>
        
        <div className="flex items-center gap-4">
          <div className="filter-scroll" style={{ padding: 4, background: 'var(--bg-panel)', borderRadius: 8 }}>
            <div className={`filter-tab ${dataSource === 'all' ? 'active' : ''}`} onClick={() => setDataSource('all')} style={{ padding: '4px 12px', fontSize: '0.9rem' }}>Aggregated (All)</div>
            <div className={`filter-tab ${dataSource === 'deribit' ? 'active' : ''}`} onClick={() => setDataSource('deribit')} style={{ padding: '4px 12px', fontSize: '0.9rem' }}>Deribit</div>
            <div className={`filter-tab ${dataSource === 'binance' ? 'active' : ''}`} onClick={() => setDataSource('binance')} style={{ padding: '4px 12px', fontSize: '0.9rem' }}>Binance</div>
          </div>
          
          <button className="btn" onClick={loadData} disabled={loading}>
            <RefreshCcw size={16} className={loading ? 'spinner' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Refresh'}
          </button>
        </div>
      </div>

      {loading && options.length === 0 ? (
        <div className="loader-container">
          <div className="spinner"></div>
          <div>Loading advanced options data...</div>
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
                    <div className={`filter-tab ${filterMode === 'all' ? 'active' : ''}`} onClick={() => setFilterMode('all')}>All Exp</div>
                    <div className={`filter-tab ${filterMode === '0dte' ? 'active' : ''}`} onClick={() => setFilterMode('0dte')}>0DTE</div>
                    <div className={`filter-tab ${filterMode === '1w' ? 'active' : ''}`} onClick={() => setFilterMode('1w')}>&le; 1 Week</div>
                    <div className={`filter-tab ${filterMode === '1m' ? 'active' : ''}`} onClick={() => setFilterMode('1m')}>&le; 1 Month</div>
                    <div className={`filter-tab ${filterMode === '3m' ? 'active' : ''}`} onClick={() => setFilterMode('3m')}>&le; 3 Months</div>
                  </div>
                </div>
                <GexChart options={filteredOptions} />
              </div>
              <OptionsTable options={filteredOptions} />
            </div>
            <div className="flex-col gap-6">
              <GexHeatmap options={options} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
