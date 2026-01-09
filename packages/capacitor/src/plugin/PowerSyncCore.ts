import { registerPlugin } from '@capacitor/core';
import { PowerSyncPlugin } from './PowerSyncPlugin.js';

export const PowerSyncCore = registerPlugin<PowerSyncPlugin>('PowerSync', {
  web: () => import('./web').then((m) => new m.PowerSyncWeb())
});
