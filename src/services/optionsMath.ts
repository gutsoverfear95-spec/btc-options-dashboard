export const calculateDollarGammaExposure = (
  gamma: number,
  openInterest: number,
  spot: number,
  contractSize = 1,
) => {
  if (![gamma, openInterest, spot, contractSize].every(Number.isFinite)) return 0;

  // Dollar GEX for a 1% move in the underlying.
  return gamma * openInterest * contractSize * spot * spot * 0.01;
};

export const getReferenceSpot = (options: Array<{ underlying_price: number }>) => {
  const spots = options
    .map(option => option.underlying_price)
    .filter((spot): spot is number => Number.isFinite(spot) && spot > 0)
    .sort((a, b) => a - b);

  if (spots.length === 0) return 0;

  const middle = Math.floor(spots.length / 2);
  return spots.length % 2 === 0
    ? (spots[middle - 1] + spots[middle]) / 2
    : spots[middle];
};
