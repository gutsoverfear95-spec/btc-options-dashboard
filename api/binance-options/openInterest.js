const upstreamBase = 'https://eapi.binance.com/eapi/v1/openInterest';

export default async function handler(req, res) {
  try {
    const query = new URLSearchParams();
    const source = req.query || {};
    Object.entries(source).forEach(([key, value]) => {
      const normalized = Array.isArray(value) ? value[0] : value;
      if (normalized !== undefined) query.set(key, normalized);
    });

    const upstream = await fetch(`${upstreamBase}?${query.toString()}`, {
      headers: {
        accept: 'application/json',
        'user-agent': 'AlphaFlow/1.0',
      },
    });

    res.statusCode = upstream.status;
    res.setHeader('cache-control', 'no-store');
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json');
    const body = await upstream.text();
    if (upstream.status === 451) {
      res.statusCode = 503;
      res.end(JSON.stringify({
        error: 'Binance blocked the Vercel Function region (HTTP 451)',
      }));
      return;
    }
    res.end(body);
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      error: error instanceof Error ? error.message : 'Binance request failed',
    }));
  }
}
