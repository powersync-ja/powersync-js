import { ref } from 'vue';

/**
 * Shared, persisted light/dark theme for the diagnostics UI.
 *
 * The panel applies `.dark` to its own root from this state, so it owns its theme rather than
 * inheriting a host-forced class. Defaults to the host/OS preference and can be overridden per
 * viewer (persisted in localStorage). A host that follows its own theme (Nuxt DevTools, the Chrome
 * panel) can push it in via `setTheme(...)`.
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

// Module-level singleton so every component (and the host harness) shares one reactive value.
const isDark = ref(initialIsDark());

function persist(dark: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {
    // best-effort
  }
}

export function useTheme() {
  return {
    isDark,
    toggle() {
      isDark.value = !isDark.value;
      persist(isDark.value);
    },
    /** Set the theme explicitly, e.g. a host mirroring its own color mode. */
    setTheme(dark: boolean) {
      isDark.value = dark;
      persist(dark);
    }
  };
}
