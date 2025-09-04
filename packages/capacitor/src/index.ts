import { registerPlugin } from '@capacitor/core';

import type { PowerSyncPlugin } from './definitions';

const PowerSync = registerPlugin<PowerSyncPlugin>('PowerSync', {
  web: () => import('./web').then((m) => new m.PowerSyncWeb()),
});

export * from './definitions';
export { PowerSync };
