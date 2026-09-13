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
});
