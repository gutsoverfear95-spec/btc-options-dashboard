export interface TwitterWidgets {
  widgets: {
    createTimeline(
      source: { sourceType: 'profile'; screenName: string },
      target: HTMLElement,
      options: { theme: string; height: number; chrome: string; dnt: boolean },
    ): Promise<HTMLElement | undefined>;
  };
}

declare global {
  interface Window {
    twttr?: TwitterWidgets;
  }
}

let pending: Promise<TwitterWidgets> | undefined;

// Share one script request across mounts (including React StrictMode).
// Failed requests are discarded so Retry can actually download the script again.
export function loadTwitterWidgets(): Promise<TwitterWidgets> {
  if (window.twttr?.widgets?.createTimeline) return Promise.resolve(window.twttr);
  if (pending) return pending;

  pending = new Promise<TwitterWidgets>((resolve, reject) => {
    document.getElementById('twitter-wjs')?.remove();
    const script = document.createElement('script');
    script.id = 'twitter-wjs';
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    const finish = (error?: Error) => {
      window.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) {
        script.remove();
        reject(error);
      } else {
        resolve(window.twttr!);
      }
    };
    const timer = window.setTimeout(() => finish(new Error('X script timed out')), 10000);
    script.onload = () => finish(window.twttr?.widgets?.createTimeline
      ? undefined : new Error('X widgets are unavailable'));
    script.onerror = () => finish(new Error('X script could not be loaded'));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}
