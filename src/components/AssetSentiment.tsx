import { useId, useState } from 'react';
import { assessAssets } from '../services/assetSentiment';
import type { Asset, Direction } from '../services/assetSentiment';
import './AssetSentiment.css';

const colors: Record<Direction, string> = {
  Bullish: 'var(--accent-call, #00e676)', Bearish: 'var(--accent-put, #ff1744)',
  Mixed: '#ffb300', Unclear: 'var(--text-secondary, #a1a1aa)',
};
export const AssetSentiment = ({ title }: { title: string }) => {
  const signals = assessAssets(title);
  const [selected, setSelected] = useState<Asset>(() => signals.find(s => s.direction !== 'Unclear')?.asset ?? 'XAUUSD');
  const signal = signals.find(s => s.asset === selected)!;
  const id = useId();
  return (
    <div className="asset-sentiment" style={{ color: colors[signal.direction] }}>
      <select aria-label="Asset sentiment" aria-describedby={id} value={selected}
        onChange={event => setSelected(event.target.value as Asset)}>
        {signals.map(item => <option key={item.asset} value={item.asset}>{item.asset} {item.direction}</option>)}
      </select>
      <details className="asset-sentiment-details">
        <summary>Headline estimate</summary>
        <p id={id}>{signal.reason}</p>
      </details>
    </div>
  );
};
