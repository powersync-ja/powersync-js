---
'@powersync/react-native': patch
---

Fixed an issue where the read and write locks were executing mutually exclusively. A read conccurent with a write or another read should correctly proceed instead of being blocked until the other lock has released.
