'use client';
import { TimedPowerSyncDatabase } from '@/library/TimedPowerSyncDatabase';
import React, { PropsWithChildren } from 'react';
import { PowerSyncContext, usePowerSync as _usePowerSync } from '@powersync/react';
import { AppSchema } from '@/library/powersync/AppSchema';
import { SupabaseConnector } from '@/library/SupabaseConnector';
import { useSupabase } from './SupabaseProvider';
import { createBaseLogger, LogLevel } from '@powersync/web';

const logger = createBaseLogger();
logger.setLevel(LogLevel.DEBUG);

/**
 * In Safari, navigator.locks.request() never resolves inside a SharedWorker
 * created from a cross-site iframe. The SDK's shared DB worker takes a navigator
 * lock while opening the database, so the client waits on the worker handshake
 * forever. When embedded, fall back to dedicated workers, where Web Locks work.
 */
const isEmbedded = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin access to window.top throws → we are embedded
  }
})();

export interface SystemProviderProps {
  dbFilename: string;
}

const SystemProvider: React.FC<PropsWithChildren<SystemProviderProps>> = (props) => {
  const { client } = useSupabase();

  const [powersync] = React.useState(
    new TimedPowerSyncDatabase({
      database: {
        dbFilename: props.dbFilename
      },
      flags: {
        enableMultiTabs: !isEmbedded
      },
      logger: logger,
      schema: AppSchema
    })
  );

  const [connector] = React.useState(new SupabaseConnector(client));

  React.useEffect(() => {
    powersync.init();

    const l = connector.registerListener({
      initialized: () => {},
      sessionStarted: async () => {
        await powersync.connect(connector, {
          appMetadata: {
            app_version: APP_VERSION
          }
        });
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
