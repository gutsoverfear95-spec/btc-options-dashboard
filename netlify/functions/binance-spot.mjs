const BINANCE_SPOT_BASE = 'https://api.binance.com/api/v3';

const getEndpoint = (request) => {
  const url = new URL(request.url);
  const candidates = [
    url.pathname,
    request.headers.get('x-nf-original-path') || '',
    request.headers.get('x-forwarded-uri') || '',
  ];

  for (const candidate of candidates) {
    const normalized = candidate.replace(/\/+$/, '');
    const match = normalized.match(/(?:binance-spot|api\/binance-spot)(?:\/|$)(.*)$/);
    if (match) return match[1].replace(/^\/+|\/+$/g, '');
  }

  return '';
};

export default async (request) => {
  const endpoint = getEndpoint(request);
  if (endpoint !== 'ticker/price') {
    return Response.json(
      { error: 'Unsupported Binance Spot endpoint' },
      { status: 404 },
    );
  }

  const requestUrl = new URL(request.url);
  const target = `${BINANCE_SPOT_BASE}/${endpoint}${requestUrl.search}`;

  try {
    const upstream = await fetch(target, {
      headers: {
        accept: 'application/json',
        'user-agent': 'AlphaFlow/1.0',
      },
    });

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        'cache-control': 'no-store',
        'content-type': upstream.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Binance request failed' },
      { status: 502 },
    );
  }
};
