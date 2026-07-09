---
'@powersync/common': patch
---

Fixed an issue where clients using the HTTP connection method could get stuck in an endless auth-error retry loop when their token expired while disconnected (e.g. after network interruptions or device sleep).
