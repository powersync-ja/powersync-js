async function installCapacitorInTestFrame() {
  if (window.top == null || window.top === window) {
    return;
  }

  const root = window.top as Window & typeof globalThis;
  const current = window as Window & typeof globalThis;

  // await waitForCapacitorBridge(root);

  // Capacitor injects the native bridge into the top-level webview, but Vitest
  // runs browser tests inside an iframe. Forward the bridge globals before
  // @capacitor/core initializes in the test frame so native plugins resolve.
  (current as any).Capacitor = (root as any).Capacitor;
  (current as any).webkit = (root as any).webkit;
  (current as any).androidBridge = (root as any).androidBridge;
}

await installCapacitorInTestFrame();
