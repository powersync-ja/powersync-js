import { describe, expect } from 'vitest';

import * as WebSDK from '@powersync/web';

import * as Attachments from '@powersync/attachments';
import { AttachmentState } from '@powersync/attachments';

import * as DrizzleDriver from '@powersync/drizzle-driver';
import { toCompilableQuery } from '@powersync/drizzle-driver';

import * as KyselyDriver from '@powersync/kysely-driver';
import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver';

describe('Web Imports', () => {
  it('Should have imported correctly', () => {
    expect(WebSDK).toBeDefined();

    expect(Attachments).toBeDefined();
    expect(AttachmentState).toBeDefined();

    expect(DrizzleDriver).toBeDefined();
    expect(toCompilableQuery).toBeDefined();

    expect(KyselyDriver).toBeDefined();
    expect(wrapPowerSyncWithKysely).toBeDefined();
  });
});
