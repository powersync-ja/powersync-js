import {
  CompilableQuery,
  compilableQueryWatch,
  CompilableQueryWatchHandler,
  SQLWatchOptions,
  type AbstractPowerSyncDatabase
} from '@powersync/common';
import { Dialect, Kysely, type KyselyConfig } from 'kysely';
import { PowerSyncDialect } from './sqlite-dialect';

/**
 * An extension of {@link KyselyConfig} which uses the {@link PowerSyncDialect} by default.
 */
export type PowerSyncKyselyOptions = Omit<KyselyConfig, 'dialect'> & {
  dialect?: Dialect;
};

export type PowerSyncKyselyDatabase<T> = Kysely<T> & {
  watch: <K>(query: CompilableQuery<K>, handler: CompilableQueryWatchHandler<K>, options?: SQLWatchOptions) => void;
};

export const wrapPowerSyncWithKysely = <T>(
  db: AbstractPowerSyncDatabase,
  options?: PowerSyncKyselyOptions
): PowerSyncKyselyDatabase<T> => {
  const kysely = new Kysely<T>({
    dialect: new PowerSyncDialect({
      db
    }),
    ...options
  });

  return Object.assign(kysely, {
    watch: <K>(query: CompilableQuery<K>, handler: CompilableQueryWatchHandler<K>, options?: SQLWatchOptions) => {
      compilableQueryWatch(db, query, handler, options);
    }
  });
};
