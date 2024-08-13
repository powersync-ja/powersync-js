import { type AbstractPowerSyncDatabase } from '@powersync/common';
import { Kysely, type KyselyConfig } from 'kysely';
import { PowerSyncDialect } from './sqlite-dialect.js';

export const wrapPowerSyncWithKysely = <T>(db: AbstractPowerSyncDatabase, options?: KyselyConfig) => {
  return new Kysely<T>({
    dialect: new PowerSyncDialect({
      db
    }),
    ...options
  });
};
