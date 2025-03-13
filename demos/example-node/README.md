## Node.js Demo

This demonstrates a small Node.js client opening a database and connecting PowerSync.

This demo is configured to talk to an example backend [you can host yourself](https://github.com/powersync-ja/self-host-demo). To get started:

1. Start one of the Node.js backend examples from [the self-host-demo repository](https://github.com/powersync-ja/self-host-demo).
2. If necessary, change `.env` to point to the started backend and sync service.
3. Run `pnpm install` and `pnpm build:packages` in the root of this repo.
4. In this directory, run `pnpm run start`.

This opens the local database, connects to PowerSync, waits for a first sync and then runs a simple query.
Results from the query are printed every time it changes. Try:

1. Updating a row in the backend database and see changes reflected in the running client.
2. Enter `add('my list')` and see the new list show up in the backend database.
