/**
 * Runs the local self-hosted PowerSync + Convex development stack.
 */
import { concurrently } from 'concurrently';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { ensureConvexAuthEnv } from './utils/convex.ts';
import { color, logError, logStep } from './utils/process.ts';

const DEMO_ROOT = path.resolve(import.meta.dirname, '..');
const CONVEX_DEPLOY_KEY_FILE = path.join(DEMO_ROOT, 'powersync/docker/setup_data/deploy_key');
const CONVEX_SELF_HOSTED_URL = `http://localhost:${process.env.PS_CONVEX_PORT ?? '3210'}`;

async function run() {
  logStep(`Starting ${color.cyan('PowerSync')} and ${color.magenta('Convex')} Docker services...`);
  await runCommand('pnpm', ['powersync', 'docker', 'reset']);

  const convexDeployKey = await readDeployKey();
  const convexEnv = {
    ...process.env,
    CONVEX_SELF_HOSTED_URL,
    CONVEX_SELF_HOSTED_ADMIN_KEY: convexDeployKey
  };

  Object.assign(process.env, {
    CONVEX_SELF_HOSTED_URL,
    CONVEX_SELF_HOSTED_ADMIN_KEY: convexDeployKey
  });

  await ensureConvexAuthEnv(convexEnv);

  logStep(
    `Starting ${color.magenta('Convex')}, ${color.green('Vite')} and ${color.cyan('PowerSync config watcher')}...`
  );
  await runConcurrentServices(convexEnv);
}

async function runConcurrentServices(convexEnv: NodeJS.ProcessEnv) {
  const { result } = concurrently(
    [
      {
        command: 'pnpm convex dev',
        name: color.magenta('convex'),
        env: convexEnv
      },
      {
        command: 'pnpm dev',
        name: color.green('vite'),
        env: process.env
      },
      {
        command: 'node scripts/watch-powersync-config.ts',
        name: color.cyan('powersync-watch'),
        env: process.env
      }
    ],
    {
      killOthersOn: ['failure'],
      killSignal: 'SIGTERM',
      killTimeout: 3_000,
      prefix: '{time} [{name}]',
      successCondition: 'all'
    }
  );

  await result;
}

async function readDeployKey() {
  try {
    const deployKey = (await fs.readFile(CONVEX_DEPLOY_KEY_FILE, 'utf8'))
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1);
    if (!deployKey) {
      throw new Error('Deploy key file was empty.');
    }
    return deployKey;
  } catch (ex) {
    throw new Error(`Could not read Convex deploy key at ${CONVEX_DEPLOY_KEY_FILE}.`, { cause: ex });
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

run().catch((error) => {
  logError(error);
  process.exitCode = 1;
});
