import { onScopeDispose, ref, type Ref } from 'vue';
import type { DiagnosticsTheme } from '../src';

/** The message an embedder posts to this page to set the theme. */
export const THEME_MESSAGE_TYPE = 'powersync-diagnostics:theme';

function asTheme(value: unknown): DiagnosticsTheme | null {
  return value === 'dark' || value === 'light' ? value : null;
}

/**
 * The theme an embedder hands this page, or `null` while none has: the panel then manages its own.
 *
 * Two host-agnostic channels, both documented in the README:
 * - `?theme=dark|light` on the page URL, for a host that knows the theme when it opens the page.
 * - A `message` event `{ type: 'powersync-diagnostics:theme', theme: 'dark' | 'light' }`, for a host
 *   that learns it later or changes it at runtime. Any window may post it; a script the host runs
 *   inside this page posts it to `window` itself.
 */
export function useHostTheme(): Ref<DiagnosticsTheme | null> {
  const theme = ref<DiagnosticsTheme | null>(null);
  if (typeof window === 'undefined') return theme;

  theme.value = asTheme(new URLSearchParams(location.search).get('theme'));

  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: unknown; theme?: unknown } | null;
    if (data?.type !== THEME_MESSAGE_TYPE) return;
    theme.value = asTheme(data.theme);
  };
  window.addEventListener('message', onMessage);
  onScopeDispose(() => window.removeEventListener('message', onMessage));
  return theme;
}
