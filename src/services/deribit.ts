// Black-Scholes Gamma Calculation
const N_prime = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

const calculateGamma = (S: number, K: number, T: number, v: number, r: number = 0) => {
  if (T <= 0 || v <= 0) return 0;
  const d1 = (Math.log(S / K) + (r + v * v / 2) * T) / (v * Math.sqrt(T));
  return N_prime(d1) / (S * v * Math.sqrt(T));
};

export interface OptionData {
  instrument_name: string;
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
}

export const fetchOptionsData = async (): Promise<OptionData[]> => {
  try {
    // Fetch all active BTC options instruments to get strike and expiry details
    const instrumentsRes = await fetch('https://www.deribit.com/api/v2/public/get_instruments?currency=BTC&kind=option&expired=false');
    const instrumentsData = await instrumentsRes.json();
    const instruments = instrumentsData.result;

    const instrumentMap = new Map();
    instruments.forEach((inst: any) => {
      instrumentMap.set(inst.instrument_name, {
        strike: inst.strike,
        type: inst.option_type,
        expiry: inst.expiration_timestamp,
        contract_size: inst.contract_size
      });
    });

    // Fetch book summary to get market data (OI, volume, IV, prices)
    const bookRes = await fetch('https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=option');
    const bookData = await bookRes.json();
    const summaries = bookData.result;

    const now = Date.now();
    const options: OptionData[] = [];

    summaries.forEach((summary: any) => {
      const instName = summary.instrument_name;
      const details = instrumentMap.get(instName);
      if (!details) return;

      const S = summary.estimated_delivery_price || summary.underlying_price; // Spot price
      if (!S) return;

      const K = details.strike;
      const T = (details.expiry - now) / (1000 * 60 * 60 * 24 * 365); // Time to expiry in years
      const v = (summary.mark_iv || 0) / 100; // IV in decimal

      // Calculate Gamma
      const gamma = calculateGamma(S, K, T, v);

      // GEX = Gamma * Open Interest * Contract Size * Spot Price
      // Deribit contract size for BTC options is 1 BTC usually.
      // Call GEX is positive, Put GEX is negative.
      let gex = gamma * (summary.open_interest || 0) * S * S * 0.01; // Scaled for readability
      if (details.type === 'put') {
        gex = -gex;
      }

      options.push({
        instrument_name: instName,
        strike: K,
        type: details.type,
        expiry: details.expiry,
        volume: summary.volume || 0,
        open_interest: summary.open_interest || 0,
        bid: summary.bid_price || 0,
        ask: summary.ask_price || 0,
        mark_iv: summary.mark_iv || 0,
        mark_price: summary.mark_price || 0,
        underlying_price: S,
        gamma: gamma,
        gex: gex
      });
    });

    return options;
  } catch (error) {
    console.error('Error fetching Deribit data:', error);
    return [];
  }
};
