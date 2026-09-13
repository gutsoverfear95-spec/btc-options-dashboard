import type { OptionData } from './deribit';

// Helper to normalize Binance data to our Deribit format
export const fetchBinanceOptionsData = async (): Promise<OptionData[]> => {
  try {
    // 1. Get all Mark Prices (contains gamma, markPrice, etc)
    const markRes = await fetch('/api/binance-options/mark');
    const markData: any[] = await markRes.json();
    
    const btcMarks = markData.filter(m => m.symbol.startsWith('BTC-'));
    
    // Extract unique expiration strings from symbols: "BTC-240126-40000-C" -> "240126"
    const expSet = new Set<string>();
    btcMarks.forEach(m => {
      const parts = m.symbol.split('-');
      if (parts.length === 4) {
        expSet.add(parts[1]);
      }
    });
    const expirations = Array.from(expSet);

    // 2. Fetch Open Interest for all expirations in parallel
    const oiPromises = expirations.map(exp => 
      fetch(`/api/binance-options/openInterest?underlyingAsset=BTC&expiration=${exp}`)
        .then(res => res.json())
        .catch(() => []) // Fallback to empty array on failure
    );
    
    const oiResults = await Promise.all(oiPromises);
    
    // Build a map of symbol -> OI
    const oiMap = new Map<string, number>();
    oiResults.forEach((oiArray: any) => {
      if (Array.isArray(oiArray)) {
        oiArray.forEach(oi => {
          oiMap.set(oi.symbol, parseFloat(oi.sumOpenInterest || '0'));
        });
      }
    });

    // 3. Get Spot price
    const spotRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const spotData = await spotRes.json();
    const spot = parseFloat(spotData.price);

    // 4. Map to OptionData format
    const options: OptionData[] = [];
    
    btcMarks.forEach(m => {
      const parts = m.symbol.split('-');
      if (parts.length !== 4) return;
      
      const expiryStr = parts[1]; // YYMMDD
      const strike = parseFloat(parts[2]);
      const type = parts[3] === 'C' ? 'call' : 'put';
      
      // Convert YYMMDD to timestamp
      const year = 2000 + parseInt(expiryStr.substring(0, 2));
      const month = parseInt(expiryStr.substring(2, 4)) - 1;
      const day = parseInt(expiryStr.substring(4, 6));
      const expiryTs = new Date(Date.UTC(year, month, day, 8, 0, 0)).getTime(); // Binance expires at 08:00 UTC
      
      const oi = oiMap.get(m.symbol) || 0;
      if (oi === 0) return; // Skip zero OI to save memory and calculation
      
      const gamma = parseFloat(m.gamma || '0');
      const markPrice = parseFloat(m.markPrice || '0');
      
      // Calculate GEX
      // Note: Binance gamma might be in terms of %, but Deribit's is usually per $1. 
      // If we use standard convention: Gamma * OI * Spot * 100
      const gex = gamma * oi * spot * 100 * (type === 'call' ? 1 : -1);

      options.push({
        instrument_name: m.symbol,
        type,
        strike,
        expiry: expiryTs,
        open_interest: oi,
        mark_price: markPrice,
        underlying_price: spot,
        gex,
        volume: 0,
        bid: 0,
        ask: 0,
        mark_iv: parseFloat(m.markIV || '0'),
        gamma
      });
    });

    return options;
  } catch (err) {
    console.error("Failed to fetch Binance options data:", err);
    return [];
  }
};
