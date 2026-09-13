export const fetchJson = async <T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const forwardAbort = () => controller.abort();
  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', forwardAbort, { once: true });
    }
  }

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.clone().json() as { error?: string };
        detail = body.error ? `: ${body.error}` : '';
      } catch {
        // Keep the status-based message when the upstream body is not JSON.
      }
      throw new Error(`Request failed (${response.status} ${response.statusText})${detail}`);
    }

    return await response.json() as T;
  } finally {
    clearTimeout(timeoutId);
    init.signal?.removeEventListener('abort', forwardAbort);
  }
};
