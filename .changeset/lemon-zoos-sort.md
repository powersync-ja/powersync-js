---
'@journeyapps/powersync-sdk-web': patch
---

Added some serialization checks for broadcasted logs from shared web worker. Unserializable items will return a warning.
