import { useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { AssetSentiment } from './AssetSentiment';
import { TwitterFeed } from './TwitterFeed';
import { useLiveNews } from '../hooks/useLiveNews';
import './MacroNews.css';
const FILTERS = ['All', 'US Stocks', 'Gold', 'Oil', 'Macro', 'OSINT'];
const timestamp = (date: string) => new Date(date).toLocaleString();
export const MacroNews = () => {
  const [tab, setTab] = useState<'news' | 'twitter'>('news');
  const [category, setCategory] = useState('All');
  const news = useLiveNews(tab === 'news');
  const visible = news.items.filter(item => category === 'All' || item.categories.includes(category));
  const issues = news.sources.filter(source => source.status === 'error' || source.status === 'stale');
  return <section className="macro-news">
    <header className="panel news-toolbar">
      <div><h2 className="panel-title">Market Intelligence</h2><p className="text-secondary text-xs">US stocks · Gold · Oil · Macro</p></div>
      <div className="news-actions">
        <button className={`btn ${tab === 'news' ? 'active' : ''}`} onClick={() => setTab('news')}>Live News</button>
        <button className={`btn ${tab === 'twitter' ? 'active' : ''}`} onClick={() => setTab('twitter')}>X / Twitter</button>
      </div>
    </header>
    {tab === 'twitter' ? <TwitterFeed /> : <>
      <div className="panel news-controls">
        <div className="news-actions" aria-label="News categories">{FILTERS.map(filter => <button key={filter} className={`btn ${category === filter ? 'active' : ''}`} aria-pressed={category === filter} onClick={() => setCategory(filter)}>{filter}</button>)}</div>
        <div className="news-toolbar text-secondary text-xs">
          <span role="status">{news.refreshing ? 'Checking sources…' : 'Auto-refresh: 60 seconds'} · Last checked: {news.checkedAt ? timestamp(news.checkedAt) : 'Not yet'}</span>
          <button className="btn" disabled={news.refreshing} onClick={news.refresh}><RefreshCw size={14} /> Refresh</button>
        </div>
        <p className="text-secondary text-xs">Checks pause in background tabs. RSS publication times vary; GDELT discovery refreshes every 15 minutes.</p>
        {news.error && <p role="alert" className="news-warning">{news.error}</p>}
        {!!issues.length && <p className="news-warning" role="status">Some sources are unavailable or cached: {issues.map(s => s.name).join(', ')}.</p>}
        <details className="text-secondary text-xs"><summary>Sources &amp; freshness</summary>
          <ul>{news.sources.map(source => <li key={source.id}>{source.name}: {source.status}{source.error ? ` (${source.error})` : ''} · Last fetched: {source.fetchedAt ? timestamp(source.fetchedAt) : 'Not yet'}</li>)}</ul>
          <p>GDELT discovers reports from selected publishers; these are not independently verified OSINT findings. Dates on these items indicate discovery time. Headlines older than 45 days are excluded.</p>
        </details>
      </div>
      {news.pending && <button className="btn active" onClick={news.showPending}>New headlines available — show without reloading</button>}
      {news.loading ? <div className="loader-container" role="status"><div className="spinner" /><p>Fetching market headlines…</p></div>
        : !visible.length ? <div className="panel" role="status">No recent headlines available for this category.{category === 'OSINT' && ' Check the GDELT source status above.'}</div>
        : <div className="news-list">{visible.map(item => <article className="panel news-item" key={item.id}>
          <div className="news-card-header">
            <div><span className="text-secondary text-xs">{item.publisher}{item.sourceId === 'gdelt' ? ' · via GDELT' : ''}{item.sourceId === 'zerohedge' ? ' · News & commentary' : ''}{['fed', 'bea', 'bls-cpi', 'bls-jobs', 'eia'].includes(item.sourceId) ? ' · Official release' : ''}</span>
              <div className="news-tags">{item.categories.map(tag => <span key={tag}>{tag}</span>)}</div>
            </div>
            <AssetSentiment title={item.title} />
          </div>
          <h3><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title} <ExternalLink size={14} /></a></h3>
          <time className="text-secondary text-xs" dateTime={item.publishedAt}>{item.dateKind === 'discovered' ? 'Discovered' : 'Published'}: {timestamp(item.publishedAt)}{Date.parse(news.checkedAt ?? item.publishedAt) - Date.parse(item.publishedAt) > 7 * 86400000 ? ' · Older release' : ''}</time>
        </article>)}</div>}
    </>}
  </section>;
};
