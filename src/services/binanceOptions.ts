import type { OptionData } from './deribit';
import { fetchJson } from './http';
import { calculateDollarGammaExposure } from './optionsMath';

// Helper to normalize Binance data to our Deribit format
interface BinanceMarkPrice {
  symbol: string;
  markPrice?: string;
  markIV?: string;
  gamma?: string;
}

interface BinanceOpenInterest {
  symbol: string;
  sumOpenInterest?: string;
}

interface BinanceSpotPrice {
  price?: string;
}

export const fetchBinanceOptionsData = async (signal?: AbortSignal): Promise<OptionData[]> => {
  // Keep all browser requests behind same-origin proxy/serverless routes.
  const markData = await fetchJson<BinanceMarkPrice[]>(
    '/api/binance-options/mark',
    { signal },
  );
  if (!Array.isArray(markData)) {
    throw new Error('Binance mark response has an unexpected shape');
  }
  const btcMarks = markData.filter(mark => mark.symbol.startsWith('BTC-'));

  // Extract unique expiration strings from symbols: "BTC-240126-40000-C" -> "240126".
  const expirations = Array.from(new Set(
    btcMarks
      .map(mark => mark.symbol.split('-'))
      .filter(parts => parts.length === 4)
      .map(parts => parts[1]),
  ));

  const oiResults = await Promise.all(
    expirations.map(expiration => fetchJson<BinanceOpenInterest[]>(
      `/api/binance-options/openInterest?underlyingAsset=BTC&expiration=${encodeURIComponent(expiration)}`,
      { signal },
    )),
  );

  const oiMap = new Map<string, number>();
  oiResults.forEach(oiArray => {
    oiArray.forEach(oi => {
      const value = Number(oi.sumOpenInterest || 0);
      if (Number.isFinite(value)) oiMap.set(oi.symbol, value);
    });
  });

  const spotData = await fetchJson<BinanceSpotPrice>(
    '/api/binance-spot/ticker/price?symbol=BTCUSDT',
    { signal },
  );
  const spot = Number(spotData.price);
  if (!Number.isFinite(spot) || spot <= 0) {
    throw new Error('Binance options index price is unavailable');
  }

  const options: OptionData[] = [];
  btcMarks.forEach(mark => {
    const parts = mark.symbol.split('-');
    if (parts.length !== 4) return;

    const expiryStr = parts[1];
    const strike = Number(parts[2]);
    const type = parts[3] === 'C' ? 'call' : 'put';
    const year = 2000 + Number(expiryStr.substring(0, 2));
    const month = Number(expiryStr.substring(2, 4)) - 1;
    const day = Number(expiryStr.substring(4, 6));
    const expiryTs = new Date(Date.UTC(year, month, day, 8, 0, 0)).getTime();

    const openInterest = oiMap.get(mark.symbol) || 0;
    const gamma = Number(mark.gamma || 0);
    if (!Number.isFinite(strike) || !Number.isFinite(gamma) || openInterest <= 0) return;

    // Binance BTC options are normalized to a 1 BTC contract here. If the
    // exchange changes the contract multiplier, source metadata must be updated.
    const contractSize = 1;
    const unsignedGex = calculateDollarGammaExposure(
      gamma,
      openInterest,
      spot,
      contractSize,
    );

    options.push({
      instrument_name: mark.symbol,
      source: 'binance',
      type,
      strike,
      expiry: expiryTs,
      open_interest: openInterest,
      mark_price: Number(mark.markPrice || 0),
      underlying_price: spot,
      gex: type === 'call' ? unsignedGex : -unsignedGex,
      volume: 0,
      bid: 0,
      ask: 0,
      mark_iv: Number(mark.markIV || 0),
      gamma,
      contract_size: contractSize,
    });
  });

  return options;
};
