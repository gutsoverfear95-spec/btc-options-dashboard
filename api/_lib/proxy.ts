type QueryValue = string | string[] | undefined;

interface RequestLike {
  query: Record<string, QueryValue>;
}

interface ResponseLike {
  status(code: number): ResponseLike;
  setHeader(name: string, value: string): ResponseLike;
  send(body: string): void;
}

const firstValue = (value: QueryValue) => Array.isArray(value) ? value[0] : value;

export const proxyBinance = async (
  req: RequestLike,
  res: ResponseLike,
  baseUrl: string,
  endpoint: string,
) => {
  const query = new URLSearchParams();
  Object.entries(req.query || {}).forEach(([key, value]) => {
    const normalized = firstValue(value);
    if (normalized !== undefined) query.set(key, normalized);
  });

  const target = `${baseUrl}/${endpoint}${query.toString() ? `?${query}` : ''}`;

  try {
    const upstream = await fetch(target, {
      headers: {
        accept: 'application/json',
        'user-agent': 'AlphaFlow/1.0',
      },
    });

    res
      .status(upstream.status)
      .setHeader('cache-control', 'no-store')
      .setHeader(
        'content-type',
        upstream.headers.get('content-type') || 'application/json',
      )
      .send(await upstream.text());
  } catch (error) {
    res
      .status(502)
      .setHeader('content-type', 'application/json')
      .send(JSON.stringify({
        error: error instanceof Error ? error.message : 'Binance request failed',
      }));
  }
};
