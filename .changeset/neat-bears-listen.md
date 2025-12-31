---
'@powersync/node': patch
---

DB operations will now throw a dedicated `ConnectionClosed` error when an attempt to perform an operation on a closed connection is made.
