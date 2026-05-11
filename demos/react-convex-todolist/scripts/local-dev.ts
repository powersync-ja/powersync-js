/**
 * A small script which runs the Convex and PowerSync backends locally.
 */
import { concurrently } from 'concurrently';
import { ChildProcess, spawn } from 'node:child_process';
import process from 'node:process';
import {
  type ConvexConfig,
  ensureConvexAuthEnv,
  obtainLocalConvexConfig,
  tryObtainLocalConvexConfig,
  waitForConvexReadyOutput
} from './utils/convex.ts';
import {
  color,
  confirm,
  getPidsForPorts,
  isSafeKillPid,
  logError,
  logStep,
  replayBufferedOutput,
  stopChildProcess,
  waitForPortsToClose
} from './utils/process.ts';

// We need to run the Convex backend first, in order to get the Convex deploy secret.

async function run() {
  await checkForRunningConvexBackend();

  // Start An initial Convex process, this will do initial config if not done yet
  logStep(`${color.yellow('Checking Convex config')} with a temporary startup.`);
  const { convexConfig, convexProcess } = await startConvex();

  try {
    await ensureConvexAuthEnv();
  } finally {
    await stopChildProcess(convexProcess);
    await waitForPortsToClose([convexConfig.cloudPort, convexConfig.sitePort]);
  }

  logStep(
    `Starting ${color.magenta('Convex')}, ${color.cyan('PowerSync')} and ${color.green('Vite')} development servers...`
  );
  await runConcurrentServices({ convexConfig });
}

async function startConvex(): Promise<{ convexConfig: ConvexConfig; convexProcess: ChildProcess }> {
  return new Promise(async (resolve, reject) => {
    // Start Convex backend
    const convexProcess = spawn('pnpm', ['convex', 'dev'], {
      detached: process.platform !== 'win32',
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: {
        ...process.env
      }
    });
    const convexOutput: Buffer[] = [];
    convexProcess.stdout?.on('data', (chunk: Buffer) => {
      convexOutput.push(chunk);
      process.stdout.write(chunk);
    });
    convexProcess.stderr?.on('data', (chunk: Buffer) => {
      convexOutput.push(chunk);
      process.stderr.write(chunk);
    });

    const abortHealthCheck = new AbortController();
    let convexExit: Error | undefined;

    const onExit = (code: number) => {
      abortHealthCheck.abort();
      convexExit = new Error(`Convex development ended with code ${code}`);
      replayBufferedOutput('convex-bootstrap', convexOutput);
      reject(convexExit);
    };
    convexProcess.once('exit', onExit);

    const onError = (error: Error) => {
      abortHealthCheck.abort();
      convexExit = new Error(`Convex dev had an error`, { cause: error });
      replayBufferedOutput('convex-bootstrap', convexOutput);
      reject(convexExit);
    };
    convexProcess.once('error', onError);

    try {
      await waitForConvexReadyOutput(convexProcess);
      if (convexExit) {
        throw convexExit;
      }

      const convexConfig = obtainLocalConvexConfig();

      // Once we have the process, we can stop the listeners above
      convexProcess.removeListener('error', onError);
      convexProcess.removeListener('exit', onExit);
      resolve({ convexConfig, convexProcess });
    } catch (ex) {
      abortHealthCheck.abort();
      replayBufferedOutput('convex-bootstrap', convexOutput);
      reject(ex);
    }
  });
}

async function checkForRunningConvexBackend() {
  const convexConfig = tryObtainLocalConvexConfig();
  if (!convexConfig) {
    return;
  }

  const ports = [convexConfig.cloudPort, convexConfig.sitePort];
  const runningPids = await getPidsForPorts(ports);
  if (runningPids.length === 0) {
    return;
  }

  const formattedPorts = ports.map((port) => color.yellow(String(port))).join(', ');
  const formattedPids = runningPids.map((pid) => color.yellow(String(pid))).join(', ');
  const shouldKill = await confirm(
    `Existing Convex backend detected on ports ${formattedPorts} (PID ${formattedPids}). Kill it and continue?`
  );

  if (!shouldKill) {
    throw new Error(`Convex backend already running on ports ${ports.join(', ')}.`);
  }

  logStep(`Killing existing Convex backend process${runningPids.length === 1 ? '' : 'es'} ${formattedPids}.`);
  for (const pid of runningPids) {
    if (!isSafeKillPid(pid)) {
      throw new Error(`Refusing to kill unsafe PID ${pid}. Stop the process manually and run this command again.`);
    }

    try {
      process.kill(pid, 'SIGTERM');
    } catch (ex) {
      throw new Error(`Failed to kill process ${pid}. Stop it manually and run this command again.`, { cause: ex });
    }
  }

  await waitForPortsToClose(ports);
}

async function runConcurrentServices({ convexConfig }: { convexConfig: ConvexConfig }) {
  const { result } = concurrently(
    [
      {
        command: 'pnpm convex dev',
        name: color.magenta('convex'),
        env: {
          ...process.env,
          CONVEX_AGENT_MODE: 'anonymous'
        }
      },
      {
        command: 'pnpm powersync docker reset',
        name: color.cyan('powersync'),
        env: {
          ...process.env,
          PS_CONVEX_DEPLOY_KEY: convexConfig.adminKey,
          PS_CONVEX_DEPLOYMENT_URL: `http://host.docker.internal:${convexConfig.cloudPort}`
        }
      },
      {
        command: 'pnpm dev',
        name: color.green('vite'),
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

run().catch((error) => {
  logError(error);
  process.exitCode = 1;
});
