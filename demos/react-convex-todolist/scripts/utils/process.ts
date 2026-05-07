import { execFile } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';
import readline from 'node:readline/promises';

export const color = {
  blue: (value: string) => `\x1b[34m${value}\x1b[0m`,
  bold: (value: string) => `\x1b[1m${value}\x1b[0m`,
  cyan: (value: string) => `\x1b[36m${value}\x1b[0m`,
  green: (value: string) => `\x1b[32m${value}\x1b[0m`,
  magenta: (value: string) => `\x1b[35m${value}\x1b[0m`,
  red: (value: string) => `\x1b[31m${value}\x1b[0m`,
  yellow: (value: string) => `\x1b[33m${value}\x1b[0m`
};

export function logStep(message: string) {
  console.info(`${color.blue(color.bold('[local-dev]'))} ${message}`);
}

export function logError(error: unknown) {
  console.error(
    `${color.red(color.bold('[local-dev:error]'))} ${error instanceof Error ? error.stack : String(error)}`
  );
}

export function replayBufferedOutput(label: string, chunks: Buffer[]) {
  if (chunks.length === 0) {
    return;
  }

  console.error(`${color.red(color.bold(`[${label}]`))} buffered output:`);
  console.error(
    Buffer.concat(chunks as Uint8Array[])
      .toString('utf8')
      .trim()
  );
}

export async function confirm(question: string) {
  if (!process.stdin.isTTY) {
    return false;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const answer = await rl.question(`${color.blue(color.bold('[local-dev]'))} ${question} ${color.bold('[y/N]')} `);
    return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

export async function getPidsForPorts(ports: number[]) {
  const pidLists = await Promise.all(ports.map((port) => getPidsForPort(port)));
  return [...new Set(pidLists.flat())].filter(isSafeKillPid);
}

async function getPidsForPort(port: number) {
  return await new Promise<number[]>((resolve, reject) => {
    execFile('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], (error, stdout) => {
      if (error) {
        if ('code' in error && error.code === 1) {
          resolve([]);
        } else {
          reject(error);
        }
        return;
      }

      resolve(
        stdout
          .split(/\r?\n/)
          .map((pid) => pid.trim())
          .filter((pid) => pid.length > 0)
          .map((pid) => Number(pid))
          .filter(isSafeKillPid)
      );
    });
  });
}

export function isSafeKillPid(pid: number) {
  return Number.isInteger(pid) && pid > 1 && pid !== process.pid && pid !== process.ppid;
}

export async function stopChildProcess(childProcess: ChildProcess) {
  if (childProcess.exitCode !== null || childProcess.killed) {
    return;
  }

  await new Promise<void>((resolve) => {
    childProcess.once('exit', () => resolve());
    killChildProcessTree(childProcess, 'SIGTERM');
  });
}

function killChildProcessTree(childProcess: ChildProcess, signal: NodeJS.Signals) {
  if (!childProcess.pid) {
    return;
  }

  if (process.platform === 'win32') {
    childProcess.kill(signal);
    return;
  }

  try {
    process.kill(-childProcess.pid, signal);
  } catch {
    childProcess.kill(signal);
  }
}

export async function waitForPortsToClose(ports: number[]) {
  const timeoutAt = Date.now() + 10_000;

  while (Date.now() < timeoutAt) {
    const openPorts = await getOpenPorts(ports);
    if (openPorts.length === 0) {
      return;
    }

    await sleep(250);
  }

  throw new Error(`Ports did not close in time: ${ports.join(', ')}`);
}

async function getOpenPorts(ports: number[]) {
  const checks = await Promise.all(ports.map(async (port) => ((await isPortOpen(port)) ? port : undefined)));
  return checks.filter((port): port is number => port !== undefined);
}

async function isPortOpen(port: number) {
  return await new Promise<boolean>((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
