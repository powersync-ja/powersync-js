## NodeJS Demo

This demonstrates a small NodeJS client opening a database and connecting PowerSync.

To get started with this example, you need a configured instance of the sync service.
This example expects the the schema [created in this guide](https://docs.powersync.com/integration-guides/supabase-+-powersync#configuring-powersync),
which you can follow to start a compatible service.

Being a simple CLI program, this currently doesn't implement authentication. So, you'll need to
create a [development token](https://docs.powersync.com/installation/authentication-setup/development-tokens#development-tokens) to run this example.
This demo expects the URL of the PowerSync instance in the `DEMO_ENDPOINT` environment variable,
the development token is read from `DEMO_TOKEN`.

Once you have those values ready, you can use the following command to open a database, connect to PowerSync,
wait for a first sync and run a simple query.

```
DEMO_ENDPOINT=https://yourinstance.powersync.journeyapps.com DEMO_TOKEN=YOURTOKEN pnpm run start
```
