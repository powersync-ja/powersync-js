---
'@powersync/react': patch
'@powersync/react-native': patch
---

Fixed an issue with `useQuery` where initial query/parameter changes could cause a race condition if the first query took long.
