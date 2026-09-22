import { lazy, Suspense, useState } from 'react';
import { Activity, LayoutDashboard, CandlestickChart, Newspaper } from 'lucide-react';

const GexDashboard = lazy(() =>
  import('./components/GexDashboard').then(module => ({ default: module.GexDashboard })),
);
const OrderflowTerminal = lazy(() =>
  import('./components/OrderflowTerminal').then(module => ({ default: module.OrderflowTerminal })),
);
const MacroNews = lazy(() =>
  import('./components/MacroNews').then(module => ({ default: module.MacroNews })),
);

function App() {
  const [activeTab, setActiveTab] = useState<'gex' | 'orderflow' | 'news'>('news');

  return (
    <div className="app-container" style={{ flexDirection: 'row', gap: 32, maxWidth: '1600px' }}>
      
      {/* Sidebar Navigation */}
      <aside style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: 24, flexShrink: 0 }}>
        <div className="logo" style={{ marginBottom: 12 }}>
          <Activity size={28} color="var(--accent-blue)" />
          AlphaFlow
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button 
            className={`btn ${activeTab === 'gex' ? 'active' : ''}`}
            onClick={() => setActiveTab('gex')}
            style={{ justifyContent: 'flex-start', padding: '12px 16px', fontSize: '1rem', border: 'none', background: activeTab === 'gex' ? 'rgba(0, 210, 255, 0.1)' : 'transparent' }}
          >
            <LayoutDashboard size={20} />
            Options & GEX
          </button>
          
          <button 
            className={`btn ${activeTab === 'orderflow' ? 'active' : ''}`}
            onClick={() => setActiveTab('orderflow')}
            style={{ justifyContent: 'flex-start', padding: '12px 16px', fontSize: '1rem', border: 'none', background: activeTab === 'orderflow' ? 'rgba(0, 210, 255, 0.1)' : 'transparent' }}
          >
            <CandlestickChart size={20} />
            Orderflow
          </button>
          
          <button 
            className={`btn ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => setActiveTab('news')}
            style={{ justifyContent: 'flex-start', padding: '12px 16px', fontSize: '1rem', border: 'none', background: activeTab === 'news' ? 'rgba(0, 210, 255, 0.1)' : 'transparent' }}
          >
            <Newspaper size={20} />
            Macro News
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <Suspense fallback={<div className="loader-container">Loading dashboard...</div>}>
          {activeTab === 'gex' && <GexDashboard />}
          {activeTab === 'orderflow' && <OrderflowTerminal />}
          {activeTab === 'news' && <MacroNews />}
        </Suspense>
      </main>

    </div>
  );
}

export default App;
