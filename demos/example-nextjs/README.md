# PowerSync Next.js example

This example is built using [Next.js](https://nextjs.org/) and the [PowerSync JS web SDK](https://docs.powersync.com/client-sdk-references/js-web).

To see it in action:

1. Make sure to run `pnpm install` and `pnpm build:packages` in the root directory of this repo.
2. Copy `.env.local.template` to `.env.local`, and complete the environment variables. You can generate a [temporary development token](https://docs.powersync.com/usage/installation/authentication-setup/development-tokens), or leave blank to test with local-only data.
3. `cd` into this directory and run `pnpm start`.
4. Open the localhost URL displayed in the terminal output in your browser.
