interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
}

/**
 * The SDK label for the databases in this page. A Capacitor app runs the web SDK inside a native
 * shell; its bridge defines `window.Capacitor` before the app code runs.
 */
export function pageSdk(): string {
  const capacitor = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
  return capacitor?.isNativePlatform?.() ? '@powersync/capacitor' : '@powersync/web';
}
