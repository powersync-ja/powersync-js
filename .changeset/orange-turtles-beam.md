---
'@powersync/common': patch
---

Added CommonJs output for common package. Ensuring default export entry is last so that require statements don't use .mjs output instead of .cjs.
