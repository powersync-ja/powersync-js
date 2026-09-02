---
'@powersync/react': patch
---

Forward `throttleMs` from `useQuery` to the underlying watched query. It was accepted by the options type but never passed on, so the default 30ms throttle always applied.
