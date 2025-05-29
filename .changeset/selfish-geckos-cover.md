---
'@powersync/node': patch
---

Add a `main` entry to `package.json`. It will be ignored because the package uses conditional exports, but is required for tools like `pkg`.
