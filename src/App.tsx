import { useEffect, useState, useMemo } from 'react';
import { Activity, RefreshCcw } from 'lucide-react';
import { fetchOptionsData, type OptionData } from './services/deribit';
import { MarketSummary } from './components/MarketSummary';
import { GexChart } from './components/GexChart';
import { OptionsTable } from './components/OptionsTable';
import { GexHeatmap } from './components/GexHeatmap';

function App() {
  const [options, setOptions] = useState<OptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // null means "All Expirations"
  const [selectedExpiry, setSelectedExpiry] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchOptionsData();
    setOptions(data);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const uniqueExpirations = useMemo(() => {
    const expSet = new Set<number>();
    options.forEach(o => expSet.add(o.expiry));
    return Array.from(expSet).sort((a, b) => a - b);
  }, [options]);

  // Set default to closest expiry (0DTE) on initial load
  useEffect(() => {
    if (uniqueExpirations.length > 0 && selectedExpiry === null) {
      setSelectedExpiry(uniqueExpirations[0]);
    }
  }, [uniqueExpirations, selectedExpiry]);

  const filteredOptions = useMemo(() => {
    if (selectedExpiry === null) return options;
    return options.filter(o => o.expiry === selectedExpiry);
  }, [options, selectedExpiry]);

  const formatTabLabel = (ts: number, index: number) => {
    if (index === 0) return '0DTE (Today)';
    if (index === 1) return '1DTE (Tomorrow)';
    
    const d = new Date(ts);
    // e.g. Sep 29
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <Activity size={28} color="var(--accent-blue)" />
          BTC Options Flow
        </div>
        
        <div className="flex items-center gap-4">
          <button className="btn" onClick={loadData} disabled={loading}>
            <RefreshCcw size={16} className={loading ? 'spinner' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Refresh'}
          </button>
        </div>
      </header>

      {loading && options.length === 0 ? (
        <div className="loader-container">
          <div className="spinner"></div>
          <div>Loading advanced market data from Deribit...</div>
        </div>
      ) : (
        <>
          {/* Market Summary Panel */}
          <div className="panel" style={{ padding: 16 }}>
            <MarketSummary options={filteredOptions} />
          </div>

          <div className="dashboard-grid">
            {/* Left Column (Charts & Tables) */}
            <div className="flex-col gap-6">
              
              <div className="panel">
                <div className="panel-header" style={{ marginBottom: 12 }}>
                  <h2 className="panel-title">Net GEX Profile</h2>
                  <div className="filter-scroll" style={{ maxWidth: '60%' }}>
                    <div 
                      className={`filter-tab ${selectedExpiry === null ? 'active' : ''}`}
                      onClick={() => setSelectedExpiry(null)}
                    >
                      All Exp
                    </div>
                    {uniqueExpirations.map((exp, idx) => (
                      <div 
                        key={exp}
                        className={`filter-tab ${selectedExpiry === exp ? 'active' : ''}`}
                        onClick={() => setSelectedExpiry(exp)}
                      >
                        {formatTabLabel(exp, idx)}
                      </div>
                    ))}
                  </div>
                </div>
                <GexChart options={filteredOptions} />
              </div>

              <OptionsTable options={filteredOptions} />
            </div>

            {/* Right Column (Heatmap) */}
            <div className="flex-col gap-6">
              {/* Heatmap gets ALL options regardless of selected tab to show full picture */}
              <GexHeatmap options={options} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
