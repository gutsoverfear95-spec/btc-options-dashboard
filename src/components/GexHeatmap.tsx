import { useMemo } from 'react';
import type { OptionData } from '../services/deribit';
import { getReferenceSpot } from '../services/optionsMath';
import { formatCurrency } from '../utils/formatters';

interface Props {
  options: OptionData[];
}

export const GexHeatmap = ({ options }: Props) => {
  const heatmapData = useMemo(() => {
    if (options.length === 0) return { strikes: [], expirations: [], matrix: new Map() };

    const spot = getReferenceSpot(options);
    if (spot <= 0) return { strikes: [], expirations: [], matrix: new Map(), maxAbsGex: 0 };
    // Filter strikes within 20% of spot
    const validOptions = options.filter(o => Math.abs(o.strike - spot) / spot < 0.2);

    // Get unique sorted expirations
    const expSet = new Set<number>();
    const strikeSet = new Set<number>();
    
    validOptions.forEach(o => {
      expSet.add(o.expiry);
      strikeSet.add(o.strike);
    });

    const expirations = Array.from(expSet).sort((a, b) => a - b);
    // Strikes sorted descending so highest strike is at the top of the grid
    const strikes = Array.from(strikeSet).sort((a, b) => b - a);

    // Map: "strike_expiry" -> netGex
    const matrix = new Map<string, number>();
    
    validOptions.forEach(o => {
      const key = `${o.strike}_${o.expiry}`;
      const current = matrix.get(key) || 0;
      matrix.set(key, current + o.gex);
    });

    // Find max absolute GEX for color scaling
    let maxAbsGex = 0;
    matrix.forEach(val => {
      if (Math.abs(val) > maxAbsGex) maxAbsGex = Math.abs(val);
    });

    return { strikes, expirations, matrix, maxAbsGex };
  }, [options]);

  const { strikes, expirations, matrix, maxAbsGex } = heatmapData;

  if (strikes.length === 0) return null;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getDate()}/${d.getMonth()+1}`;
  };

  const getCellColor = (netGex: number) => {
    if (netGex === 0 || !netGex) return 'rgba(255, 255, 255, 0.02)';
    const intensity = Math.min(Math.abs(netGex) / (maxAbsGex || 1), 1);
    
    // Base colors: Call = 0, 230, 118 | Put = 255, 23, 68
    if (netGex > 0) {
      return `rgba(0, 230, 118, ${intensity * 0.8 + 0.2})`;
    } else {
      return `rgba(255, 23, 68, ${intensity * 0.8 + 0.2})`;
    }
  };

  return (
    <div className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header" style={{ marginBottom: 8 }}>
        <h2 className="panel-title">GEX Heatmap (Strike vs Expiration)</h2>
      </div>
      
      <div className="heatmap-container">
        <div 
          className="heatmap-grid" 
          style={{ gridTemplateColumns: `80px repeat(${expirations.length}, minmax(40px, 1fr))` }}
        >
          {/* Top Header Row */}
          <div className="heatmap-header">Strike</div>
          {expirations.map(exp => (
            <div key={exp} className="heatmap-header">{formatDate(exp)}</div>
          ))}

          {/* Matrix Rows */}
          {strikes.map(strike => (
            <div style={{ display: 'contents' }} key={strike}>
              <div className="heatmap-row-label">{formatCurrency(strike, 0)}</div>
              {expirations.map(exp => {
                const key = `${strike}_${exp}`;
                const netGex = matrix.get(key) || 0;
                return (
                  <div 
                    key={key} 
                    className="heatmap-cell"
                    style={{ backgroundColor: getCellColor(netGex) }}
                    title={`Strike: ${strike} | Exp: ${formatDate(exp)}\nNet GEX: ${formatCurrency(netGex)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
