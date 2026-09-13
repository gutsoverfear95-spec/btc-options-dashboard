import { useMemo } from 'react';
import type { OptionData } from '../services/deribit';
import { getReferenceSpot } from '../services/optionsMath';
import { formatCompact, formatCurrency } from '../utils/formatters';

interface Props {
  options: OptionData[];
}

export const MarketSummary = ({ options }: Props) => {
  const stats = useMemo(() => {
    if (options.length === 0) return null;

    let totalCallGex = 0;
    let totalPutGex = 0;
    
    // For Walls
    let maxCallGex = Number.NEGATIVE_INFINITY;
    let callWallStrike = 0;
    let maxPutGex = Number.POSITIVE_INFINITY; // most negative
    let putWallStrike = 0;
    
    // Group GEX by strike to find walls and flip gamma accurately
    const strikeMap = new Map<number, number>();
    
    const spot = getReferenceSpot(options);

    options.forEach(opt => {
      if (opt.type === 'call') {
        totalCallGex += opt.gex;
        if (opt.gex > maxCallGex) {
          maxCallGex = opt.gex;
          callWallStrike = opt.strike;
        }
      } else {
        totalPutGex += opt.gex;
        if (opt.gex < maxPutGex) {
          maxPutGex = opt.gex;
          putWallStrike = opt.strike;
        }
      }
      
      const currentNet = strikeMap.get(opt.strike) || 0;
      strikeMap.set(opt.strike, currentNet + opt.gex);
    });

    const netGex = totalCallGex + totalPutGex;
    const absoluteGex = totalCallGex + Math.abs(totalPutGex);
    
    // Find a zero crossing in the net GEX profile. This is a better approximation
    // than using cumulative GEX, which changes the meaning of the metric.
    const sortedStrikes = Array.from(strikeMap.entries()).sort((a, b) => a[0] - b[0]);
    const zeroCrossings: number[] = [];

    for (let i = 1; i < sortedStrikes.length; i++) {
      const [previousStrike, previousNet] = sortedStrikes[i - 1];
      const [strike, net] = sortedStrikes[i];
      if (previousNet === 0) zeroCrossings.push(previousStrike);
      if (previousNet * net < 0) {
        const interpolation = previousNet / (previousNet - net);
        zeroCrossings.push(previousStrike + (strike - previousStrike) * interpolation);
      }
    }
    if (sortedStrikes.at(-1)?.[1] === 0) zeroCrossings.push(sortedStrikes.at(-1)![0]);

    const zeroGammaStrike = zeroCrossings.length > 0
      ? zeroCrossings.sort((a, b) => Math.abs(a - spot) - Math.abs(b - spot))[0]
      : 0;

    return {
      spot,
      netGex,
      totalCallGex,
      totalPutGex,
      absoluteGex,
      callWallStrike,
      putWallStrike,
      zeroGammaStrike
    };
  }, [options]);

  if (!stats) return null;

  return (
    <div className="grid-summary" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
      
      <div className="indicator-box indicator-neutral">
        <span className="indicator-label">Spot Price</span>
        <span className="indicator-value text-blue">{formatCurrency(stats.spot)}</span>
      </div>

      <div className="indicator-box indicator-warning">
        <span className="indicator-label">Zero Gamma</span>
        <span className="indicator-value text-warning">
          {stats.zeroGammaStrike ? formatCurrency(stats.zeroGammaStrike, 0) : 'N/A'}
        </span>
      </div>

      <div className="indicator-box indicator-call">
        <span className="indicator-label">Call Wall</span>
        <span className="indicator-value text-call">{formatCurrency(stats.callWallStrike, 0)}</span>
      </div>

      <div className="indicator-box indicator-put">
        <span className="indicator-label">Put Wall</span>
        <span className="indicator-value text-put">{formatCurrency(stats.putWallStrike, 0)}</span>
      </div>

      <div className="indicator-box" style={{ '--indicator-color': stats.netGex > 0 ? 'var(--accent-call)' : 'var(--accent-put)' } as any}>
        <span className="indicator-label">Net GEX</span>
        <span className="indicator-value" style={{ color: stats.netGex > 0 ? 'var(--accent-call)' : 'var(--accent-put)' }}>
          {formatCompact(stats.netGex)}
        </span>
      </div>

      <div className="indicator-box indicator-call">
        <span className="indicator-label">Total Call GEX</span>
        <span className="indicator-value text-call">{formatCompact(stats.totalCallGex)}</span>
      </div>

      <div className="indicator-box indicator-put">
        <span className="indicator-label">Total Put GEX</span>
        <span className="indicator-value text-put">{formatCompact(stats.totalPutGex)}</span>
      </div>

    </div>
  );
};
