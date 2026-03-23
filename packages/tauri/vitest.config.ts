import { homedir } from 'node:os';
import * as path from 'node:path';
import { ChildProcess, spawn, spawnSync } from 'node:child_process';

import { defineConfig } from 'vitest/config';
import { webdriverio, WebdriverBrowserProvider } from '@vitest/browser-webdriverio';
import { TestProject } from 'vitest/node';

const serverFactory = webdriverio().serverFactory;

class TauriAppBrowserProvider extends WebdriverBrowserProvider {
  #tauriDriver: ChildProcess | undefined;
  #isShuttingDown = false;

  constructor(project: TestProject) {
    super(project, {});
  }

  async #spawnTauriDriver() {
    // Ensure the target app spawning webviews is up-to-date.
    spawnSync('cargo', ['build', '-p', 'test-runner']);

    const driver = spawn(path.resolve(homedir(), '.cargo', 'bin', 'tauri-driver'), [], {
      stdio: [null, process.stdout, process.stderr]
    });

    driver.on('error', (error) => {
      console.log('Tauri driver error', error);
      process.exit(1);
    });
    driver.on('exit', (code) => {
      if (!this.#isShuttingDown) {
        console.log('Tauri driver exited with code', code);
        process.exit(1);
      }
    });
    return driver;
  }

  async openBrowser(): Promise<WebdriverIO.Browser> {
    if (this.#tauriDriver == null) {
      this.#tauriDriver = await this.#spawnTauriDriver();
    }

    const { remote } = await import('webdriverio');
    this.browser = await remote({
      hostname: '127.0.0.1',
      port: 4444,
      capabilities: {
        'tauri:options': {
          application: path.resolve('../../target/debug/test-runner')
        }
      } as any
    });

    return this.browser;
  }

  async close(): Promise<void> {
    this.#isShuttingDown = true;
    await super.close();
    this.#tauriDriver?.kill();
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
        providerFactory(project) {
          return new TauriAppBrowserProvider(project);
        },
        serverFactory
      },
      instances: [
        {
          browser: 'chrome'
        }
      ]
    },
  }
});
