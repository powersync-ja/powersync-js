# PowerSync + Django React Native Demo: Todo List

## Overview

Demo app demonstrating use of the [PowerSync SDK for React Native](https://www.npmjs.com/package/@powersync/react-native) together with a Django backend.
The sample backend that you can run alongside this demo can be found here: [PowerSync Django Backend: Todo List Demo](https://github.com/powersync-ja/powersync-django-backend-todolist-demo)

## Running the App

Install the dependencies, including the React Native SDK:

```sh
pnpm install
```

Update the `.env` file with PowerSync and Django details

Run on iOS

```sh
pnpm ios
```

Run on Android

```sh
pnpm android
```

## Service Configuration

This demo can be used with cloud or local services.

### Local Services

The [Self Hosting Demo](https://github.com/powersync-ja/self-host-demo) repository contains a Docker Compose Django backend demo which can be used with this client.
See [instructions](https://github.com/powersync-ja/self-host-demo/blob/feature/django-backend/demos/django/README.md) for starting the backend locally.

#### Android

Note that Android requires port forwarding of local services. These can be configured with ADB as below:

```bash
adb reverse tcp:8080 tcp:8080 && adb reverse tcp:6061 tcp:6061
```

### Cloud Services

#### Set up Django Backend

This demo requires that you have the [PowerSync Django Backend: Todo List Demo](https://github.com/powersync-ja/powersync-django-backend-todolist-demo) running on your machine.
Follow the guide in the README of the PowerSync Django Backend to set it up.

#### Set up PowerSync Instance

Create a new PowerSync instance, connecting to the database of the Supabase project.

Then deploy the following sync rules:

```yaml
bucket_definitions:
  user_lists:
    # Separate bucket per todo list
    parameters: select id as list_id from lists where owner_id = request.user_id()
    data:
      - select * from lists
      - select * from todos
```

#### Configure The App

Copy the `AppConfig.template.ts` to a usable file

```bash
cp library/django/AppConfig.template.ts library/django/AppConfig.ts
```

Insert the necessary credentials.
