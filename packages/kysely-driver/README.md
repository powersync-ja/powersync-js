# PowerSync Kysely Driver

This package (`packages/kysely-driver`) brings the benefits of an ORM through our maintained [Kysely](https://kysely.dev/) driver to [PowerSync](https://powersync.com).

## Getting started

Set up the PowerSync Database and wrap it with Kysely.

```js
import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
import { PowerSyncDatabase } from '@powersync/web';

// Define schema as in: https://docs.powersync.com/usage/installation/client-side-setup/define-your-schema
import { appSchema } from './schema';

export const powerSyncDb = new PowerSyncDatabase({
  database: {
    dbFilename: 'test.sqlite'
  },
  schema: appSchema
});

export const db = wrapPowerSyncWithKysely(powerSyncDb);

const result = await db.selectFrom('users').selectAll().execute();

// [{ id: '1', name: 'user1' }, { id: '2', name: 'user2' }]
```

With typing for TypeScript:

```TypeScript
import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
import { PowerSyncDatabase } from "@powersync/web";

// Define schema as in: https://docs.powersync.com/usage/installation/client-side-setup/define-your-schema
import { appSchema, Database } from "./schema";

export const powerSyncDb = new PowerSyncDatabase({
  database: {
    dbFilename: "test.sqlite"
  },
  schema: appSchema,
});

// `db` now automatically contains types for defined tables
export const db = wrapPowerSyncWithKysely<Database>(powerSyncDb)

const result = await db.selectFrom('users').selectAll().execute();

// [{ id: '1', name: 'user1' }, { id: '2', name: 'user2' }]
```

For more information on Kysely typing, see [here](https://kysely.dev/docs/getting-started#types).

For more information on how to use Kysely queries in PowerSync, see [here](https://docs.powersync.com/client-sdk-references/javascript-web/javascript-orm/kysely#usage-examples).
