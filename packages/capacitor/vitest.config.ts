import { spawn, spawnSync } from 'node:child_process';

import { preview } from '@vitest/browser-preview';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { BrowserProvider } from 'vitest/node';

// We can't define serverFactory ourselves because vitest doesn't export the building blocks,
// but it boils down to [this](https://github.com/vitest-dev/vitest/blob/faace1fbe09133fa3641164c1d58538b316a38ee/packages/browser/src/node/index.ts#L25)
// for all browser providers, so we can just take that from any existing provider.
const serverFactory = preview().serverFactory;

/**
 * The same app which will load the Vitest url
 */
const EXAMPLE_APP_DIR = path.resolve(import.meta.dirname, 'example-app');

function requireTestEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. See packages/capacitor/DEVELOP.md for native integration test setup.`);
  }
  return value;
}

/**
 * We use environment variables to trigger tests. See DEVELOP.md for setup instructions.
 */
const environment = {
  /**
   * ios | android.
   */
  platform: requireTestEnvironmentVariable('TEST_PLATFORM'),
  /**
   * The device target id to run on.
   */
  target: requireTestEnvironmentVariable('TEST_TARGET'),
  /**
   * Hostname the app should use to reach the Vitest server. Android emulators use
   * 10.0.2.2 to connect to the host machine instead of the emulator loopback.
   */
  serverHost: process.env.TEST_SERVER_HOST
};

if (environment.platform == 'android' && !environment.serverHost) {
  throw new Error('Missing TEST_SERVER_HOST. See packages/capacitor/DEVELOP.md for Android integration test setup.');
}

function serverUrlForPlatform(url: string): string {
  if (environment.platform != 'android') {
    return url;
  }

  /**
   * For convenience, we replace localhost with 10.0.2.2 on Android,
   * this avoids having to use `adb reverse`.
   */

  const resolvedUrl = new URL(url);
  resolvedUrl.hostname = environment.serverHost ?? resolvedUrl.hostname;
  return resolvedUrl.toString();
}

class CapacitorBrowserProvider implements BrowserProvider {
  get name(): string {
    return 'capacitor';
  }

  get supportsParallelism(): boolean {
    return false;
  }

  getCommandsContext(_sessionId: string): Record<string, unknown> {
    return {};
  }

  async openPage(_sessionId: string, url: string, _options?: { parallel: boolean }) {
    const serverUrl = serverUrlForPlatform(url);

    // Ensure the target app spawning webviews is up-to-date with the current Vitest server URL.
    const buildResult = spawnSync('npx', ['cap', 'sync'], {
      stdio: 'inherit',
      cwd: EXAMPLE_APP_DIR,
      env: {
        ...process.env,
        CAPACITOR_VITEST_SERVER_URL: serverUrl
      }
    });
    if (buildResult.status !== 0) {
      throw new Error(`cap sync failed with exit code ${buildResult.status}`);
    }
    const app = spawn('npx', ['cap', 'run', environment.platform, '--target', environment.target, '--no-sync'], {
      cwd: EXAMPLE_APP_DIR,
      env: {
        ...process.env,
        // The Capacitor App will load this URL on boot. Android emulators use 10.0.2.2 to reach the host.
        CAPACITOR_VITEST_SERVER_URL: serverUrl
      },
      stdio: 'inherit'
    });

    // The process to run the Capacitor app will end once the app starts,
    // we don't keep track of it, but we do fail if the command failed.
    await new Promise<void>((resolve, reject) => {
      app.once('spawn', () => resolve());
      app.once('error', reject);
    });
  }

  async close() {}
}

export default defineConfig({
  server: {
    // Android emulators connect to the host through 10.0.2.2, so Vitest must listen beyond loopback.
    host: '0.0.0.0'
  },
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup/capacitor.ts'],
    isolate: false,
    browser: {
      enabled: true,
      provider: {
        name: 'capacitor-app',
        options: {},
        providerFactory() {
          return new CapacitorBrowserProvider();
        },
        serverFactory
      },
      instances: [
        {
          browser: 'chrome'
        }
      ]
    }
  }
});
