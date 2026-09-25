import { XMLParser, XMLValidator } from 'fast-xml-parser';

const gdeltQuery = '(oil OR gold OR inflation OR sanctions OR "Federal Reserve") sourcelang:english (domain:reuters.com OR domain:apnews.com OR domain:bbc.com OR domain:cnbc.com)';
export const SOURCES = [
  { id: 'bloomberg', name: 'Bloomberg Markets', url: 'https://feeds.bloomberg.com/markets/news.rss', ttl: 60000 },
  { id: 'cnbc', name: 'CNBC Markets', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', ttl: 60000 },
  { id: 'fed', name: 'Federal Reserve', url: 'https://www.federalreserve.gov/feeds/press_monetary.xml', ttl: 60000, category: 'Macro' },
  { id: 'bls-cpi', name: 'BLS CPI', url: 'https://www.bls.gov/feed/cpi.rss', ttl: 60000, category: 'Macro' },
  { id: 'bls-jobs', name: 'BLS Employment', url: 'https://www.bls.gov/feed/empsit.rss', ttl: 60000, category: 'Macro' },
  { id: 'bea', name: 'BEA', url: 'https://www.bea.gov/rss/rss.xml', ttl: 60000, category: 'Macro' },
  { id: 'eia', name: 'EIA', url: 'https://www.eia.gov/rss/todayinenergy.xml', ttl: 60000, category: 'Oil' },
  { id: 'gdelt', name: 'GDELT discovery', url: `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(gdeltQuery)}&mode=ArtList&format=json&maxrecords=20&sort=DateDesc&timespan=24h`, ttl: 900000, category: 'OSINT' },
];
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, processEntities: true });
const plain = value => String(typeof value === 'object' ? value?.['#text'] ?? '' : value ?? '')
  .replace(/&#(x[\da-f]+|\d+);/gi, (match, code) => {
    const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
  })
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim();
export function safeUrl(value) {
  try {
    const url = new URL(plain(value));
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|ref$|mod$)/i.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch { return null; }
}
function categories(title, source) {
  const result = new Set(source.category ? [source.category] : []);
  if (/nasdaq|s&p|stocks?|equities|wall street|earnings|nvidia|microsoft|apple|meta\b|\bai\b|tech\b|\bshares?\b|small caps|tesla|oracle|amazon/i.test(title)) result.add('US Stocks');
  if (/\bgold\b|\bbullion\b|\bxau(?:usd)?\b/i.test(title)) result.add('Gold');
  if (/\boil\b|crude|opec|petroleum|brent|\bwti\b|energy/i.test(title)) result.add('Oil');
  if (/fed\b|inflation|cpi|pce|payroll|employment|gdp|\brates?\b|treasur|yields?|dollar|tariff|econom|central bank|\bbonds?\b|sanctions?|\bwar\b|trade deal|trade talks/i.test(title)) result.add('Macro');
  return result.size ? [...result] : ['Markets'];
}
export function parseFeed(body, source, now = Date.now()) {
  let entries;
  if (source.id === 'gdelt') {
    const data = JSON.parse(body);
    if (!Array.isArray(data.articles)) throw new Error('Invalid GDELT response');
    entries = data.articles.map(a => ({title: a.title, link: a.url, pubDate: String(a.seendate ?? '').replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'), publisher: a.domain}));
  } else {
    if (/<!DOCTYPE|<!ENTITY/i.test(body) || XMLValidator.validate(body) !== true) throw new Error('Invalid RSS');
    const document = parser.parse(body);
    const channel = document?.rss?.channel;
    const atom = document?.feed;
    if (!channel && !atom) throw new Error('Not a news feed');
    const raw = channel?.item ?? atom?.entry ?? [];
    entries = (Array.isArray(raw) ? raw : [raw]).map(entry => {
      if (!atom) return entry;
      const links = Array.isArray(entry.link) ? entry.link : [entry.link];
      return {...entry, link: links.find(link => link?.['@_rel'] === 'alternate' || !link?.['@_rel'])?.['@_href'], pubDate: entry.published || entry.updated};
    });
  }
  return entries.flatMap(entry => {
    const title = plain(entry.title).slice(0, 500);
    const url = safeUrl(entry.link);
    const date = Date.parse(plain(entry.pubDate || entry['dc:date']));
    if (!title || !url || !Number.isFinite(date) || date > now + 300000 || now - date > 45 * 86400000) return [];
    const tags = categories(title, source);
    if (['cnbc', 'bloomberg'].includes(source.id) && tags.every(tag => tag === 'Markets')) return [];
    return [{ id: url, url, title, source: source.name, sourceId: source.id,
      publisher: source.id === 'gdelt' ? plain(entry.publisher) : source.name,
      publishedAt: new Date(date).toISOString(), dateKind: source.id === 'gdelt' ? 'discovered' : 'published',
      categories: tags,
    }];
  });
}
export function createNewsService({ fetcher = fetch, now = Date.now, sources = SOURCES } = {}) {
  const cache = new Map();
  const inFlight = new Map();
  async function sourceFeed(source) {
    const previous = cache.get(source.id);
    if (previous && now() - previous.attemptedAt < source.ttl) return previous;
    if (inFlight.has(source.id)) return inFlight.get(source.id);
    const request = (async () => {
      const attemptedAt = now();
      let result;
      try {
        const response = await fetcher(source.url, {signal: AbortSignal.timeout(6000), headers: {accept: '*/*', 'user-agent': 'AlphaFlow/1.0 (news reader)'}});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 2000000) throw new Error('Feed too large');
        const encoding = /ISO-8859-1/i.test(new TextDecoder().decode(bytes.slice(0, 150))) ? 'windows-1252' : 'utf-8';
        const items = parseFeed(new TextDecoder(encoding).decode(bytes), source, now());
        result = {id: source.id, name: source.name, status: items.length ? 'ok' : 'empty', items, attemptedAt, fetchedAt: new Date(now()).toISOString(), error: null};
      } catch (error) {
        const items = (previous?.items ?? []).filter(item => now() - Date.parse(item.publishedAt) < 45 * 86400000);
        result = {id: source.id, name: source.name, status: items.length ? 'stale' : 'error', items, attemptedAt, fetchedAt: previous?.fetchedAt ?? null,
          error: error?.name === 'TimeoutError' ? 'Source timed out' : /^HTTP \d+$/.test(error?.message) ? error.message : 'Source unavailable'};
      }
      cache.set(source.id, result);
      return result;
    })();
    inFlight.set(source.id, request);
    try { return await request; } finally { inFlight.delete(source.id); }
  }
  return async () => {
    const results = await Promise.all(sources.map(sourceFeed));
    const seen = new Set();
    const items = results.flatMap(s => s.items).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true; }).slice(0, 150);
    return {items, checkedAt: new Date(now()).toISOString(), sources: results.map(({items: _items, attemptedAt: _at, ...status}) => status)};
  };
}
export const getNews = createNewsService();
export async function newsResponse() {
  const payload = await getNews();
  return new Response(JSON.stringify(payload), {status: payload.items.length || payload.sources.some(s => ['ok', 'empty'].includes(s.status)) ? 200 : 503,
    headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=30'}});
}
