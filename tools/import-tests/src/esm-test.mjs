import assert from 'assert';

import * as NodeSDK from '@powersync/node';
import { ControlledExecutor } from '@powersync/node';
assert(NodeSDK);
assert(ControlledExecutor);

// Simulates SSR environment
import * as WebSDK from '@powersync/web';
import { PowerSyncDatabase as WebPowerSyncDatabase } from '@powersync/web';
assert(WebSDK);
assert(WebPowerSyncDatabase);

import * as CapacitorSDK from '@powersync/capacitor';
import { PowerSyncDatabase as CapacitorPowerSyncDatabase } from '@powersync/capacitor';
assert(CapacitorSDK);
assert(CapacitorPowerSyncDatabase);

import * as Attachments from '@powersync/attachments';
import { AttachmentState } from '@powersync/attachments';
assert(Attachments);
assert(AttachmentState);

import * as DrizzleDriver from '@powersync/drizzle-driver';
import { toCompilableQuery } from '@powersync/drizzle-driver';
assert(DrizzleDriver);
assert(toCompilableQuery);

import * as KyselyDriver from '@powersync/kysely-driver';
import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
assert(KyselyDriver);
assert(wrapPowerSyncWithKysely);

console.log('All ESM imports functioned correctly!');
