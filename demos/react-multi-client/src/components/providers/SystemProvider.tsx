'use client';
import { TimedPowerSyncDatabase } from '@/library/TimedPowerSyncDatabase';
import React, { PropsWithChildren } from 'react';
import { PowerSyncContext, usePowerSync as _usePowerSync } from '@powersync/react';
import { AppSchema } from '@/definitions/Schema';
import { SupabaseConnector } from '@/library/SupabaseConnector';
import { useSupabase } from './SupabaseProvider';
import { createConsoleLogger, LogLevels } from '@powersync/web';

const logger = createConsoleLogger({ minLevel: LogLevels.debug });

export interface SystemProviderProps {
  dbFilename: string;
}

const SystemProvider: React.FC<PropsWithChildren<SystemProviderProps>> = (props) => {
  const { client } = useSupabase();

  const [powersync] = React.useState(
    new TimedPowerSyncDatabase({
      database: {
        dbFilename: props.dbFilename,
        disableSSRWarning: false
      },
      schema: AppSchema,
      logger: logger
    })
  );

  const [connector] = React.useState(new SupabaseConnector(client, powersync));

  React.useEffect(() => {
    powersync.init();

    const l = connector.registerListener({
      initialized: () => {},
      sessionStarted: async () => {
        await powersync.connect(connector);
      }
    });
    connector.init();
  }, [powersync, connector]);

  return (
    <PowerSyncContext.Provider value={powersync as any}>
      <SystemContext.Provider value={connector}>{props.children}</SystemContext.Provider>
    </PowerSyncContext.Provider>
  );
};

export default SystemProvider;

export const SystemContext = React.createContext<SupabaseConnector>(null as any);
export const useSystem = () => React.useContext(SystemContext);

export const useTimedPowerSync = () => _usePowerSync() as unknown as TimedPowerSyncDatabase;
