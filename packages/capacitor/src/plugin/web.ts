import { WebPlugin } from '@capacitor/core';

import type { PowerSyncPlugin, RegistrationResponse } from './PowerSyncPlugin';

export class PowerSyncWeb extends WebPlugin implements PowerSyncPlugin {
  async registerCore(): Promise<RegistrationResponse> {
    throw new Error('This code path is not supported on web.');
  }
}
