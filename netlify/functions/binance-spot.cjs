const BINANCE_SPOT_BASE = 'https://api.binance.com/api/v3';

const getPath = (event) => {
  const candidates = [
    event.path,
    event.resource,
    event.rawUrl ? new URL(event.rawUrl).pathname : '',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = candidate.replace(/\/+$/, '');
    const match = normalized.match(/(?:binance-spot|api\/binance-spot)(?:\/|$)(.*)$/);
    if (match) return match[1].replace(/^\/+|\/+$/g, '');
  }

  return '';
};

const getEndpoint = (event) => {
  return getPath(event);
};

const getQuery = (event) => {
  if (event.rawQuery) return `?${event.rawQuery}`;
  const params = new URLSearchParams();
  Object.entries(event.queryStringParameters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

exports.handler = async (event) => {
  const endpoint = getEndpoint(event);
  if (endpoint !== 'ticker/price') {
    return {
      statusCode: 404,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Unsupported Binance Spot endpoint' }),
    };
  }

  const target = `${BINANCE_SPOT_BASE}/${endpoint}${getQuery(event)}`;

  try {
    const upstream = await fetch(target, {
      headers: {
        accept: 'application/json',
        'user-agent': 'AlphaFlow/1.0',
      },
    });

    return {
      statusCode: upstream.status,
      headers: {
        'cache-control': 'no-store',
        'content-type': upstream.headers.get('content-type') || 'application/json',
      },
      body: await upstream.text(),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Binance request failed',
      }),
    };
  }
};
