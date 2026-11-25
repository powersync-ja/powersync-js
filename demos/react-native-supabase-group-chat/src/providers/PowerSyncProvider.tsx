import '@azure/core-asynciterator-polyfill';
import { createConsoleLogger, LogLevels, PowerSyncContext, PowerSyncDatabase } from '@powersync/react-native';
import { ReactNode, useEffect, useMemo } from 'react';

import { useAuth } from './AuthProvider';
import { config } from '@/library/config';
import { Connector } from '@/library/connector';
import { AppSchema } from '@/library/schema';

const logger = createConsoleLogger({ minLevel: LogLevels.debug });

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
        .connect({
          powerSyncEndpoint: config.powerSyncUrl,
          authenticator: connector,
          upload: connector.upload
        })
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
