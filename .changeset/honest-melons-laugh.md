---
'@powersync/web': patch
---

Fixed issue where broadcast logger wasn't being passed to WebRemote, causing worker remote logs not to be broadcasted to the tab's logs.
