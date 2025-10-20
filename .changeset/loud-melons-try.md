---
'@powersync/diagnostics-app': patch
---

- Fixed bug where Rust client implementation would not update the dynamic schema after sync.
- Improved dynamic schema refresh logic for all implementations. Updating the schema should now always update all dependent watched queries e.g. in the SQL Console.
