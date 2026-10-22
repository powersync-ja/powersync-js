# PowerSync + Capacitor Example

Example demonstrating the use of the [PowerSync SDK for Capacitor](/packages/capacitor/README.md) together with a Capacitor App.

To see it in action:

1. `cd` into this directory and run `pnpm install`.
2. Copy `.env.local.template` to `.env.local`, and complete the environment variables. You can generate a [temporary development token](https://docs.powersync.com/usage/installation/authentication-setup/development-tokens), or leave blank to test with local-only data.
3. Run `pnpm start`.
4. Open the localhost URL displayed in the terminal output in your browser.

## Run with a local backend

`docker/compose.yaml` runs Postgres, the PowerSync service, and a [Node.js backend](https://github.com/powersync-ja/powersync-nodejs-backend-todolist-demo) that issues tokens and applies uploads. You need Docker.

1. Start the backend. The first start builds the Node.js backend from GitHub. Postgres starts with 10,000 rows in `customers`.

   ```bash
   pnpm backend:up
   ```

2. Copy `.env.local.template` to `.env.local`. It already points at the local services.
3. Run `pnpm start`.

`pnpm backend:down` stops the backend and deletes its data.

## PowerSync DevTools on a simulator or emulator

The dev server includes [PowerSync DevTools](https://docs.powersync.com/tools/devtools/vite). With live reload, the app on the simulator or emulator loads from the dev server, so DevTools see its database.

1. Start the local backend and the dev server as above (`pnpm backend:up`, then `pnpm start`).
2. Run the app with live reload:

   - iOS simulator:

     ```bash
     npx cap run ios --live-reload --host localhost --port 5173
     ```

   - Android emulator. Forward the dev server and PowerSync ports first, so `localhost` in the emulator reaches your computer. Capacitor 8 needs JDK 21; Android Studio ships one.

     ```bash
     adb reverse tcp:5173 tcp:5173
     adb reverse tcp:8080 tcp:8080
     JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
       npx cap run android --live-reload --host localhost --port 5173
     ```

3. Tap **Unauthorized** in the DevTools dock at the bottom of the app. The dev server terminal prints a code for the device. Enter it in the app.
4. Open the **PowerSync** entry in the dock. Or open `http://localhost:5173/__devtools/` in a desktop browser: the device shows up there as an attached database.

## iOS

To run the iOS version of the app run:

1. `pnpm build`
2. `pnpm sync`
3. `pnpm ios`

## Android

To run the Android version of the app run:

1. `pnpm build`
2. `pnpm sync`
3. `pnpm android` (to see console run `chrome://inspect/#devices` in browser)
