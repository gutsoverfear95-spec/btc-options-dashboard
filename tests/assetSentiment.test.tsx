// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { assessAssets } from '../src/services/assetSentiment';
import { AssetSentiment } from '../src/components/AssetSentiment';
afterEach(cleanup);
it('assigns opposing directions only to the named assets', () => {
  expect(assessAssets('Gold rises while oil falls').map(s => s.direction)).toEqual(['Unclear', 'Unclear', 'Bullish', 'Bearish']);
});
it.each(['Stocks fail to rally', 'Oil supply update', 'Gold may rise', 'Inflation falls less than expected', 'Gold does not rise', 'Fed rate decision'])('does not guess from ambiguous text: %s', title => {
  expect(assessAssets(title).every(s => s.direction === 'Unclear')).toBe(true);
});
it('supports index names and mixed moves', () => {
  expect(assessAssets('Nasdaq rises; S&P 500 falls').slice(0, 2).map(s => s.direction)).toEqual(['Bullish', 'Bearish']);
  expect(assessAssets('Gold rises; gold falls')[2].direction).toBe('Mixed');
});
it('switches the tag and explanation without navigating away', () => {
  render(<AssetSentiment title="Gold rises while oil falls" />);
  const select = screen.getByRole('combobox', {name: 'Asset sentiment'}) as HTMLSelectElement;
  expect(select.value).toBe('XAUUSD');
  fireEvent.change(select, {target: {value: 'WTI'}});
  expect(select.selectedOptions[0].textContent).toBe('WTI Bearish');
  expect(screen.getByText(/a downward/)).toBeTruthy();
});
