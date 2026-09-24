export const ASSETS = ['NASDAQ', 'SP500', 'XAUUSD', 'WTI'] as const;
export type Asset = typeof ASSETS[number];
export type Direction = 'Bullish' | 'Bearish' | 'Mixed' | 'Unclear';
export interface AssetSignal { asset: Asset; direction: Direction; reason: string }

const names: Record<Asset, string> = {
  NASDAQ: 'nasdaq(?:[- ](?:100|composite))?',
  SP500: 's&p\\s*500|s and p\\s*500|sp500',
  XAUUSD: 'gold(?: prices?| futures?)?|xauusd',
  WTI: 'wti(?: crude)?(?: prices?| futures?)?|(?:crude )?oil(?: prices?| futures?)?',
};
const up = '(?:settles?|settled|edges?|edged|closes?|closed)\\s+higher|rises?|rose|rising|rall(?:y|ies|ied)|surges?|surged|gains?|gained|jumps?|jumped|climbs?|climbed|advances?|advanced';
const down = '(?:settles?|settled|edges?|edged|closes?|closed)\\s+lower|falls?|fell|falling|drops?|dropped|slides?|slid|sinks?|sank|declines?|declined|plunges?|plunged|tumbles?|tumbled|slips?|slipped';

// Only explicit asset price statements: never transfer another asset's direction
// or infer market reactions from an economic release's name alone.
export function assessAssets(title: string): AssetSignal[] {
  return ASSETS.map(asset => {
    const directions = new Set<Direction>();
    const clauses = title.toLowerCase().split(/[;.!?]|\b(?:but|while|whereas|as|after|despite|amid)\b/);
    for (const clause of clauses) {
      // Forecasts, negation and comparisons are ambiguous without fuller context.
      if (/\b(?:not|no|never|fails?|failed|may|might|could|would|will|expected|expectations|forecast|forecasts|less|more|if|unless)\b/.test(clause)) continue;
      const prefix = `\\b(?:${names[asset]})(?:,?\\s+(?:and\\s+)?silver)?\\s+(?:(?:is|are|was|were)\\s+)?`;
      if (new RegExp(`${prefix}(?:${up})\\b`, 'i').test(clause)) directions.add('Bullish');
      if (new RegExp(`${prefix}(?:${down})\\b`, 'i').test(clause)) directions.add('Bearish');
    }
    const direction: Direction = directions.size > 1 ? 'Mixed' : directions.values().next().value ?? 'Unclear';
    return {
      asset, direction,
      reason: direction === 'Unclear'
        ? 'No unambiguous price direction for this asset in the headline. This does not mean neutral.'
        : direction === 'Mixed'
          ? 'The headline describes both upward and downward moves for this asset.'
          : `The headline explicitly describes ${direction === 'Bullish' ? 'an upward' : 'a downward'} move in this asset. This is not a forecast.`,
    };
  });
}
