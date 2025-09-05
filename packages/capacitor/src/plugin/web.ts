import { WebPlugin } from '@capacitor/core';

import type { PowerSyncPlugin, RegistrationResponse } from './PowerSyncPlugin';

export class PowerSyncWeb extends WebPlugin implements PowerSyncPlugin {
  async registerCore(): Promise<RegistrationResponse> {
    throw new Error('Use the PowerSync web SDK for web.');
  }
}
