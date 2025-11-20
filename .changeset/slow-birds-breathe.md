---
'@powersync/web': minor
---

Fixes regression introduced in `@powersync/web@1.28.1`. Vite users don't need to include `event-iterator` in included optimized dependencies.

vite.config.js

```diff
include: [
-   '@powersync/web > event-iterator'
]
```
