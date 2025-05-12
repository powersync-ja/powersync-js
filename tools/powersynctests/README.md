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
pod update
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
detox test --configuration ios.sim.debug
```

### Android

````sh
pnpm detox test --configuration android.emu.debug

5. Building

### iOS

```sh
pnpm detox build --configuration ios.sim.debug
````

### Android

```sh
pnpm detox build --configuration android.emu.debug
```
