import { AppSchema } from '@/library/powersync/AppSchema';
import { SupabaseConnector } from '@/library/powersync/SupabaseConnector';
import { PowerSyncContext } from '@powersync/react';
import { createBaseLogger, LogLevels, PowerSyncDatabase } from '@powersync/web';
import { CircularProgress } from '@mui/material';
import React, { Suspense } from 'react';

const SupabaseContext = React.createContext<SupabaseConnector | null>(null);
export const useSupabase = () => React.useContext(SupabaseContext);

const defaultLogger = createBaseLogger();
defaultLogger.useDefaults();
defaultLogger.setLevel(LogLevels.DEBUG);

export const powerSync = new PowerSyncDatabase({
  database: { dbFilename: 'powersync2.db' },
  schema: AppSchema
});
export const connector = new SupabaseConnector();
powerSync.connect(connector);

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<CircularProgress />}>
      <PowerSyncContext.Provider value={powerSync}>
        <SupabaseContext.Provider value={connector}>{children}</SupabaseContext.Provider>
      </PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;
