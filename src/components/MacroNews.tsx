import { useState, useEffect } from 'react';
import { Clock, ExternalLink, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

// --- Types ---
interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  time: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  url: string;
}

// --- Helper Functions ---
const getNaiveSentiment = (text: string): 'bullish' | 'bearish' | 'neutral' => {
  const lower = text.toLowerCase();
  const bullishWords = ['surge', 'rally', 'up', 'high', 'gain', 'jump', 'boom', 'reclaim'];
  const bearishWords = ['drop', 'dip', 'down', 'low', 'fall', 'crash', 'plunge', 'weak', 'hack', 'exploit'];
  
  const isBullish = bullishWords.some(w => lower.includes(w));
  const isBearish = bearishWords.some(w => lower.includes(w));
  
  if (isBullish && !isBearish) return 'bullish';
  if (isBearish && !isBullish) return 'bearish';
  return 'neutral';
};

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours === 1) return '1 hour ago';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  return `${Math.floor(diffInHours / 24)} days ago`;
};

// --- Mock Calendar Data ---
const MOCK_CALENDAR = [
  {
    id: 1,
    date: "Today, 08:30 AM",
    event: "Core PCE Price Index (MoM)",
    country: "US",
    impact: "high",
    actual: "0.2%",
    forecast: "0.2%",
    previous: "0.1%"
  },
  {
    id: 2,
    date: "Today, 10:00 AM",
    event: "ISM Manufacturing PMI",
    country: "US",
    impact: "high",
    actual: "-",
    forecast: "47.5",
    previous: "46.8"
  },
  {
    id: 3,
    date: "Tomorrow, 14:00 PM",
    event: "FOMC Member Williams Speaks",
    country: "US",
    impact: "medium",
    actual: "-",
    forecast: "-",
    previous: "-"
  },
  {
    id: 4,
    date: "Thu, 13:45 PM",
    event: "ECB Interest Rate Decision",
    country: "EU",
    impact: "high",
    actual: "-",
    forecast: "3.50%",
    previous: "3.75%"
  },
  {
    id: 5,
    date: "Fri, 08:30 AM",
    event: "Non Farm Payrolls",
    country: "US",
    impact: "high",
    actual: "-",
    forecast: "165K",
    previous: "114K"
  }
];

// --- Components ---

const SentimentBadge = ({ type }: { type: string }) => {
  if (type === 'bullish') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(0, 230, 118, 0.1)', color: 'var(--accent-call)', fontSize: '0.75rem', fontWeight: 600 }}>
        <TrendingUp size={14} /> Bullish
      </span>
    );
  }
  if (type === 'bearish') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 23, 68, 0.1)', color: 'var(--accent-put)', fontSize: '0.75rem', fontWeight: 600 }}>
        <TrendingDown size={14} /> Bearish
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
      <Minus size={14} /> Neutral
    </span>
  );
};

const ImpactBadge = ({ level }: { level: string }) => {
  let color = 'var(--text-secondary)';
  let bg = 'rgba(255,255,255,0.1)';
  if (level === 'high') {
    color = '#ff1744';
    bg = 'rgba(255, 23, 68, 0.1)';
  } else if (level === 'medium') {
    color = '#ffb300';
    bg = 'rgba(255, 179, 0, 0.1)';
  }
  
  return (
    <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: bg, color: color, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>
      {level}
    </span>
  );
};

