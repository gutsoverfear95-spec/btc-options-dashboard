const upstreamUrl = 'https://eapi.binance.com/eapi/v1/mark';

export default async function handler(req, res) {
  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        accept: 'application/json',
        'user-agent': 'AlphaFlow/1.0',
      },
    });

    res.statusCode = upstream.status;
    res.setHeader('cache-control', 'no-store');
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json');
    res.end(await upstream.text());
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      error: error instanceof Error ? error.message : 'Binance request failed',
    }));
  }
}
