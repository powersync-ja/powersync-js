import '@azure/core-asynciterator-polyfill';
import { createBaseLogger, LogLevels, PowerSyncContext, PowerSyncDatabase } from '@powersync/react-native';
import { ReactNode, useEffect, useMemo } from 'react';

import { useAuth } from './AuthProvider';
import { Connector } from '../lib/connector';
import { schema } from '../lib/schema';

const defaultLogger = createBaseLogger();
defaultLogger.useDefaults();
defaultLogger.setLevel(LogLevels.DEBUG);

const connector = new Connector();

export const PowerSyncProvider = ({ children }: { children: ReactNode }) => {
  const { isSyncEnabled } = useAuth();

  const powerSync = useMemo(() => {
    const powerSync = new PowerSyncDatabase({
      schema,
      database: { dbFilename: 'test.sqlite' }
      //location: 'optional location directory to DB file'
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
