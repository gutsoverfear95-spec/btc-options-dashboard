import { fetchJson } from './http';
import { calculateDollarGammaExposure } from './optionsMath';

// Black-Scholes Gamma Calculation
const N_prime = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

const calculateGamma = (S: number, K: number, T: number, v: number, r: number = 0) => {
  if (T <= 0 || v <= 0) return 0;
  const d1 = (Math.log(S / K) + (r + v * v / 2) * T) / (v * Math.sqrt(T));
  return N_prime(d1) / (S * v * Math.sqrt(T));
};

export interface OptionData {
  instrument_name: string;
  source: 'deribit' | 'binance';
  strike: number;
  type: 'call' | 'put';
  expiry: number; // timestamp ms
  volume: number;
  open_interest: number;
  bid: number;
  ask: number;
  mark_iv: number;
  mark_price: number;
  underlying_price: number;
  gamma: number;
  gex: number;
  contract_size: number;
}

interface DeribitInstrument {
  instrument_name: string;
  strike: number;
  option_type: 'call' | 'put';
  expiration_timestamp: number;
  contract_size: number;
}

interface DeribitBookSummary {
  instrument_name: string;
  estimated_delivery_price?: number;
  underlying_price?: number;
  mark_iv?: number;
  open_interest?: number;
  volume?: number;
  bid_price?: number;
  ask_price?: number;
  mark_price?: number;
}

export const fetchOptionsData = async (signal?: AbortSignal): Promise<OptionData[]> => {
  // Fetch all active BTC options instruments to get strike and expiry details.
  const instrumentsData = await fetchJson<{ result: DeribitInstrument[] }>(
    'https://www.deribit.com/api/v2/public/get_instruments?currency=BTC&kind=option&expired=false',
    { signal },
  );
  if (!Array.isArray(instrumentsData.result)) {
    throw new Error('Deribit instruments response has an unexpected shape');
  }

  const instrumentMap = new Map<string, DeribitInstrument>();
  instrumentsData.result.forEach(instrument => {
    instrumentMap.set(instrument.instrument_name, instrument);
  });

  // Fetch book summary to get market data (OI, volume, IV, prices).
  const bookData = await fetchJson<{ result: DeribitBookSummary[] }>(
    'https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=option',
    { signal },
  );
  if (!Array.isArray(bookData.result)) {
    throw new Error('Deribit book response has an unexpected shape');
  }

  const now = Date.now();
  const options: OptionData[] = [];

  bookData.result.forEach(summary => {
    const details = instrumentMap.get(summary.instrument_name);
    if (!details) return;

    const spot = summary.estimated_delivery_price || summary.underlying_price || 0;
    if (!Number.isFinite(spot) || spot <= 0) return;

    const timeToExpiry = (details.expiration_timestamp - now) / (1000 * 60 * 60 * 24 * 365);
    const volatility = (summary.mark_iv || 0) / 100;
    const gamma = calculateGamma(spot, details.strike, timeToExpiry, volatility);
    const contractSize = Number(details.contract_size) || 1;
    const unsignedGex = calculateDollarGammaExposure(
      gamma,
      summary.open_interest || 0,
      spot,
      contractSize,
    );

    options.push({
      instrument_name: summary.instrument_name,
      source: 'deribit',
      strike: details.strike,
      type: details.option_type,
      expiry: details.expiration_timestamp,
      volume: summary.volume || 0,
      open_interest: summary.open_interest || 0,
      bid: summary.bid_price || 0,
      ask: summary.ask_price || 0,
      mark_iv: summary.mark_iv || 0,
      mark_price: summary.mark_price || 0,
      underlying_price: spot,
      gamma,
      gex: details.option_type === 'put' ? -unsignedGex : unsignedGex,
      contract_size: contractSize,
    });
  });

  return options;
};
