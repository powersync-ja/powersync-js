# Developing the Capacitor SDK

## Native browser integration tests

The Capacitor package uses Vitest browser mode with a custom provider. Vitest starts a browser test server, then the provider runs the example Capacitor app and points the app at that server.

Build the workspace before running these tests so the Capacitor package can resolve generated workspace package outputs:

```sh
pnpm install
pnpm build:packages
cd packages/capacitor/example-app
pnpm install
cd ..
```

The test provider reads these environment variables:

- `TEST_PLATFORM`: Native platform to run. Use `ios` or `android`.
- `TEST_TARGET`: Simulator/emulator target id passed to `cap run --target`.
- `TEST_SERVER_HOST`: Hostname the native app should use to reach the Vitest server. Android defaults to `10.0.2.2`; iOS uses the Vitest URL host as-is.

### iOS

List available iOS simulator targets:

```sh
cd packages/capacitor/example-app
pnpm exec cap run ios --list
```

Run the integration tests on a simulator:

```sh
cd packages/capacitor
TEST_PLATFORM=ios \
TEST_TARGET=<ios-simulator-id> \
pnpm exec vitest run --config vitest.config.ts
```

### Android

List available Android emulator/device targets:

```sh
adb devices
```

For the default Android emulator, the target is usually `emulator-5554`.

Run the integration tests on Android:

```sh
cd packages/capacitor
TEST_PLATFORM=android \
TEST_TARGET=emulator-5554 \
pnpm exec vitest run --config vitest.config.ts
```

Android defaults `TEST_SERVER_HOST` to `10.0.2.2`, which lets the emulator reach the host machine without `adb reverse`. The Vitest config also binds the test server to `0.0.0.0` for this reason.
