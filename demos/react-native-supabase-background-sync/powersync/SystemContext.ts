import React from 'react';
import { createBaseLogger, LogLevel, PowerSyncDatabase, SyncClientImplementation } from '@powersync/react-native';
import { SupabaseConnector } from '@/supabase/SupabaseConnector';
import { AppSchema } from '@/powersync/AppSchema';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';

const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.DEBUG);

export class System {
    connector: SupabaseConnector;
    powersync: PowerSyncDatabase;

    constructor() {
        this.connector = new SupabaseConnector();

        const opSqlite = new OPSqliteOpenFactory({
            dbFilename: 'powersync.db'
        });

        this.powersync = new PowerSyncDatabase({
            schema: AppSchema,
            database: opSqlite,
            logger: logger
        });
    }

    async init() {
        await this.connector.signInAnonymously();

        await this.powersync.init();

        await this.powersync.connect(this.connector, {
            clientImplementation: SyncClientImplementation.RUST
        });

        this.powersync.registerListener({
            statusChanged: (status) => {
                const hasSynced = Boolean(status.lastSyncedAt);
                const downloading = status.dataFlowStatus?.downloading || false;
                const uploading = status.dataFlowStatus?.uploading || false;
                console.log(
                    '[PowerSync] Status changed:',
                    hasSynced ? '✅ Synced' : '⏳ Not yet synced',
                    downloading ? '📥 Downloading' : '✅ Not downloading',
                    uploading ? '📤 Uploading' : '✅ Not uploading'
                );
            },
        });
    }

    async disconnect() {
        await this.powersync.disconnect();
    }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);


