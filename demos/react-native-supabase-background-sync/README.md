# PowerSync + Supabase React Native Expo Background Sync

## Overview

Demo app demonstrating background sync using PowerSync, Expo and Supabase.

This demo app uses expo-background-task to run a background task that syncs your PowerSync database in the background. To learn more, see the [Expo Background Task docs](https://docs.expo.dev/versions/latest/sdk/background-task).

## Info

The background sync logic is located in `library/utils.ts`.

## Getting Started

In the repo directory, use [pnpm](https://pnpm.io/installation) to install dependencies:

```bash
pnpm install
pnpm build:packages
```

Then switch into the demo's directory:

```bash
cd demos/react-native-supabase-background-sync
```

Set up the Environment variables: Copy the `.env` file:

```bash
cp .env.local.template .env.local
```

And then edit `.env.local` to insert your credentials for `Supabase`.

### Run on iOS (see [configuring background modes on iOS](https://docs.expo.dev/versions/latest/sdk/task-manager/#configuration))

To enable background tasks in PowerSync on iOS, you need to add both processing and fetch to the UIBackgroundModes array in your app’s Info.plist (ios/powersyncreactnativebackgroundsync/Info.plist). The fetch mode is required so your app can periodically run background fetches, allowing PowerSync to upload and download data even when the app is not in the foreground:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>processing</string>
    <string>fetch</string>
</array>
```

then run

```sh
pnpm ios
```

### Run on Android

```sh
pnpm android
```

## Supabase and background sync

The `SupabaseConnector` has been configured to override the default `fetch` function that the `@supabase/supabase-js` SDK uses. By default, the `fetch` function used does not work in the background [see here](https://github.com/facebook/react-native/issues/47437), so we need to override it with a something that works in the background, like `expo/fetch`.

```typescript
this.client = createClient(AppConfig.supabaseUrl!, AppConfig.supabaseAnonKey!, {
      auth: {
        persistSession: true
      },
      global: {
        // Override the default fetch function to use expo-fetch
        fetch: fetch as any
      }
    });
```

## How to force a background task to run (in development)

### Android

`com.anonymous.powersyncreactnativebackgroundsync` is the package name of the app.

The following command will show you the jobscheduler for your app:

```bash
adb shell dumpsys jobscheduler | grep -A 40 -m 1 -E "JOB #.* com.anonymous.powersyncreactnativebackgroundsync"
```

The result should look something like this:

```bash
JOB #u0a212/0: 74a550e com.anonymous.powersyncreactnativebackgroundsync/androidx.work.impl.background.systemjob.SystemJobService
```

The number after the `/` is the job ID. In this case, it is 0. You can use this to force the job to run by using the following command:

```bash
adb shell cmd jobscheduler run -f com.anonymous.powersyncreactnativebackgroundsync 0
```

### iOS

Background tasks are not supported on iOS simulators.

## ⚠️ Please note

The app needs to be in the background for it to run and ultimately, the OS decides when to run background tasks so forcing it to run might not always work immediately. The background task should run on it's own within 20 minutes after the app is put in the background. Testing background sync seems to work better and more consistently on a physical device. If you don't see any logs after starting your background task, you may need to watch all the logs on the device using `adb logcat` (on Android).

When the background task starts, you will see the following logs:

```javascript
[Background Task] Starting background task at ...
[Background Task] Initializing PowerSync
```

After it has connected to the PowerSync instance, you will see the following log:

```javascript
[Background Task] Download complete
Finished task 'background-powersync-task' with eventId ...
```

At this point, the background task has successfully connected to PowerSync (on a different thread) and inserted a mock list item to simulate pending transactions in the `ps_crud` table. It has not yet uploaded this transaction to the source database.

After a couple of minutes, you will see the following logs:

```javascript
Could not apply checkpoint due to local data. Will retry at completed upload or next checkpoint.

Could not apply pending checkpoint even after completed upload

Validated and applied checkpoint
```

Typically this means that the background task has successfully uploaded the transaction to the source database.

## The background task design

This function `initializeBackgroundTask` sets up automatic background syncing for your app. Here's how it works:

### What it does

- Waits for your app to fully load before setting up background tasks
- Watches for when users switch between your app and other apps
- Registers the background task to run when the app goes to the background
- Unregisters the background task when the app comes back to the foreground

### Why this approach

- Prevents conflicts - Avoids having multiple PowerSync connections (on different threads). When a task is unregistered, the connection to PowerSync is closed.

### User experience

- When user minimizes your app or switches to another app → background sync is scheduled to start
- When user returns to your app → background sync stops if it is running (since the app can sync normally while in use)
- User doesn't need to do anything - it's completely automatic

### Technical details

- Uses a minimum interval setting to control how often background sync runs (this is use-case dependent)
- Checks if tasks are already registered to avoid duplicates
- Includes logging to help with debugging

This ensures your app stays up-to-date even when users aren't actively using it, while being efficient with device resources.

### EAS Build configuration

General information on defining environment variables with Expo can be [found here](https://docs.expo.dev/build-reference/variables/#can-eas-build-use-env-files).

## Learn More

Check out [the PowerSync SDK for React Native on GitHub](https://github.com/powersync-ja/powersync-js/tree/main/packages/react-native) - your feedback and contributions are welcome!

To learn more about PowerSync, see the [PowerSync docs](https://docs.powersync.com).
