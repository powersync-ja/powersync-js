# PowerSync + Supabase Angular Demo: Todo List

## Note: Alpha Release

This demo is currently in an alpha release.

## Overview

Demo app demonstrating use of the [PowerSync SDK for Web](https://www.npmjs.com/package/@powersync/web) together with Supabase.

A step-by-step guide on Supabase<>PowerSync integration is available [here](https://docs.powersync.com/integration-guides/supabase-+-powersync).

## Quick Start

1. Run `pnpm install`
2. Create a `.env` file by copying the template `cp .env.template .env`
3. Populate the `.env` file with PowerSync and Supabase details
4. Run `pnpm watch` to build application and check for code changes
5. In a new terminal run `pnpm start` to start the server
6. Go to <http://localhost:8080>

### Notes

- The Angular development server (`pnpm serve`) doesn't support service worker applications
- For Angular, workers need to be configured when instantiating `PowerSyncDatabase`. To do this, copy the worker assets (`pnpm powersync-web copy-assets -o src/assets` - done automatically in this demo for serving and building) and ensure the worker paths are specified ([example here](./src/app/powersync.service.ts)).

## Development Server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code Scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Further Help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
