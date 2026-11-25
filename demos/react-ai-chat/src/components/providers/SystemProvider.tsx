import { AppSchema } from '@/library/powersync/AppSchema';
import { BackendConnector } from '@/library/powersync/BackendConnector';
import { PowerSyncContext } from '@powersync/react';
import { createConsoleLogger, LogLevels, PowerSyncDatabase } from '@powersync/web';
import React from 'react';

export const connector = new BackendConnector();

export const connectionOptions = {
  powerSyncEndpoint: import.meta.env.VITE_POWERSYNC_URL,
  authenticator: connector,
  upload: connector.upload
};

const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'ai-chat.db'
  },
  // In Postgres mode, replies sync many small updates per second, which makes debug logging very noisy.
  logger: createConsoleLogger({ minLevel: LogLevels.info })
});
db.connect(connectionOptions);

export function SystemProvider({ children }: { children: React.ReactNode }) {
  return <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;
}
