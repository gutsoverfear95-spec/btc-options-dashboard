import { useEffect, useRef, useState } from 'react';
export interface NewsItem {
  id: string; title: string; source: string; sourceId: string; publisher: string;
  publishedAt: string; dateKind: 'published' | 'discovered'; url: string; categories: string[];
}
export interface SourceStatus { id: string; name: string; status: string; fetchedAt: string | null; error: string | null }
interface NewsPayload { items: NewsItem[]; sources: SourceStatus[]; checkedAt: string }
export function parseNewsPayload(value: unknown): NewsPayload {
  const data = value as NewsPayload;
  if (!data || !Array.isArray(data.items) || !Array.isArray(data.sources) || !Number.isFinite(Date.parse(data.checkedAt))) throw new Error('Invalid news response');
  if (!data.sources.every(s => typeof s?.id === 'string' && typeof s.name === 'string' && ['ok', 'empty', 'error', 'stale'].includes(s.status) && (s.fetchedAt === null || Number.isFinite(Date.parse(s.fetchedAt))))) throw new Error('Invalid source status');
  if (!data.items.every(item => item && ['id', 'title', 'source', 'sourceId', 'publisher', 'url'].every(key => typeof item[key as keyof NewsItem] === 'string') && /^https?:\/\//i.test(item.url) && Number.isFinite(Date.parse(item.publishedAt)) && Array.isArray(item.categories) && item.categories.every(c => typeof c === 'string'))) throw new Error('Invalid news items');
  return {...data, items: [...new Map(data.items.map(item => [item.id, item])).values()]};
}
export function useLiveNews(enabled = true) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<NewsItem[] | null>(null);
  const itemsRef = useRef(items);
  const refreshRef = useRef<() => void>(() => {});
  function apply(next: NewsItem[]) { itemsRef.current = next; setItems(next); setPending(null); }
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let busy = false;
    let controller: AbortController | undefined;
    async function refresh() {
      if (stopped || busy || document.hidden) return;
      busy = true;
      setRefreshing(true);
      controller = new AbortController();
      const timer = window.setTimeout(() => controller?.abort(), 12000);
      try {
        const response = await fetch('/api/news', {signal: controller.signal, cache: 'no-cache'});
        const payload = parseNewsPayload(await response.json());
        if (stopped) return;
        setSources(payload.sources);
        if (!response.ok) throw new Error('News sources are unavailable. Showing previously loaded headlines.');
        const successful = new Set(payload.sources.filter(s => s.status === 'ok' || s.status === 'empty').map(s => s.id));
        const retained = itemsRef.current.filter(item => !successful.has(item.sourceId) && Date.now() - Date.parse(item.publishedAt) < 45 * 86400000);
        const next = [...new Map([...retained, ...payload.items].map(item => [item.id, item])).values()]
          .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 150);
        const ids = new Set(itemsRef.current.map(item => item.id));
        if (window.scrollY > 100 && itemsRef.current.length && next.some(item => !ids.has(item.id))) setPending(next);
        else apply(next);
        setCheckedAt(payload.checkedAt);
        setError('');
      } catch (err) {
        if (!stopped) setError(err instanceof Error && err.name !== 'AbortError' ? err.message : 'News request timed out. Keeping previously loaded headlines.');
      } finally {
        window.clearTimeout(timer);
        busy = false;
        if (!stopped) { setLoading(false); setRefreshing(false); }
      }
    }
    refreshRef.current = () => { void refresh(); };
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 60000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { stopped = true; controller?.abort(); window.clearInterval(interval); document.removeEventListener('visibilitychange', visible); refreshRef.current = () => {}; };
  }, [enabled]);
  return {items, sources, checkedAt, error, loading, refreshing, pending,
    refresh: () => refreshRef.current(), showPending: () => { if (pending) apply(pending); }};
}
