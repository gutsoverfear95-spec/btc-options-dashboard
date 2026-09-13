import { useMemo } from 'react';
import type { OptionData } from '../services/deribit';
import { formatCompact, formatCurrency } from '../utils/formatters';

interface Props {
  options: OptionData[];
}

export const MarketSummary: React.FC<Props> = ({ options }) => {
  const stats = useMemo(() => {
    if (options.length === 0) return null;

    let totalCallOI = 0;
    let totalPutOI = 0;
    let totalCallVol = 0;
    let totalPutVol = 0;
    
    options.forEach(opt => {
      if (opt.type === 'call') {
        totalCallOI += opt.open_interest;
        totalCallVol += opt.volume;
      } else {
        totalPutOI += opt.open_interest;
        totalPutVol += opt.volume;
      }
    });

    const spot = options[0]?.underlying_price || 0;
    const pcr = totalPutOI / totalCallOI;

    return {
      spot,
      totalCallOI,
      totalPutOI,
      totalCallVol,
      totalPutVol,
      pcr,
      totalVol: totalCallVol + totalPutVol,
      totalOI: totalCallOI + totalPutOI
    };
  }, [options]);

  if (!stats) return null;

  return (
    <div className="grid-summary">
      <div className="panel stat-box">
        <span className="stat-label">BTC Spot Price</span>
        <span className="stat-value text-blue">{formatCurrency(stats.spot)}</span>
      </div>
      
      <div className="panel stat-box">
        <span className="stat-label">Put/Call Ratio (OI)</span>
        <span className={`stat-value ${stats.pcr > 1 ? 'text-put' : 'text-call'}`}>
          {stats.pcr.toFixed(2)}
        </span>
      </div>

      <div className="panel stat-box">
        <span className="stat-label">Total Open Interest (BTC)</span>
        <div className="flex justify-between items-center mt-2">
          <div className="flex-col">
            <span className="text-xs text-muted">Calls</span>
            <span className="text-sm font-semibold text-call">{formatCompact(stats.totalCallOI)}</span>
          </div>
          <div className="flex-col" style={{ textAlign: 'right' }}>
            <span className="text-xs text-muted">Puts</span>
            <span className="text-sm font-semibold text-put">{formatCompact(stats.totalPutOI)}</span>
          </div>
        </div>
      </div>

      <div className="panel stat-box">
        <span className="stat-label">24h Volume (BTC)</span>
        <div className="flex justify-between items-center mt-2">
          <div className="flex-col">
            <span className="text-xs text-muted">Calls</span>
            <span className="text-sm font-semibold text-call">{formatCompact(stats.totalCallVol)}</span>
          </div>
          <div className="flex-col" style={{ textAlign: 'right' }}>
            <span className="text-xs text-muted">Puts</span>
            <span className="text-sm font-semibold text-put">{formatCompact(stats.totalPutVol)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
