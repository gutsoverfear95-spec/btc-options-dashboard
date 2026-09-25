import { describe, expect, it, vi } from 'vitest';
import { createNewsService, parseFeed } from '../server/news.mjs';
const now = Date.parse('2026-09-24T18:00:00Z');
const source = {id:'test', name:'Test', url:'https://example.org/rss', ttl:60000};
const rss = (link = 'https://example.org/article?utm_source=rss', date = 'Thu, 24 Sep 2026 17:00:00 GMT') => `<rss><channel><item><title>Gold rises &amp; oil falls</title><link>${link}</link><pubDate>${date}</pubDate></item></channel></rss>`;
describe('news feed parsing', () => {
  it('normalizes RSS, dates, categories, entities and tracking links', () => {
    const [item] = parseFeed(rss(), source, now);
    expect(item.title).toBe('Gold rises & oil falls');
    expect(item.url).toBe('https://example.org/article');
    expect(item.categories).toEqual(['Gold', 'Oil']);
    expect(item.publishedAt).toBe('2026-09-24T17:00:00.000Z');
  });
  it('parses the Atom format used by BLS', () => {
    const xml = '<feed><entry><title>CPI release</title><link rel="alternate" href="https://bls.gov/release"/><updated>2026-09-24T12:00:00Z</updated></entry></feed>';
    expect(parseFeed(xml, source, now)[0].url).toBe('https://bls.gov/release');
  });
  it('rejects unsafe links, invalid dates and obsolete news', () => {
    expect(parseFeed(rss('javascript:alert(1)'), source, now)).toEqual([]);
    expect(parseFeed(rss(undefined, 'bad date'), source, now)).toEqual([]);
    expect(parseFeed(rss(undefined, '2025-01-01'), source, now)).toEqual([]);
    expect(() => parseFeed('<html>Blocked</html>', source, now)).toThrow();
    expect(() => parseFeed('<!DOCTYPE rss><rss/>', source, now)).toThrow();
  });
  it('labels GDELT time as discovery rather than publication', () => {
    const [item] = parseFeed(JSON.stringify({articles:[{title:'Oil',url:'https://reuters.com/oil',domain:'reuters.com',seendate:'20260924T120000Z'}]}), {...source,id:'gdelt'}, now);
    expect(item.dateKind).toBe('discovered');
    expect(item.publisher).toBe('reuters.com');
  });
});
it('caches and coalesces concurrent requests; retains stale news on failure', async () => {
  let clock = now;
  const fetcher = vi.fn().mockImplementationOnce(async () => new Response(rss())).mockResolvedValue(new Response('', {status:429}));
  const get = createNewsService({fetcher, now: () => clock, sources:[source]});
  const [first, concurrent] = await Promise.all([get(),get()]);
  expect(first.items).toEqual(concurrent.items);
  await get(); expect(fetcher).toHaveBeenCalledTimes(1);
  clock += 60001;
  const failed = await get();
  expect(failed.items).toEqual(first.items);
  expect(failed.sources[0].status).toBe('stale');
  expect(failed.sources[0].fetchedAt).toBe(first.sources[0].fetchedAt);
});
it('isolates failed sources and deduplicates links', async () => {
  const sources = [source, {...source,id:'other'}, {...source,id:'broken',url:'https://example.org/broken'}];
  const get = createNewsService({now:()=>now,sources,fetcher:async url => url.endsWith('broken') ? new Response('bad',{status:503}) : new Response(rss())});
  const result = await get();
  expect(result.items).toHaveLength(1);
  expect(result.sources.find(s=>s.id==='broken').status).toBe('error');
});
it('filters general-interest stories and decodes numeric headline entities', () => {
 const xml = rss().replace('Gold rises &amp; oil falls', 'Pandas arrive at the zoo');
 expect(parseFeed(xml, {...source,id:'cnbc'}, now)).toEqual([]);
 expect(parseFeed(rss().replace('Gold rises &amp; oil falls', 'Fed&#39;s rate decision'), source, now)[0].title).toBe("Fed's rate decision");
});
