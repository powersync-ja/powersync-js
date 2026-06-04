import * as path from 'node:path';
import { ChildProcess, spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';

import { defineConfig } from 'vitest/config';
import { preview } from '@vitest/browser-preview';
import { BrowserProvider } from 'vitest/node';

// We can't define serverFactory ourselves because vitest doesn't export the building blocks,
// but it boils down to [this](https://github.com/vitest-dev/vitest/blob/faace1fbe09133fa3641164c1d58538b316a38ee/packages/browser/src/node/index.ts#L25)
// for all browser providers, so we can just take that from any existing provider.
const serverFactory = preview().serverFactory;
const testRunnerExecutable = path.resolve('../../target/debug/test-runner');

class TauriBrowserProvider implements BrowserProvider {
  #tauriApp?: ChildProcess;
  #isClosing = false;

  get name(): string {
    return 'tauri';
  }

  get supportsParallelism(): boolean {
    return false;
  }

  getCommandsContext(_sessionId: string): Record<string, unknown> {
    return {};
  }

  async openPage(_sessionId: string, url: string, options: { parallel: boolean }) {
    if (this.#tauriApp != null) {
      throw new Error('TODO: Calling openPage multiple times is not supported');
    }

    console.log('openPage', url, options);
    // Ensure the target app spawning webviews is up-to-date.
    const buildResult = spawnSync('cargo', ['build', '-p', 'test-runner'], { stdio: 'inherit' });
    if (buildResult.status !== 0) {
      throw new Error(`cargo build failed with exit code ${buildResult.status}`);
    }
    const app = spawn(testRunnerExecutable, [url], { env: { RUST_LOG: 'info', ...process.env } });
    this.#tauriApp = app;

    app.on('exit', (code) => {
      if (!this.#isClosing) {
        console.log('Test runner exited with code', code);
        process.exit(1);
      }
    });

    createInterface(app.stdout).on('line', (line) => console.log(`[Test process]: ${line}`));
    createInterface(app.stderr).on('line', (line) => console.error(`[Test process]: ${line}`));

    await new Promise<void>((resolve, reject) => {
      app.once('spawn', () => {
        console.info(`Child process spawned, pid ${app.pid}`);
        resolve();
      });
      app.once('error', (e) => {
        console.error('Failed to spawn child process', e);
        reject(e);
      });
    });
  }

  async close() {
    this.#isClosing = true;
    this.#tauriApp?.kill();
  }
}

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    isolate: false,
    browser: {
      enabled: true,
      provider: {
        name: 'tauri-app',
        options: {},
        providerFactory() {
          return new TauriBrowserProvider();
        },
        serverFactory
      },
      instances: [
        {
          browser: 'chromium'
        }
      ]
    }
  }
});
