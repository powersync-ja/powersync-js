# PowerSync + Electron with rendered Web App Example

Example demonstrating the use of the [PowerSync SDK for Web](/packages/web/README.md) together with an Electron rendered Web App.

To see it in action:

1. Make sure to run `pnpm install` and `pnpm build:packages` in the root directory of this repo.
2. Copy `.env.local.template` to `.env.local`, and complete the environment variables. You can generate a [temporary development token](https://docs.powersync.com/usage/installation/authentication-setup/development-tokens), or leave blank to test with local-only data.
3. `cd` into this directory and run `pnpm start`.

The Electron app should open automatically.