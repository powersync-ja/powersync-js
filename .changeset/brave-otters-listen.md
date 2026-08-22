---
'@powersync/shared-internals': patch
---

Fix stream subscription changes made while `connect()` is still bringing up the sync implementation being
lost until the next reconnect. A stream could keep syncing after being unsubscribed, or be reported as
subscribed while never being requested, leaving `waitForFirstSync()` unresolved.
