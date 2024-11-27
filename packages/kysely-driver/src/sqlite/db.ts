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

export class PowerSyncKyselyDatabase<T> extends Kysely<T> {
  private db: AbstractPowerSyncDatabase;

  constructor(db: AbstractPowerSyncDatabase, options?: PowerSyncKyselyOptions) {
    super({
      dialect: new PowerSyncDialect({ db }),
      ...options
    });
    this.db = db;
  }

  watch<K>(query: CompilableQuery<K>, handler: CompilableQueryWatchHandler<K>, options?: SQLWatchOptions): void {
    compilableQueryWatch(this.db, query, handler, options);
  }
}

export const wrapPowerSyncWithKysely = <T>(
  db: AbstractPowerSyncDatabase,
  options?: PowerSyncKyselyOptions
): PowerSyncKyselyDatabase<T> => {
  return new PowerSyncKyselyDatabase<T>(db, options);
};
