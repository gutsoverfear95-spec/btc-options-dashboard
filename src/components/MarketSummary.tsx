import { useMemo } from 'react';
import type { OptionData } from '../services/deribit';
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
    let maxCallGex = 0;
    let callWallStrike = 0;
    let maxPutGex = 0; // most negative
    let putWallStrike = 0;
    
    // Group GEX by strike to find walls and flip gamma accurately
    const strikeMap = new Map<number, number>();
    
    const spot = options[0]?.underlying_price || 0;

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
    
    // Find Zero Gamma (Flip Gamma) - Simplified: closest strike to spot where Net GEX is near 0 or flips sign relative to cumulative
    // A robust simple method for dashboards is just finding the strike where Cumulative GEX crosses 0.
    const sortedStrikes = Array.from(strikeMap.entries()).sort((a, b) => a[0] - b[0]);
    let cumulativeGex = 0;
    let zeroGammaStrike = spot; // fallback
    let foundFlip = false;
    
    for (let i = 0; i < sortedStrikes.length; i++) {
      const [strike, net] = sortedStrikes[i];
      const prevCumulative = cumulativeGex;
      cumulativeGex += net;
      
      // If we crossed 0
      if ((prevCumulative < 0 && cumulativeGex >= 0) || (prevCumulative > 0 && cumulativeGex <= 0)) {
        // If it's the first time crossing or it's closer to spot than a previous crossing
        if (!foundFlip || Math.abs(strike - spot) < Math.abs(zeroGammaStrike - spot)) {
          zeroGammaStrike = strike;
          foundFlip = true;
        }
      }
    }

    return {
      spot,
      netGex,
      totalCallGex,
      totalPutGex,
      absoluteGex,
      callWallStrike,
      putWallStrike,
      zeroGammaStrike: foundFlip ? zeroGammaStrike : 0
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
