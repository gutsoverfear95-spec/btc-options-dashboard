import React, { useMemo } from 'react';
import { OptionData } from '../services/deribit';
import { formatCompact, formatCurrency, formatNumber } from '../utils/formatters';

interface Props {
  options: OptionData[];
}

export const OptionsTable: React.FC<Props> = ({ options }) => {
  // Group by strike and pair call/put
  const rows = useMemo(() => {
    const strikeMap = new Map<number, { strike: number; call?: OptionData; put?: OptionData }>();

    options.forEach(opt => {
      let entry = strikeMap.get(opt.strike);
      if (!entry) {
        entry = { strike: opt.strike };
        strikeMap.set(opt.strike, entry);
      }
      if (opt.type === 'call') entry.call = opt;
      else entry.put = opt;
    });

    return Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike);
  }, [options]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Options Chain (0DTE)</h2>
      </div>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th colSpan={4} className="text-center" style={{ borderRight: '1px solid var(--border-color)', color: 'var(--accent-call)' }}>Calls</th>
              <th className="text-center" style={{ borderRight: '1px solid var(--border-color)' }}>Strike</th>
              <th colSpan={4} className="text-center" style={{ color: 'var(--accent-put)' }}>Puts</th>
            </tr>
            <tr>
              <th>Vol</th>
              <th>OI</th>
              <th>Bid</th>
              <th style={{ borderRight: '1px solid var(--border-color)' }}>Ask</th>
              
              <th className="text-center" style={{ borderRight: '1px solid var(--border-color)' }}>Price</th>
              
              <th>Bid</th>
              <th>Ask</th>
              <th>OI</th>
              <th>Vol</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.strike}>
                {/* Calls */}
                <td className="text-muted">{row.call ? formatCompact(row.call.volume) : '-'}</td>
                <td>{row.call ? formatCompact(row.call.open_interest) : '-'}</td>
                <td className="text-call">{row.call ? formatNumber(row.call.bid, 3) : '-'}</td>
                <td className="text-call" style={{ borderRight: '1px solid var(--border-color)' }}>{row.call ? formatNumber(row.call.ask, 3) : '-'}</td>
                
                {/* Strike */}
                <td className="text-center font-bold text-primary" style={{ borderRight: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  {formatCurrency(row.strike, 0)}
                </td>
                
                {/* Puts */}
                <td className="text-put">{row.put ? formatNumber(row.put.bid, 3) : '-'}</td>
                <td className="text-put">{row.put ? formatNumber(row.put.ask, 3) : '-'}</td>
                <td>{row.put ? formatCompact(row.put.open_interest) : '-'}</td>
                <td className="text-muted">{row.put ? formatCompact(row.put.volume) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
