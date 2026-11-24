---
'@powersync/web': patch
---

Fix the README encryption example, which passed `encryptionKey` at the top level. Since 2.0 the key goes inside `database`, and a key passed at the top level is ignored, so databases created with the old example aren't encrypted.
