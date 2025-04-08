---
'@powersync/web': minor
---

Determining `node_modules` location via `require.resolve` for the `copy-assets` command. Fixes use cases where `node_modules` location might differ such as in a monorepo.
