import { useEffect, useState, useMemo } from 'react';
import { Activity, RefreshCcw } from 'lucide-react';
import { fetchOptionsData, type OptionData } from './services/deribit';
import { MarketSummary } from './components/MarketSummary';
import { GexChart } from './components/GexChart';
import { OptionsTable } from './components/OptionsTable';

function App() {
  const [options, setOptions] = useState<OptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [filter0DTE, setFilter0DTE] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchOptionsData();
    setOptions(data);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // Refresh every minute
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!filter0DTE) return options;

    // Find the nearest expiry date
    if (options.length === 0) return [];
    
    // Sort by expiry
    const sorted = [...options].sort((a, b) => a.expiry - b.expiry);
    const nearestExpiry = sorted[0].expiry;
    
    // Group options that have this exact nearest expiry (which is the 0DTE or closest)
    return options.filter(o => o.expiry === nearestExpiry);
  }, [options, filter0DTE]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <Activity size={28} color="var(--accent-blue)" />
          BTC Options Flow
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-panel rounded" style={{ padding: 4, borderRadius: 'var(--radius-sm)' }}>
            <button 
              className={`btn ${filter0DTE ? 'active' : ''}`} 
              onClick={() => setFilter0DTE(true)}
              style={{ border: 'none', background: filter0DTE ? 'rgba(0, 210, 255, 0.1)' : 'transparent' }}
            >
              0DTE
            </button>
            <button 
              className={`btn ${!filter0DTE ? 'active' : ''}`} 
              onClick={() => setFilter0DTE(false)}
              style={{ border: 'none', background: !filter0DTE ? 'rgba(0, 210, 255, 0.1)' : 'transparent' }}
            >
              All Exp
            </button>
          </div>
          
          <button className="btn" onClick={loadData} disabled={loading}>
            <RefreshCcw size={16} className={loading ? 'spinner' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Refresh'}
          </button>
        </div>
      </header>

      {loading && options.length === 0 ? (
        <div className="loader-container">
          <div className="spinner"></div>
          <div>Loading market data from Deribit...</div>
        </div>
      ) : (
        <>
          <MarketSummary options={filteredOptions} />
          
          <div className="grid-summary" style={{ gridTemplateColumns: '1fr' }}>
            <GexChart options={filteredOptions} />
          </div>

          <OptionsTable options={filteredOptions} />
        </>
      )}
    </div>
  );
}

export default App;
