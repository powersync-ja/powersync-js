---
'@journeyapps/powersync-sdk-common': patch
---

Improved connector CRUD uploads to be triggered whenever an internal CRUD operation change is triggered. Improved CRUD upload debouncing to rather use a throttled approach - executing multiple continous write/CRUD operations will now trigger a connector upload at most (every) 1 second (by default).
