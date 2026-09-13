import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import type { OptionData } from '../services/deribit';
import { formatCompact, formatCurrency } from '../utils/formatters';

interface Props {
  options: OptionData[];
}

export const GexChart: React.FC<Props> = ({ options }) => {
  const chartData = useMemo(() => {
    // Group GEX by strike price
    const strikeMap = new Map<number, { strike: number; callGex: number; putGex: number }>();

    options.forEach(opt => {
      // Only care about strikes near the money to avoid charting outliers
      const spot = opt.underlying_price;
      if (Math.abs(opt.strike - spot) / spot > 0.3) return; // +/- 30% range

      let entry = strikeMap.get(opt.strike);
      if (!entry) {
        entry = { strike: opt.strike, callGex: 0, putGex: 0 };
        strikeMap.set(opt.strike, entry);
      }

      if (opt.type === 'call') {
        entry.callGex += opt.gex;
      } else {
        entry.putGex += opt.gex;
      }
    });

    return Array.from(strikeMap.values())
      .sort((a, b) => a.strike - b.strike)
      .map(d => ({
        ...d,
        netGex: d.callGex + d.putGex
      }));
  }, [options]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <div className="custom-tooltip-label">Strike: {formatCurrency(label, 0)}</div>
          <div className="custom-tooltip-item">
            <span className="text-call">Call GEX:</span>
            <span>{formatCompact(data.callGex)}</span>
          </div>
          <div className="custom-tooltip-item">
            <span className="text-put">Put GEX:</span>
            <span>{formatCompact(data.putGex)}</span>
          </div>
          <div className="custom-tooltip-item" style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
            <span className="text-secondary">Net GEX:</span>
            <span className={data.netGex > 0 ? 'text-call' : 'text-put'}>
              {formatCompact(data.netGex)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const spotPrice = options.length > 0 ? options[0].underlying_price : 0;

  return (
    <div style={{ height: 400, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="strike" 
              tickFormatter={(val) => formatCompact(val)}
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            />
            <YAxis 
              tickFormatter={(val) => formatCompact(val)}
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <ReferenceLine x={spotPrice} stroke="var(--accent-blue)" strokeDasharray="3 3" label={{ position: 'top', value: 'SPOT', fill: 'var(--accent-blue)', fontSize: 12 }} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
            <Bar dataKey="netGex" radius={[4, 4, 4, 4]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.netGex > 0 ? 'var(--accent-call)' : 'var(--accent-put)'} 
                  style={{
                    filter: `drop-shadow(0 0 4px ${entry.netGex > 0 ? 'rgba(0,230,118,0.4)' : 'rgba(255,23,68,0.4)'})`
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
    </div>
  );
};
