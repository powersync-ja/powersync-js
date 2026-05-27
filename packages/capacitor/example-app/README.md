# PowerSync Capacitor Example App

This app is a minimal Capacitor host for the `@powersync/capacitor` package. It is used as the native app shell for the package's Vitest browser integration tests: Vitest starts a browser test server, then the custom provider launches this app and points the WebView at that server.

The `ios/` and `android/` folders are committed intentionally. Capacitor treats them as app source folders, and they contain native configuration such as `Info.plist`, `AndroidManifest.xml`, plugin setup, and platform-specific project files.

## Refresh Native Projects

After changing Capacitor config, native dependencies, or plugin setup, refresh the native projects:

```bash
pnpm exec cap sync ios
pnpm exec cap sync android
```

See `../DEVELOP.md` for the full native integration test workflow.
