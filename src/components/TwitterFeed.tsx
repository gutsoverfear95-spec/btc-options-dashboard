import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { loadTwitterWidgets } from '../services/twitter';

export const TwitterFeed = () => {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    // Each attempt owns its DOM so late widget responses cannot overwrite a retry.
    const target = document.createElement('div');
    host.replaceChildren(target);
    let active = true;
    setStatus('loading');
    const fail = () => {
      if (!active) return;
      active = false;
      window.clearTimeout(timer);
      target.remove();
      setStatus('error');
    };
    const timer = window.setTimeout(fail, 20000);

    void loadTwitterWidgets().then(async (twitter) => {
      if (!active) return;
      const widget = await twitter.widgets.createTimeline(
        { sourceType: 'profile', screenName: 'markets' },
        target,
        { theme: 'dark', height: 800, chrome: 'nofooter noborders transparent', dnt: true },
      );
      if (!active) return;
      if (!widget) {
        fail();
        return;
      }
      window.clearTimeout(timer);
      setStatus('ready');
    }).catch(fail);

    return () => {
      active = false;
      window.clearTimeout(timer);
      target.remove();
    };
  }, [attempt]);

  return (
    <section className="panel" aria-label="X / Twitter feed" style={{ overflow: 'hidden', minHeight: 220 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Bloomberg Markets <span className="text-secondary">@markets</span></h3>
        <a className="btn" href="https://x.com/markets" target="_blank" rel="noopener noreferrer">
          Open on X <ExternalLink size={14} />
        </a>
      </div>
      {status === 'loading' && (
        <div className="loader-container" role="status" style={{ minHeight: 180 }}>
          <div className="spinner" />
          <p>Loading posts from X...</p>
        </div>
      )}
      {status === 'error' && (
        <div role="status" style={{ padding: '24px 0' }}>
          <p>Unable to load the X feed.</p>
          <p className="text-secondary" style={{ margin: '12px 0 20px' }}>
            X may be temporarily unavailable or blocked by your browser. Try again or open @markets on X.
          </p>
          <button className="btn" onClick={() => setAttempt(value => value + 1)}>
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      )}
      <div ref={container} aria-busy={status === 'loading'} hidden={status === 'error'} />
    </section>
  );
};
