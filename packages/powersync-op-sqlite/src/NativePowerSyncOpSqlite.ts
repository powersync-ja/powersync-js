import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getBundlePath(): Promise<string>;
  getBundlePathSync(): string;
}

export default TurboModuleRegistry.getEnforcing<Spec>('PowerSyncOpSqlite');
