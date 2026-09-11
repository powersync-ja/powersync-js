import { CompiledQuery, WatchCompatibleQuery } from '@powersync/common';
import { cleanup, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdditionalOptions } from '../src/hooks/watched/watch-types';
import { checkQueryChanged } from '../src/hooks/watched/watch-utils';

describe('checkQueryChanged', () => {
  beforeEach(() => {
    cleanup();
  });

  /**
   * A query which compiles to whatever `compile` currently returns, or throws if it is set to
   * a function which throws.
   */
  const createQuery = (compile: () => CompiledQuery): WatchCompatibleQuery<any> & { compile: () => CompiledQuery } => ({
    compile,
    execute: async () => []
  });

  const options: AdditionalOptions = {};

  it('should not report a change for the initial render', () => {
    const query = createQuery(() => ({ sql: 'SELECT 1', parameters: [] }));
    const { result } = renderHook(() => checkQueryChanged(query, options));
    expect(result.current).toEqual(false);
  });

  it('should not report a change while the compiled query stays the same', () => {
    const query = createQuery(() => ({ sql: 'SELECT ?', parameters: ['a'] }));
    const { result, rerender } = renderHook(() => checkQueryChanged(query, options));
    expect(result.current).toEqual(false);

    rerender();
    expect(result.current).toEqual(false);

    rerender();
    expect(result.current).toEqual(false);
  });

  it('should report a change when the SQL statement changes', () => {
    let sql = 'SELECT 1';
    const query = createQuery(() => ({ sql, parameters: [] }));
    const { result, rerender } = renderHook(() => checkQueryChanged(query, options));
    expect(result.current).toEqual(false);

    sql = 'SELECT 2';
    rerender();
    expect(result.current).toEqual(true);

    // The statement is unchanged again
    rerender();
    expect(result.current).toEqual(false);
  });

  it('should report a change when the parameters change', () => {
    let parameters: any[] = ['a'];
    const query = createQuery(() => ({ sql: 'SELECT ?', parameters }));
    const { result, rerender } = renderHook(() => checkQueryChanged(query, options));
    expect(result.current).toEqual(false);

    parameters = ['b'];
    rerender();
    expect(result.current).toEqual(true);

    rerender();
    expect(result.current).toEqual(false);
  });

  it('should report a change when the options change', () => {
    const query = createQuery(() => ({ sql: 'SELECT 1', parameters: [] }));
    let currentOptions: AdditionalOptions = { throttleMs: 10 };
    const { result, rerender } = renderHook(() => checkQueryChanged(query, currentOptions));
    expect(result.current).toEqual(false);

    currentOptions = { throttleMs: 20 };
    rerender();
    expect(result.current).toEqual(true);

    rerender();
    expect(result.current).toEqual(false);
  });

  it('should not report a change while the query cannot be compiled', () => {
    const query = createQuery(() => {
      throw new Error('could not compile');
    });
    const { result, rerender } = renderHook(() => checkQueryChanged(query, options));
    expect(result.current).toEqual(false);

    expect(() => rerender()).not.toThrow();
    expect(result.current).toEqual(false);
  });

  it('should report a change once the query compiles after a failed compilation', () => {
    let compilationFails = true;
    const query = createQuery(() => {
      if (compilationFails) {
        throw new Error('could not compile');
      }
      return { sql: 'SELECT 1', parameters: [] };
    });

    const { result, rerender } = renderHook(() => checkQueryChanged(query, options));
    expect(result.current).toEqual(false);

    // The hook order must be stable, even though the first render bailed out early.
    compilationFails = false;
    expect(() => rerender()).not.toThrow();
    // The consumers of this hook still hold the query which could not be compiled, they need to
    // be notified that a usable query is available now.
    expect(result.current).toEqual(true);

    rerender();
    expect(result.current).toEqual(false);
  });

  it('should not throw when a previously compiling query starts failing', () => {
    let compilationFails = false;
    const query = createQuery(() => {
      if (compilationFails) {
        throw new Error('could not compile');
      }
      return { sql: 'SELECT 1', parameters: [] };
    });

    const { result, rerender } = renderHook(() => checkQueryChanged(query, options));
    expect(result.current).toEqual(false);

    compilationFails = true;
    expect(() => rerender()).not.toThrow();
    expect(result.current).toEqual(false);
  });
});
