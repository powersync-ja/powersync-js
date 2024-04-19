# PowerSync + Django React Native Demo: Todo List

## Note: Alpha Release

This package is currently in an alpha release. Functionality could change dramatically in future releases. Certain functions may be partially implemented or buggy.

## Overview

Demo app demonstrating use of the [PowerSync SDK for React Native](https://www.npmjs.com/package/@journeyapps/powersync-sdk-react-native) together with a Django backend.
The sample backend that you can run alongside this demo can be found here: [PowerSync Django Backend: Todo List Demo](https://github.com/powersync-ja/powersync-django-backend-todolist-demo)

## Running the App

Install the dependencies, including the React Native SDK:

```sh
pnpm install
```

Run on iOS

```sh
pnpm ios
```

Run on Android

```sh
pnpm android
```

## Set up Django Backend

This demo requires that you have the [PowerSync Django Backend: Todo List Demo](https://github.com/powersync-ja/powersync-django-backend-todolist-demo)  running on your machine.
Follow the guide in the README of the PowerSync Django Backend to set it up.

## Set up PowerSync Instance

Create a new PowerSync instance, connecting to the database of the Supabase project.

Then deploy the following sync rules:

```yaml
bucket_definitions:
  user_lists:
    # Separate bucket per todo list
    parameters: select id as list_id from lists where owner_id = token_parameters.user_id
    data:
      - select * from api_list
      - select * from api_todo
```

## Configure The App

Copy the `AppConfig.template.ts` to a usable file

```bash
cp library/django/AppConfig.template.ts library/django/AppConfig.ts
```

Insert the necessary credentials.
