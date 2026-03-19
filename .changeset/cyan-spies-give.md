---
'@powersync/diagnostics-app': minor
---

Support serving the diagnostics app on a subpath via `BASE_PATH` Docker build arg. This allows hosting the app behind a reverse proxy at a non-root path (e.g. `example.com/powersync-diagnostics/`).
