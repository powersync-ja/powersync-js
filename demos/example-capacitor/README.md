# PowerSync + Capacitor Example

Example demonstrating the use of the [PowerSync SDK for Web](/packages/web/README.md) together with a Capacitor App.

To see it in action:

1. Make sure to run `pnpm install` and `pnpm build:packages` in the root directory of this repo.
2. Copy `.env.local.template` to `.env.local`, and complete the environment variables. You can generate a [temporary development token](https://docs.powersync.com/usage/installation/authentication-setup/development-tokens), or leave blank to test with local-only data.
3. `cd` into this directory and run `pnpm start`.
4. Open the localhost URL displayed in the terminal output in your browser.

## iOS

To run the iOS version of the app run:

 1. `pnpm sync`
 2. `pnpm ios`

## Android

To run the Android version of the app run:

 1. `pnpm sync`
 2. `pnpm android` (to see console run `chrome://inspect/#devices` in browser)
