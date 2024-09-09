import { type AbstractPowerSyncDatabase } from '@powersync/common';
import { Dialect, Kysely, type KyselyConfig } from 'kysely';
import { PowerSyncDialect } from './sqlite-dialect';

/**
 * An extension of {@link KyselyConfig} which uses the {@link PowerSyncDialect} by default.
 */
export type PowerSyncKyselyOptions = Omit<KyselyConfig, 'dialect'> & {
  dialect?: Dialect;
};

export const wrapPowerSyncWithKysely = <T>(db: AbstractPowerSyncDatabase, options?: PowerSyncKyselyOptions) => {
  return new Kysely<T>({
    dialect: new PowerSyncDialect({
      db
    }),
    ...options
  });
};
