import React from 'react';
import { render } from '@testing-library/react';
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
  });
});
