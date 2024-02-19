---
'@journeyapps/powersync-sdk-common': patch
---

Removed `object-hash` package as a dependency as this caused issues with NextJs 14.1.0.
Added `equals` method on `CrudEntry` class to better align comparison operations with Javascript.
