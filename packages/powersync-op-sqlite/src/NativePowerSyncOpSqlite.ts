import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getBundlePath(): string;
}

export default TurboModuleRegistry.getEnforcing<Spec>('PowerSyncOpSqlite');
