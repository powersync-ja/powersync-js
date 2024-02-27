import { PowerSyncDialect } from './sqlite-dialect';
import { Kysely } from 'kysely';
import { type AbstractPowerSyncDatabase } from '@journeyapps/powersync-sdk-common';

export const wrapPowerSyncWithKysely = <T>(db: AbstractPowerSyncDatabase) => {
  return new Kysely<T>({
    dialect: new PowerSyncDialect({
      db
    })
  });
};
