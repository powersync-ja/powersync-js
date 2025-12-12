## Node.js CLI Demo

This demonstrates a small Node.js CLI client opening a database, connecting PowerSync and running live queries.

This demo is configured to talk to an example backend [you can host yourself](https://github.com/powersync-ja/self-host-demo). To get started:

1. Start one of the Node.js backend examples from [the self-host-demo repository](https://github.com/powersync-ja/self-host-demo).
2. If necessary, change `.env` to point to the started backend and sync service.
3. `cd` into this directory and run `pnpm install`.
4. Run `pnpm start`.

This opens the local database, connects to PowerSync, waits for a first sync and then runs a simple query.
Results from the query are printed every time it changes. Try:

1. Updating a row in the backend database and see changes reflected in the running client.
2. Enter `add('my list')` and see the new list show up in the backend database.

## Encryption

This demo can use encrypted databases with the `better-sqlite3-multiple-ciphers` package.
To test encryption, set the `ENCRYPTION_KEY` in `.env` to a non-empty value.

## References

For more details, see the documentation for [the PowerSync node package](https://docs.powersync.com/client-sdk-references/node) and check other examples:

- [example-electron-node](../example-electron-node/): An Electron example that runs PowerSync in the main process using the Node.js SDK.
