const assert = require('assert');

const NodeSDK = require('@powersync/node');
const { ControlledExecutor } = require('@powersync/node');
assert(NodeSDK);
assert(ControlledExecutor);

const Attachments = require('@powersync/attachments');
const { AttachmentState } = require('@powersync/attachments');
assert(Attachments);
assert(AttachmentState);

const DrizzleDriver = require('@powersync/drizzle-driver');
const { toCompilableQuery } = require('@powersync/drizzle-driver');
assert(DrizzleDriver);
assert(toCompilableQuery);

const KyselyDriver = require('@powersync/kysely-driver');
const { wrapPowerSyncWithKysely } = require('@powersync/kysely-driver');
assert(KyselyDriver);
assert(wrapPowerSyncWithKysely);

console.log('All CommonJS requires functioned correctly!');
