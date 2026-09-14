import { describe, expect, it } from 'vitest';
// This package's vitest config runs tests inside a real browser (playwright), where
// `node:fs` is externalized and unavailable. Use Vite's `?raw` import to read source
// text instead, preserving the same source-pattern assertions from the brief.
// @ts-expect-error Vite raw import - typed as a string at build time.
import useWatchedQuerySource from '../src/hooks/watched/useWatchedQuery.ts?raw';
// @ts-expect-error Vite raw import - typed as a string at build time.
import queryStoreSource from '../src/QueryStore.ts?raw';

describe('plugin fields wiring', () => {
  it('useWatchedQuery surfaces provenance and threads extensions', () => {
    const source: string = useWatchedQuerySource;
    expect(source).toContain("source: result?.source ?? 'placeholder'");
    expect(source).toContain('sourceMeta: result?.sourceMeta ?? null');
    expect(source).toContain('extensions: hookOptions.extensions');
  });
  it('QueryStore threads extensions', () => {
    const source: string = queryStoreSource;
    expect(source).toContain('extensions: options.extensions');
  });
});
