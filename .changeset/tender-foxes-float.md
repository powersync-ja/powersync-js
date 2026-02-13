---
'@powersync/react-native': minor
'@powersync/node': minor
'@powersync/web': minor
---

Specify @powersync/common only as a direct dependency for main SDK packages. This should prevent some cases where auxillary packages' @powersync/common dependencies are not bumped when SDK packages are bumped.
