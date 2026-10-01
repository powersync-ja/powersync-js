import type { HighlighterCore } from 'shiki/core';

/**
 * A shared, lazily-loaded Shiki highlighter. Uses the JavaScript regex engine (no WASM) so it works
 * under the extension's CSP and offline, and only the `javascript`/`dart`/`sql`/`json` grammars +
 * two themes are bundled. Loaded on first use so it doesn't weigh on initial render.
 */
export const CODE_THEME = { dark: 'github-dark-default', light: 'github-light-default' } as const;

let highlighterPromise: Promise<HighlighterCore> | null = null;

export function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, js, dart, sql, json, dark, light] =
        await Promise.all([
          import('shiki/core'),
          import('shiki/engine/javascript'),
          import('shiki/langs/javascript.mjs'),
          import('shiki/langs/dart.mjs'),
          import('shiki/langs/sql.mjs'),
          import('shiki/langs/json.mjs'),
          import('shiki/themes/github-dark-default.mjs'),
          import('shiki/themes/github-light-default.mjs')
        ]);
      return createHighlighterCore({
        themes: [dark.default, light.default],
        langs: [js.default, dart.default, sql.default, json.default],
        engine: createJavaScriptRegexEngine()
      });
    })();
  }
  return highlighterPromise;
}
