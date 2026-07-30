---
'@powersync/shared-internals': patch
---

Fix watched queries leaking listeners when closed during initialization. Closing a watched query
while it was still resolving tables (or waiting for the database to be ready) registered a
permanent `tablesUpdated` listener on the database adapter, because `onChangeWithCallback` relied
on an `abort` event that an already-aborted signal never emits. In `@powersync/react`, every
`useQuery` mount hit this race and leaked one adapter listener.
