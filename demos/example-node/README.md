## NodeJS Demo

This demonstrates a small NodeJS client opening a database and connecting PowerSync.

To get started, set up a PowerSync service instance with the default rules for the todolist examples.
Create a development token, and use it to implement `DemoConnector.fetchCredentials` in `main.ts`.

Then, use `pnpm run run` to open a database, connect to PowerSync, wait for a first sync, and run a simple query.
