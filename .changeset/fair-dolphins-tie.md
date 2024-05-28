---
'@powersync/web': patch
---

Fix: The shared sync implementation (which resides inside a web worker) creates a WASQLite connection from a worker message port which is supplied to it. We need to specify `useWebWorker` when creating the WASQLite connection adapter to correctly use the supplied message port. This port should always be available to the shared sync implementation so that syncing can occur.
