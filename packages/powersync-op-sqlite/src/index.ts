import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package '@powersync/op-sqlite' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const isTurboModuleEnabled = global.__turboModuleProxy != null;

const PowerSyncOpSqliteModule = isTurboModuleEnabled
  ? require('./NativePowerSyncOpSqlite').default
  : NativeModules.PowerSyncOpSqlite;

const PowerSyncOpSqlite = PowerSyncOpSqliteModule
  ? PowerSyncOpSqliteModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        }
      }
    );

export function getBundlePath(): string {
  return PowerSyncOpSqlite.getBundlePath();
}

export { OPSqliteOpenFactory, OPSQLiteOpenFactoryOptions } from './db/OPSqliteDBOpenFactory';
