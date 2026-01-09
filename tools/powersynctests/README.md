# PowerSync Tests

This is a React Native test application for PowerSync, currently only used to test @powersync/op-sqlite.

## Getting Started

1. Install dependencies and build packages in the root directory:

```sh
pnpm install
pnpm build:packages
```

2. Start Metro bundler:

```sh
pnpm start
```

3. Run the app:

### For iOS

Update pods:

```sh
cd ios
bundle exec pod update
cd ..
```

Then run:

```sh
pnpm ios
```

### For Android

```sh
pnpm android
```

4. Run tests

### iOS

```sh
pnpm detox build --configuration ios.sim.debug
pnpm detox test --configuration ios.sim.debug
```

### Android

````sh
pnpm detox build --configuration android.emu.debug
# replace Pixel_3a_API_34 with your desired AVD name, defaults to "ubuntu-avd-x86_64-31" for AVD via GitHub CI KVM
DETOX_AVD_NAME=Pixel_3a_API_34 pnpm detox test --configuration android.emu.debug 
```