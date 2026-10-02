import { describe, expect, it } from 'vitest';
import { serializeErrorForRelay } from '../../src/utils/error-serialization.js';

function corruptError() {
  const error = new Error('powersync_control: internal SQLite call returned CORRUPT') as Error & {
    code?: string | number;
    cause?: unknown;
  };
  error.code = 'SQLITE_CORRUPT';
  error.cause = new Error('disk I/O error');
  return error;
}

describe('serializeErrorForRelay', () => {
  it('preserves message, stack, code and the cause chain', () => {
    const serialized = serializeErrorForRelay(corruptError());

    expect(serialized.state).toBe('serialized');
    expect(serialized.name).toBe('Error');
    expect(serialized.message).toBe('powersync_control: internal SQLite call returned CORRUPT');
    expect(serialized.stack).toBeDefined();
    expect(serialized.code).toBe('SQLITE_CORRUPT');
    expect((serialized.cause as { message: string }).message).toBe('disk I/O error');
  });

  it('keeps a numeric code numeric', () => {
    const error = new Error('x') as Error & { code?: string | number };
    error.code = 11;
    expect(serializeErrorForRelay(error).code).toBe(11);
  });

  it('does not truncate long messages, stacks or string causes', () => {
    const longMessage = 'm'.repeat(5000);
    const error = new Error(longMessage) as Error & { cause?: unknown };
    error.cause = 'c'.repeat(5000);
    error.stack = `Error: ${longMessage}\n${'at frame\n'.repeat(5000)}`;

    const serialized = serializeErrorForRelay(error);
    expect(serialized.message).toBe(longMessage);
    expect(serialized.stack).toBe(error.stack);
    expect(serialized.cause).toBe(error.cause);
  });

  it('promotes an HTTP status to a top-level field', () => {
    const error = new Error('unauthorized') as Error & { status?: number };
    error.status = 401;

    const serialized = serializeErrorForRelay(error);
    expect(serialized.status).toBe(401);
  });

  it('marks a non-cloneable cause as partial without discarding the error', () => {
    const error = new Error('boom') as Error & { code?: string; cause?: unknown };
    error.code = 'HTTP_ERROR';
    error.cause = () => {};

    const serialized = serializeErrorForRelay(error);
    expect(serialized.state).toBe('partial');
    expect(serialized.message).toBe('boom');
    expect(serialized.stack).toBeDefined();
    expect(serialized.code).toBe('HTTP_ERROR');
    expect(serialized.cause).toBe('[Unserializable function]');
  });

  it('marks undefined and null rejections as missing', () => {
    for (const value of [undefined, null]) {
      const serialized = serializeErrorForRelay(value);
      expect(serialized.state).toBe('missing');
      expect(serialized.name).toBe('PowerSyncMissingRejectionReason');
    }
  });

  it('does not mark a string, number or plain-object rejection as missing', () => {
    expect(serializeErrorForRelay('boom')).toMatchObject({ state: 'serialized', name: 'String', message: 'boom' });
    expect(serializeErrorForRelay(123)).toMatchObject({ state: 'serialized', message: '123' });

    const object = serializeErrorForRelay({ code: 'SQLITE_CORRUPT' });
    expect(object).toMatchObject({ state: 'serialized', message: 'Non-Error rejection' });
    expect(object.code).toBeUndefined();
  });

  it('never stringifies a rejected plain object into the message', () => {
    const serialized = serializeErrorForRelay({ token: 'bearer-secret', requestBody: '{"password":"x"}' });

    expect(serialized.message).toBe('Non-Error rejection');
    expect(JSON.stringify(serialized)).not.toContain('bearer-secret');
    expect(JSON.stringify(serialized)).not.toContain('password');
  });

  it('preserves name, message, code and status of a structurally error-like object', () => {
    const serialized = serializeErrorForRelay({
      name: 'SQLiteError',
      message: 'database disk image is malformed',
      code: 'SQLITE_CORRUPT',
      status: 500,
      token: 'bearer-secret'
    });

    expect(serialized).toMatchObject({
      name: 'SQLiteError',
      message: 'database disk image is malformed',
      code: 'SQLITE_CORRUPT',
      status: 500
    });
    expect(JSON.stringify(serialized)).not.toContain('bearer-secret');
  });

  it('returns an already serialized error unchanged', () => {
    const serialized = serializeErrorForRelay(corruptError());
    expect(serializeErrorForRelay(serialized)).toBe(serialized);
  });

  it('bounds the cause chain and marks overflow as partial', () => {
    let error = new Error('leaf');
    for (let i = 0; i < 10; i++) error = new Error(`level ${i}`, { cause: error });

    const serialized = serializeErrorForRelay(error);
    expect(serialized.state).toBe('partial');
    let depth = 0;
    for (let c = serialized.cause; typeof c === 'object'; c = c.cause) depth++;
    expect(depth).toBeLessThanOrEqual(5);
  });

  it('stringifies primitive causes', () => {
    const error = new Error('x', { cause: null });
    expect(serializeErrorForRelay(error).cause).toBe('null');
  });

  it('does not throw on a circular property', () => {
    const error = new Error('x') as Error & { self?: unknown };
    error.self = error;
    expect(() => serializeErrorForRelay(error)).not.toThrow();
  });

  it('never throws when a property accessor throws', () => {
    const error = new Error('x');
    Object.defineProperty(error, 'code', {
      enumerable: true,
      get() {
        throw new Error('nope');
      }
    });

    const serialized = serializeErrorForRelay(error);
    expect(serialized.state).toBe('partial');
  });
});
