# PowerSync Webpack bundling test

This is a minimal example demonstrating bundling with Webpack. It attempts a connection to verify that web workers load correctly, but networks requests will fail since no credentials are configured. See [src/index.js](src/index.js) for details.

To see it in action:

1. Make sure to run `pnpm install` and `pnpm build:packages` in the root directory of this repo.
2. `cd` into this directory, and run `pnpm start`.
3. Open the localhost URL displayed in the terminal output in your browser.
