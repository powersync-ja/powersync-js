import { describe, expect, it } from 'vitest';
import { querySignature } from '../../../src/client/plugins/signature.js';

describe('querySignature', () => {
  it('separates sql from parameters unambiguously', () => {
    expect(querySignature({ sql: 'SELECT ?', parameters: ['x'] })).not.toBe(
      querySignature({ sql: 'SELECT ?', parameters: ['y'] })
    );
  });
  it('is stable for equal inputs', () => {
    expect(querySignature({ sql: 'S', parameters: [1, null] })).toBe(querySignature({ sql: 'S', parameters: [1, null] }));
  });
  it('treats missing parameters as empty', () => {
    expect(querySignature({ sql: 'S', parameters: undefined as any })).toBe(querySignature({ sql: 'S', parameters: [] }));
  });
  it('survives unserializable parameters', () => {
    expect(() => querySignature({ sql: 'S', parameters: [9n as any] })).not.toThrow();
  });
  it('never lets two unserializable parameter sets share a signature', () => {
    const cyclic: any[] = [];
    cyclic.push(cyclic);
    const first = querySignature({ sql: 'S', parameters: cyclic });
    const second = querySignature({ sql: 'S', parameters: [9n as any] });
    // Both fall back, and both fall back to distinct tokens — a cache keyed on the
    // signature must never serve one query's rows for another's parameters.
    expect(first).not.toBe(second);
    // Not even the same parameters twice: unserializable params always miss.
    expect(querySignature({ sql: 'S', parameters: cyclic })).not.toBe(first);
  });
});
