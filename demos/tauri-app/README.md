# PowerSync Tauri demo

This demonstrates a minimal Tauri app using PowerSync for local persistence and data sync.

It is designed to run with a [self-hosted instance](https://github.com/powersync-ja/self-host-demo/). To get started:

1. Clone the [self-host-demo](https://github.com/powersync-ja/self-host-demo/) repository.
2. Change `config/sync-config.yaml` to the Sync Config from this readme.
3. Run `pnpm install && pnpm dev` to start the UI server.
4. Run `cargo run` to start the app!

```yaml
# config/sync-config.yaml
config:
  edition: 3

streams:
  lists:
    query: SELECT * FROM lists
    auto_subscribe: true
  todos:
    query: SELECT * FROM todos WHERE list_id = subscription.parameter('list')
```

When opening the app, you should see a list displaying all `lists` rows from the server. Clicking on the `Open in new window` button opens the list in a new window. All windows have their own JavaScript context, but share queries and sync in real-time thanks to the PowerSync Tauri plugin.
