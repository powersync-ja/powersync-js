/**
 * A small script which creates a persisted trigger in an iframe.
 * We'll close the iFrame in order to simulate a killed tab.
 * The persisted tables should still exist after the iFrame has closed.
 * We'll open another database to perform cleanup and verify the resources have been disposed.
 */

import { DiffTriggerOperation, PowerSyncDatabase, WASQLiteOpenFactory, WASQLiteVFS } from '@powersync/web';
import { TEST_SCHEMA } from '../test-schema';

const db = new PowerSyncDatabase({
  database: new WASQLiteOpenFactory({
    dbFilename: 'triggers.sqlite',
    vfs: WASQLiteVFS.OPFSCoopSyncVFS
  }),
  schema: TEST_SCHEMA
});

// Create the trigger, without ever performing cleanup
await db.triggers.createDiffTrigger({
  source: TEST_SCHEMA.props.customers.name,
  destination: `xxxx_test_${crypto.randomUUID().replaceAll('-', '_')}`,
  when: {
    [DiffTriggerOperation.INSERT]: 'TRUE'
  }
});
