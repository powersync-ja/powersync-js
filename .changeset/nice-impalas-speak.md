---
'@powersync/web': minor
---

Updated WA-SQLite to `@journeyapps/wa-sqlite@1.0.0`. Note that WA-SQLite performed some changes to the virtual filesystem structure in this update. An automatic migration will be executed when upgrading, however no down-migration is available. Downgrading to `@journeyapps/wa-sqlite < 1.0.0` will require the IndexDB storage to be erased.
