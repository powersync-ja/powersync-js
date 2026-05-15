import { AbstractPowerSyncDatabase, WatchedQuery } from '@powersync/common';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';
import { useNullableWatchedQuerySubscription } from '../src/hooks/watched/useWatchedQuerySubscription';
import { openPowerSync } from './utils';

describe('useNullableWatchedQuerySubscription reactivity (Bug 3)', () => {
  let powersync: AbstractPowerSyncDatabase;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    powersync = openPowerSync();
  });

  /**
   * Reproduces the documented root cause: `WatchedQuery.state` is a SINGLE
   * object mutated in-place via `Object.assign` (AbstractQueryProcessor).
   *
   * On the buggy code:
   *  - line 36 `React.useState(query?.state)` is NON-lazy and captures the live
   *    mutable ref;
   *  - line 41 `setOutputState(query.state)` passes that SAME ref again, so
   *    `Object.is` is true, React bails out of the effect-driven update, and the
   *    committed UI never reflects the change.
   *
   * Here a sibling `<Mutator />` mutates the shared state object in-place from
   * its mount effect. React flushes child/sibling effects in order, so the
   * Mutator's effect runs BEFORE `<Display />`'s mount effect. The buggy hook's
   * line 41 then sees the SAME ref it captured -> bail-out -> the rendered DOM
   * stays stale. The fix captures/sets spread snapshots, so line 41 produces a
   * NEW object reflecting the mutated state and React re-renders.
   *
   * We assert against the rendered DOM (not `result.current`, which on the
   * buggy code aliases the live mutable ref and would mask the missing
   * re-render).
   */
  it('rendered output reflects an in-place state mutation that lands before the consumer mount effect', async () => {
    await powersync.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'list1')");

    const wq: WatchedQuery<{ id: string; name: string }[]> = powersync
      .query<{ id: string; name: string }>({ sql: 'SELECT * FROM lists', parameters: [] })
      .watch();

    // Fully load BEFORE mount so the captured snapshot has exactly 1 row.
    await waitFor(
      () => {
        expect(wq.state.isLoading).toBe(false);
        expect(wq.state.data.length).toBe(1);
      },
      { timeout: 1000 }
    );

    const Mutator = () => {
      React.useEffect(() => {
        // In-place mutation of the single shared state object, mirroring core's
        // `Object.assign(this.state, ...)`. Runs before <Display />'s mount
        // effect. No onStateChange is delivered for this change.
        (wq.state as { data: { id: string; name: string }[] }).data = [
          ...wq.state.data,
          { id: 'injected', name: 'injected' }
        ];
      }, []);
      return null;
    };

    const Display = () => {
      const state = useNullableWatchedQuerySubscription(wq);
      return <div data-testid="count">{state?.data.length ?? -1}</div>;
    };

    render(
      <PowerSyncContext.Provider value={powersync}>
        <Mutator />
        <Display />
      </PowerSyncContext.Provider>
    );

    await waitFor(
      () => {
        // Must reflect the mutation (2 rows). Buggy code stays stale at 1 row
        // because the mount effect's setOutputState(query.state) is a same-ref
        // bail-out.
        expect(screen.getByTestId('count').textContent).toBe('2');
      },
      { timeout: 1000 }
    );
  });

  it('re-renders when the underlying WatchedQuery state changes via a DB write', async () => {
    await powersync.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'list1')");

    const wq: WatchedQuery<{ id: string; name: string }[]> = powersync
      .query<{ id: string; name: string }>({ sql: 'SELECT * FROM lists', parameters: [] })
      .watch();

    await waitFor(
      () => {
        expect(wq.state.isLoading).toBe(false);
        expect(wq.state.data.length).toBe(1);
      },
      { timeout: 1000 }
    );

    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={powersync}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useNullableWatchedQuerySubscription(wq), { wrapper });

    expect(result.current?.data.length).toBe(1);

    await act(async () => {
      await powersync.execute("INSERT INTO lists (id, name) VALUES (uuid(), 'list2')");
    });

    await waitFor(
      () => {
        expect(result.current?.data.length).toBe(2);
      },
      { timeout: 1000 }
    );
  });
});
