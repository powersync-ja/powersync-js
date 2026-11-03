import { computed, ref, shallowRef, toValue, type MaybeRefOrGetter } from 'vue';

export type DiagnosticsTheme = 'light' | 'dark';

/**
 * Light/dark theme for the diagnostics UI. The panel applies `.dark` to its own root from this state.
 *
 * Two modes:
 * - Self-owned (default): starts from the OS preference, the viewer can toggle it, and the choice is
 *   persisted in localStorage.
 * - Host-controlled: an embedder that owns the theme (Flutter DevTools, a DevTools dock) hands it in
 *   through `provideDiagnostics(integration, { theme })`. The panel follows it, hides its toggle, and
 *   never touches storage.
 */
const STORAGE_KEY = 'powersync-diagnostics-theme';

function initialIsDark(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
  } catch {
    // localStorage may be unavailable (private mode, sandboxed frame).
  }
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  } catch {
    return true;
  }
}

// Module-level singletons so every component (and the host harness) shares one reactive value.
const ownIsDark = ref(initialIsDark());
// The host's theme, normalised to a getter so a ref, a getter or a plain value all read the same way.
// The getter may yield nothing while the host has not decided yet; the panel then acts as self-owned.
const hostTheme = shallowRef<(() => DiagnosticsTheme | null | undefined) | null>(null);

function persist(dark: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {
    // best-effort
  }
}

/** Hands theme ownership to the host, or gives it back with `null`. Called by `provideDiagnostics`. */
export function setHostTheme(theme: MaybeRefOrGetter<DiagnosticsTheme | null | undefined> | null): void {
  hostTheme.value = theme === null ? null : () => toValue(theme);
}

/** The host's current theme, or `null` when no host owns it (yet). */
const hostValue = computed(() => hostTheme.value?.() ?? null);

const isDark = computed(() => (hostValue.value === null ? ownIsDark.value : hostValue.value === 'dark'));

/** True while an embedder supplies the theme; the panel then shows no toggle. */
const hostControlled = computed(() => hostValue.value !== null);

export function useTheme() {
  return {
    isDark,
    hostControlled,
    /** Flips the theme. Ignored while the host controls it. */
    toggle() {
      if (hostControlled.value) return;
      ownIsDark.value = !ownIsDark.value;
      persist(ownIsDark.value);
    },
    /** Sets the self-owned theme explicitly. Ignored while the host controls it. */
    setTheme(dark: boolean) {
      if (hostControlled.value) return;
      ownIsDark.value = dark;
      persist(dark);
    }
  };
}
