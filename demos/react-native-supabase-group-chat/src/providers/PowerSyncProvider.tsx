import '@azure/core-asynciterator-polyfill';
import { createPowerSyncLogger, LogLevels, PowerSyncContext, PowerSyncDatabase } from '@powersync/react-native';
import { ReactNode, useEffect, useMemo } from 'react';

import { useAuth } from './AuthProvider';
import { Connector } from '@/library/connector';
import { AppSchema } from '@/library/schema';

const logger = createPowerSyncLogger({ minLevel: LogLevels.debug });

const connector = new Connector();

export const PowerSyncProvider = ({ children }: { children: ReactNode }) => {
  const { isSyncEnabled } = useAuth();

  const powerSync = useMemo(() => {
    const powerSync = new PowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'test.sqlite' },

      logger: logger
    });
    powerSync.init();
    return powerSync;
  }, []);

  useEffect(() => {
    if (isSyncEnabled) {
      powerSync
        .connect(connector)
        .then(() => console.log('connected'))
        .catch(console.error);
    } else {
      powerSync
        .disconnect()
        .then(() => console.log('not connected'))
        .catch(console.error);
    }
  }, [isSyncEnabled, powerSync]);

  return <PowerSyncContext.Provider value={powerSync}>{children}</PowerSyncContext.Provider>;
};
