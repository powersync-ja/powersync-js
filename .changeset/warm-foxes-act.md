---
'@journeyapps/powersync-sdk-common': patch
---

Improved table change updates to be throttled on the trailing edge. This prevents unnecessary query on both the leading and rising edge. 
