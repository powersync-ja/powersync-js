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

/**
 * We use environment variables to trigger tests
 */
const environment = {
  /**
   * ios | android.
   */
  platform: process.env.TEST_PLATFORM ?? 'ios',
  /**
   * The device target id to run on
   */
  target: process.env.TEST_TARGET ?? 'B8960454-43B4-42A4-AEF4-BE74F42B47AC'
};

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
    // Ensure the target app spawning webviews is up-to-date.
    const buildResult = spawnSync('npx', ['cap', 'sync'], {
      stdio: 'inherit',
      cwd: EXAMPLE_APP_DIR
    });
    if (buildResult.status !== 0) {
      throw new Error(`cargo build failed with exit code ${buildResult.status}`);
    }
    // TODO, support other platforms
    const app = spawn('npx', ['cap', 'run', environment.platform, '--target', environment.target], {
      cwd: EXAMPLE_APP_DIR,
      env: {
        ...process.env,
        // The Capacitor App will load this URL on boot
        CAPACITOR_VITEST_SERVER_URL: url
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
