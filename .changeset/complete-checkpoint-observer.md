---
'@powersync/standalone-client': minor
---

Add `PowerSyncClient.subscribeCheckpoint()` to observe complete checkpoint applications, including unchanged and empty checkpoints on an existing connection. Integrations can use the event to recheck stream health even when sync status remains ready. Observer errors are isolated from sync and other observers.
