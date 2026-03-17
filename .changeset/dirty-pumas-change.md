---
'@powersync/react': patch
---

Fixed an issue where if a `useQuery` hook was waiting for a sync stream, the result sometimes omitted fields that should always be present according to the TypeScript typing.
