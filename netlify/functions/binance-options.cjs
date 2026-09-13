const BINANCE_OPTIONS_BASE = 'https://eapi.binance.com/eapi/v1';

const getEndpoint = (event) => {
  const path = event.path || '';
  const match = path.match(/(?:binance-options|api\/binance-options)\/(.+)$/);
  return match?.[1] || '';
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
  if (!/^(mark|openInterest)$/.test(endpoint)) {
    return {
      statusCode: 404,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Unsupported Binance Options endpoint' }),
    };
  }

  const target = `${BINANCE_OPTIONS_BASE}/${endpoint}${getQuery(event)}`;

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
