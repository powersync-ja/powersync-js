import { WebPlugin } from '@capacitor/core';

import type { PowerSyncPlugin } from './definitions';

export class PowerSyncWeb extends WebPlugin implements PowerSyncPlugin {
  async registerCore(): Promise<void> {
   throw new Error("Use the PowerSync web SDK for web.")
  }
}
