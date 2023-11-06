---
'@journeyapps/powersync-sdk-common': patch
---

Fixed regression where `waitForReady` would not trigger or resolve if not invoked before `init`
