import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as SUT from '../src/hooks/PowerSyncContext';

describe('PowerSyncContext', () => {
  describe('usePowerSync', () => {
    it('should retrieve the PowerSync DB from the context and display the test text', async () => {
      const TestComponent = () => {
        const powerSyncDb = SUT.usePowerSync() as any;
        return <div>{powerSyncDb.testText}</div>;
      };

      const { findByText } = render(
        <SUT.PowerSyncContext.Provider value={{ testText: 'Test Text' } as any}>
          <TestComponent />
        </SUT.PowerSyncContext.Provider>
      );
      const hello = await findByText('Test Text');

      expect(hello).toBeDefined;
    });

    it('should throw without a database', () => {
      expect(() => renderHook(() => SUT.usePowerSync())).toThrow('PowerSync not configured.');
    });
  });

  describe('usePowerSyncOrNull', () => {
    it('should return null without a database', () => {
      const { result } = renderHook(() => SUT.usePowerSyncOrNull());
      expect(result.current).toBeNull();
    });

    it('should return the database from context', () => {
      const db = {} as any;
      const { result } = renderHook(() => SUT.usePowerSyncOrNull(), {
        wrapper: ({ children }) => <SUT.PowerSyncContext.Provider value={db}>{children}</SUT.PowerSyncContext.Provider>
      });
      expect(result.current).toBe(db);
    });
  });
});
