---
'@powersync/react-native': patch
---

Configure the op-sqlite read connections concurrently during initialization instead of one after another, reducing time to database readiness on cold start.
