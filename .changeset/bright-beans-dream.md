---
'@powersync/capacitor': patch
'@powersync/nuxt': patch
'@powersync/web': patch
---

Make `@journeyapps/wa-sqlite` a regular dependency instead of a dev-dependency.
When upgrading, you can remove that package from your dependencies if you don't import it directly in your project.
