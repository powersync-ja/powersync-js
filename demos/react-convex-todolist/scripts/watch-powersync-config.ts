/**
 * Watches PowerSync config files and resets the local Docker stack on changes.
 */
import chokidar from 'chokidar';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { color, logError, logStep } from './utils/process.ts';

const DEMO_ROOT = path.resolve(import.meta.dirname, '..');
const WATCHED_FILES = ['powersync/service.yaml', 'powersync/sync-config.yaml'].map((filePath) =>
  path.join(DEMO_ROOT, filePath)
);

let resetRunning = false;
let resetQueued = false;
let debounceTimer: NodeJS.Timeout | undefined;

function run() {
  logStep(`Watching ${WATCHED_FILES.map((filePath) => color.yellow(path.relative(DEMO_ROOT, filePath))).join(', ')}.`);

  chokidar
    .watch(WATCHED_FILES, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 250,
        pollInterval: 50
      }
    })
    .on('change', queueReset)
    .on('error', logError);
}

function queueReset(filePath: string) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    logStep(`${color.yellow(path.relative(DEMO_ROOT, filePath))} changed. Resetting PowerSync Docker services...`);
    void resetPowerSync();
  }, 250);
}

async function resetPowerSync() {
  if (resetRunning) {
    resetQueued = true;
    return;
  }

  resetRunning = true;
  try {
    // First validate
    await runCommand('pnpm', ['powersync', 'validate']);
    await runCommand('pnpm', ['powersync', 'docker', 'reset']);
  } catch (error) {
    logError(error);
  } finally {
    resetRunning = false;
  }

  if (resetQueued) {
    resetQueued = false;
    await resetPowerSync();
  }
}

async function runCommand(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const childProcess = spawn(command, args, {
      cwd: DEMO_ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    childProcess.once('error', (error) => reject(error));
    childProcess.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} ended with code ${code}`));
      }
    });
  });
}

run();
