import { useMemo } from 'react';
import type { OptionData } from '../services/deribit';
import { formatCompact, formatCurrency, formatNumber } from '../utils/formatters';

interface Props {
  options: OptionData[];
}

export const OptionsTable: React.FC<Props> = ({ options }) => {
  // Keep exchanges and expiries separate. Grouping only by strike would
  // overwrite contracts from another expiry/source.
  const rows = useMemo(() => {
    const contractMap = new Map<string, {
      source: OptionData['source'];
      expiry: number;
      strike: number;
      call?: OptionData;
      put?: OptionData;
    }>();

    options.forEach(opt => {
      const key = `${opt.source}:${opt.expiry}:${opt.strike}`;
      let entry = contractMap.get(key);
      if (!entry) {
        entry = {
          source: opt.source,
          expiry: opt.expiry,
          strike: opt.strike,
        };
        contractMap.set(key, entry);
      }
      if (opt.type === 'call') entry.call = opt;
      else entry.put = opt;
    });

    return Array.from(contractMap.values()).sort((a, b) =>
      a.expiry - b.expiry || a.strike - b.strike || a.source.localeCompare(b.source),
    );
  }, [options]);

  const formatExpiry = (expiry: number) => new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(expiry);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Options Chain</h2>
      </div>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th colSpan={4} className="text-center" style={{ borderRight: '1px solid var(--border-color)', color: 'var(--accent-call)' }}>Calls</th>
              <th className="text-center" style={{ borderRight: '1px solid var(--border-color)' }}>Expiry</th>
              <th className="text-center" style={{ borderRight: '1px solid var(--border-color)' }}>Strike</th>
              <th colSpan={4} className="text-center" style={{ color: 'var(--accent-put)' }}>Puts</th>
            </tr>
            <tr>
              <th>Vol</th>
              <th>OI</th>
              <th>Bid</th>
              <th style={{ borderRight: '1px solid var(--border-color)' }}>Ask</th>
              
              <th style={{ borderRight: '1px solid var(--border-color)' }}>Source / Expiry</th>
              <th className="text-center" style={{ borderRight: '1px solid var(--border-color)' }}>Price</th>
              
              <th>Bid</th>
              <th>Ask</th>
              <th>OI</th>
              <th>Vol</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={`${row.source}:${row.expiry}:${row.strike}`}>
                {/* Calls */}
                <td className="text-muted">{row.call ? formatCompact(row.call.volume) : '-'}</td>
                <td>{row.call ? formatCompact(row.call.open_interest) : '-'}</td>
                <td className="text-call">{row.call ? formatNumber(row.call.bid, 3) : '-'}</td>
                <td className="text-call" style={{ borderRight: '1px solid var(--border-color)' }}>{row.call ? formatNumber(row.call.ask, 3) : '-'}</td>
                
                {/* Contract identity */}
                <td className="text-center text-muted" style={{ borderRight: '1px solid var(--border-color)' }}>
                  <div>{row.source}</div>
                  <div>{formatExpiry(row.expiry)}</div>
                </td>
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
