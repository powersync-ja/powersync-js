---
'@journeyapps/powersync-sdk-react-native': patch
'@journeyapps/powersync-sdk-common': patch
---

Updated logic to correspond with React Native Quick SQLite concurrent transactions. Added helper methods on transaction contexts.

API changes include:
- Removal of synchronous DB operations in transactions: `execute`, `commit`, `rollback` are now async functions. `executeAsync`, `commitAsync` and `rollbackAsync` have been removed. 
- Transaction contexts now have `get`, `getAll` and `getOptional` helpers.
- Added a default lock timeout of 2 minutes to aide with potential recursive lock/transaction requests.