export const MacroNews = () => {
  const [filter, setFilter] = useState<'rss' | 'twitter'>('rss');
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch RSS feed
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        // Using WSJ Markets RSS feed for US stocks, economy, and macro news
        const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.a.dj.com%2Frss%2FRSSMarketsMain.xml');
        const data = await response.json();
        
        if (data.status === 'ok') {
          const formattedNews: NewsItem[] = data.items.map((item: any) => ({
            id: item.guid,
            title: item.title,
            summary: item.description.replace(/<[^>]*>?/gm, '').substring(0, 120).trim() + '...',
            source: 'WSJ Markets',
            time: formatTimeAgo(item.pubDate),
            sentiment: getNaiveSentiment(item.title + ' ' + item.description),
            url: item.link
          }));
          setNewsData(formattedNews);
        }
      } catch (error) {
        console.error("Failed to fetch news", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNews();
  }, []);

  // Load Twitter widgets script robustly
  useEffect(() => {
    // Official Twitter script snippet
    const loadTwitter = () => {
      // @ts-ignore
      window.twttr = (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0],
          t = (window as any).twttr || {};
        if (d.getElementById(id)) return t;
        js = d.createElement(s) as HTMLScriptElement;
        js.id = id;
        js.src = "https://platform.twitter.com/widgets.js";
        if (fjs && fjs.parentNode) {
          fjs.parentNode.insertBefore(js, fjs);
        } else {
          d.head.appendChild(js);
        }
        t._e = [];
        t.ready = function(f: any) {
          t._e.push(f);
        };
        return t;
      }(document, "script", "twitter-wjs"));
    };

    if (!(window as any).twttr) {
      loadTwitter();
    }

    if (filter === 'twitter') {
      if ((window as any).twttr && (window as any).twttr.widgets) {
        // Use setTimeout to ensure DOM is ready before parsing
        setTimeout(() => {
          (window as any).twttr.widgets.load();
        }, 100);
      } else {
        // If it's not ready yet, queue it
        // @ts-ignore
        if ((window as any).twttr && (window as any).twttr.ready) {
          (window as any).twttr.ready((twttr: any) => {
            setTimeout(() => {
              twttr.widgets.load();
            }, 100);
          });
        }
      }
    }
  }, [filter]);

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      
      {/* Main Content: News Feed */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div className="panel" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="panel-title">Market Intelligence</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={`btn ${filter === 'rss' ? 'active' : ''}`} onClick={() => setFilter('rss')}>RSS Feed</button>
            <button className={`btn ${filter === 'twitter' ? 'active' : ''}`} onClick={() => setFilter('twitter')}>X / Twitter</button>
          </div>
        </div>

        {filter === 'twitter' ? (
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <a 
              className="twitter-timeline" 
              data-theme="dark" 
              data-height="800"
              data-chrome="nofooter noborders transparent"
              href="https://twitter.com/markets?ref_src=twsrc%5Etfw">
              Loading Tweets...
            </a>
          </div>
        ) : loading ? (
          <div className="loader-container" style={{ height: '300px' }}>
            <div className="spinner"></div>
            <p>Fetching latest news...</p>
          </div>
        ) : (
          <div className="grid-summary">
            {newsData.map(news => (
              <a key={news.id} href={news.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s ease, border-color 0.2s ease' }} 
                     onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                     onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span className="text-secondary text-xs font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{news.source}</span>
                    <SentimentBadge type={news.sentiment} />
                  </div>
                  
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', lineHeight: '1.4' }}>{news.title}</h3>
                  
                  <p className="text-secondary text-sm" style={{ flex: 1, marginBottom: '16px', lineHeight: '1.6' }}>
                    {news.summary}
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                    <span className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {news.time}
                    </span>
                    <ExternalLink size={14} className="text-muted" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar: Economic Calendar */}
      <div className="panel" style={{ width: '350px', flexShrink: 0, position: 'sticky', top: '24px' }}>
        <div className="panel-header" style={{ marginBottom: '16px' }}>
          <h2 className="panel-title">
            <Calendar size={20} className="text-blue" />
            Economic Calendar
          </h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {MOCK_CALENDAR.map((event, index) => (
            <div key={event.id} style={{ 
              paddingBottom: index !== MOCK_CALENDAR.length - 1 ? '16px' : '0',
              borderBottom: index !== MOCK_CALENDAR.length - 1 ? '1px solid var(--border-color)' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span className="text-muted text-xs font-mono">{event.date}</span>
                <span className="text-xs font-semibold">{event.country}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.95rem', margin: 0, lineHeight: 1.3 }}>{event.event}</h4>
                <ImpactBadge level={event.impact} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Actual</span>
                  <span className="font-mono text-sm" style={{ color: event.actual !== '-' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{event.actual}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Forecast</span>
                  <span className="font-mono text-sm text-secondary">{event.forecast}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Previous</span>
                  <span className="font-mono text-sm text-secondary">{event.previous}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <button className="btn w-full mt-2" style={{ marginTop: '16px', justifyContent: 'center' }}>
          View Full Calendar
        </button>
      </div>

    </div>
  );
};
