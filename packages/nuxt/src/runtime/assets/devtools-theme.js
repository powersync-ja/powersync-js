// Runs inside the diagnostics UI page when it is a Nuxt DevTools 3 tab. Nuxt DevTools assigns its
// iframe client to `window.__NUXT_DEVTOOLS__` on every same-origin tab, before or shortly after the
// page's scripts run, and fires `host:update:reactivity` when its state changes. This script reads the
// host's colour mode from it and hands it to the UI through the UI's own theme message, so the UI
// package needs to know nothing about Nuxt.
const THEME_MESSAGE_TYPE = 'powersync-diagnostics:theme';

function postTheme(client) {
  const mode = client?.host?.app?.colorMode?.value;
  if (mode !== 'dark' && mode !== 'light') return;
  window.postMessage({ type: THEME_MESSAGE_TYPE, theme: mode }, location.origin);
}

function follow(client) {
  if (!client) return;
  postTheme(client);
  client.host?.hooks?.hook('host:update:reactivity', () => postTheme(client));
}

if (window.__NUXT_DEVTOOLS__) {
  follow(window.__NUXT_DEVTOOLS__);
} else {
  // Not connected yet: catch the assignment the host makes once the iframe has loaded.
  let current;
  Object.defineProperty(window, '__NUXT_DEVTOOLS__', {
    configurable: true,
    get: () => current,
    set: (client) => {
      current = client;
      follow(client);
    }
  });
}
