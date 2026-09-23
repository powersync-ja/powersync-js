import { describe, expect, it } from 'vitest';
import { mergeExtensions } from '../../../src/client/plugins/WatchedQueryPluginRegistry.js';

describe('mergeExtensions', () => {
  it('watch-level values override query-level per plugin id', () => {
    expect(mergeExtensions({ cache: { ttlMs: 1 }, telemetry: true }, { cache: false })).toEqual({
      cache: false,
      telemetry: true
    });
  });
  it('handles either side missing', () => {
    expect(mergeExtensions(undefined, { cache: true })).toEqual({ cache: true });
    expect(mergeExtensions({ cache: true }, undefined)).toEqual({ cache: true });
    expect(mergeExtensions(undefined, undefined)).toBeUndefined();
  });
});
