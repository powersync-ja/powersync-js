---
'@powersync/react': patch
---

Fixed a crash in `useQuery` when a query throws while being compiled on some renders but not others. The internal `checkQueryChanged` helper declared a `useRef` after an early return, so the hook was called conditionally. The query is now also re-applied once it compiles again after a failed compilation.
