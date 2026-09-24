// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TwitterFeed } from '../src/components/TwitterFeed';
import { loadTwitterWidgets } from '../src/services/twitter';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete window.twttr;
  document.getElementById('twitter-wjs')?.remove();
});

describe('Twitter feed lifecycle', () => {
  it('shows the feed after successful creation', async () => {
    window.twttr = { widgets: { createTimeline: vi.fn(async (_source, target) => {
      const frame = document.createElement('iframe');
      target.appendChild(frame);
      return frame;
    }) } };
    render(<TwitterFeed />);
    await act(async () => {});
    expect(screen.queryByText('Loading posts from X...')).toBeNull();
    expect(document.querySelector('iframe')).not.toBeNull();
  });

  it('times out a stalled timeline and retries successfully', async () => {
    const createTimeline = vi.fn().mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce(document.createElement('iframe'));
    window.twttr = { widgets: { createTimeline } };
    render(<TwitterFeed />);
    await act(async () => {});
    await act(async () => { vi.advanceTimersByTime(20000); });
    expect(screen.getByText('Unable to load the X feed.')).toBeTruthy();
    fireEvent.click(screen.getByText('Try again'));
    await act(async () => {});
    expect(createTimeline).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Unable to load the X feed.')).toBeNull();
  });

  it.each([undefined, 'reject'])('handles unavailable widgets (%s)', async (result) => {
    window.twttr = { widgets: { createTimeline: vi.fn(() => result === 'reject'
      ? Promise.reject(new Error('blocked')) : Promise.resolve(undefined)) } };
    render(<TwitterFeed />);
    await act(async () => {});
    expect(screen.getByText('Unable to load the X feed.')).toBeTruthy();
    expect(screen.getByText('Open on X').closest('a')?.href).toBe('https://x.com/markets');
  });

  it('ignores late completion after timeout', async () => {
    let complete!: (element: HTMLElement) => void;
    window.twttr = { widgets: { createTimeline: vi.fn(() => new Promise(resolve => { complete = resolve; })) } };
    render(<TwitterFeed />);
    await act(async () => {});
    await act(async () => { vi.advanceTimersByTime(20000); });
    await act(async () => { complete(document.createElement('iframe')); });
    expect(screen.getByText('Unable to load the X feed.')).toBeTruthy();
  });

  it('creates only one timeline under StrictMode and cleans up on unmount', async () => {
    const createTimeline = vi.fn().mockResolvedValue(document.createElement('iframe'));
    window.twttr = { widgets: { createTimeline } };
    const view = render(<StrictMode><TwitterFeed /></StrictMode>);
    await act(async () => {});
    expect(createTimeline).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Twitter script loader', () => {
  it('shares concurrent loads, recovers from script errors, and retries', async () => {
    const first = loadTwitterWidgets();
    expect(loadTwitterWidgets()).toBe(first);
    const failed = expect(first).rejects.toThrow('could not be loaded');
    document.getElementById('twitter-wjs')!.dispatchEvent(new Event('error'));
    await failed;
    expect(document.getElementById('twitter-wjs')).toBeNull();
    const retry = loadTwitterWidgets();
    window.twttr = { widgets: { createTimeline: vi.fn() } };
    document.getElementById('twitter-wjs')!.dispatchEvent(new Event('load'));
    expect(await retry).toBe(window.twttr);
  });
});
