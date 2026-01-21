# @powersync/local-linking

Builds a CommonJS `pnpmfile` (no bundling) that forces demos to resolve `@powersync/*` packages from the parent workspace during local development.

## What it does

- Compiles `src/pnpmfile.ts` to `dist/pnpmfile.js` (CJS) via `tsc` only.
- `scripts/demos-inject-local.ts` copies the built `pnpmfile` into each demo as `.pnpmfile.cjs`.
- The `pnpmfile` rewrites dependencies to `file:` paths pointing at the workspace packages and their peer deps.
- The `pnpmfile` replaces `catalog:` versions with concrete versions from the workspace manifest so demos work outside the main repo.

## Build

```bash
pnpm -C tools/local-linking install
pnpm -C tools/local-linking build
```

## Usage via injector

```bash
pnpm demos:inject
```

Select demos (or use flags) and the script will build `local-linking` if needed, then copy `dist/pnpmfile.js` into each selected demo.

## Workspace helper hack

The `pnpmfile` imports `@pnpm/workspace.find-packages` and `@pnpm/workspace.read-manifest`. These are **not** installed in demos. They resolve from the parent repo’s `node_modules` when the injected `.pnpmfile.cjs` runs. This works because pnpm loads the pnpmfile in the workspace context even though the file is located inside the demo.
If this ever causes issues, we can switch to bundling those two dependencies into the emitted pnpmfile.
