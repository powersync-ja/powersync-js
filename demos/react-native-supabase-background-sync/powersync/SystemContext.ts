import React from 'react';
import { createConsoleLogger, LogLevels, PowerSyncDatabase } from '@powersync/react-native';
import { SupabaseConnector } from '@/supabase/SupabaseConnector';
import { AppSchema } from '@/powersync/AppSchema';

const logger = createConsoleLogger({ minLevel: LogLevels.debug });

export class System {
  connector: SupabaseConnector;
  powersync: PowerSyncDatabase;

  constructor() {
    this.connector = new SupabaseConnector();

    this.powersync = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'powersync.db'
      },
      logger: logger
    });
  }

  async init() {
    await this.connector.signInAnonymously();

    await this.powersync.init();

    await this.powersync.connect(this.connector);

    this.powersync.registerListener({
      statusChanged: (status) => {
        const hasSynced = Boolean(status.lastSyncedAt);
        const downloading = status?.downloading || false;
        const uploading = status?.uploading || false;
        console.log(
          '[PowerSync] Status changed:',
          hasSynced ? '✅ Synced' : '⏳ Not yet synced',
          downloading ? '📥 Downloading' : '✅ Not downloading',
          uploading ? '📤 Uploading' : '✅ Not uploading'
        );
      }
    });
  }

  async disconnect() {
    await this.powersync.disconnect();
  }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);
