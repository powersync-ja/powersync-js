---
'@powersync/web': minor
---

Improved query behaviour when client is closed. Pending requests will be aborted, future requests will be rejected with an Error. Fixed read and write lock requests not respecting timeout parameter.
