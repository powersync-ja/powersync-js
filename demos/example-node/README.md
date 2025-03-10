## NodeJS Demo

This demonstrates a small NodeJS client opening a database and connecting PowerSync.

To get started with this example, you need a configured instance of the PowerSync Service. The easiest way to get started is to configure a PowerSync Cloud instance, docs [here](https://docs.powersync.com/installation/database-connection#create-a-powersync-cloud-instance).  
This example expects the schema of our To-Do list example apps; ensure you deploy compatible Sync Rules to your instance which can be found [in our Supabase integration guide](https://docs.powersync.com/integration-guides/supabase-+-powersync#configure-sync-rules).

Being a simple CLI program, this currently doesn't implement authentication. So, you'll need to
create a [development token](https://docs.powersync.com/installation/authentication-setup/development-tokens#development-tokens) to run this example.
This demo expects the URL of your PowerSync instance (this can be copied from the PowerSync Dashboard) in the `DEMO_ENDPOINT` environment variable,
the development token is read from `DEMO_TOKEN`.

Once you have these ready: 

1. Make sure to run `pnpm install` and `pnpm build:packages` in the root of this repo.
2. Then run the following, inserting your instance URL and developer token:
```DEMO_ENDPOINT=https://yourinstance.powersync.journeyapps.com DEMO_TOKEN=YOURTOKEN pnpm run start
```
This opens the local database, connects to PowerSync, waits for a first sync and then runs a simple query.