import fs from 'fs';
import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { createPublicKey, generateKeyPairSync } from 'node:crypto';
import path from 'node:path';

export type ConvexConfig = {
  adminKey: string;
  deploymentName: string;
  cloudPort: number;
  sitePort: number;
};

export type ConvexAuthEnv = {
  JWT_PRIVATE_KEY: string;
  JWKS: string;
};

/**
 * Generates a key-pair for Convex JWT authentication.
 */
export function generateConvexAuthEnv(): ConvexAuthEnv {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  const publicJwk = createPublicKey(privateKey).export({ format: 'jwk' });
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';

  return {
    JWT_PRIVATE_KEY: privateKeyPem,
    JWKS: JSON.stringify({ keys: [publicJwk] })
  };
}

/**
 * A locally running Convex dev instance will expose its deploy key in the filesystem.
 * This fetches that key for use by the PowerSync service.
 */
export function obtainLocalConvexConfig(): ConvexConfig {
  const localConfigPath = path.resolve(import.meta.dirname, '../../.convex/local/default/config.json');
  if (!fs.existsSync(localConfigPath)) {
    throw new Error(
      `Could not find Convex config at ${localConfigPath}. Make sure the Convex service is running locally.`
    );
  }

  const content = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
  return {
    adminKey: content.adminKey,
    deploymentName: content.deploymentName,
    cloudPort: content.ports.cloud,
    sitePort: content.ports.site
  };
}

export function tryObtainLocalConvexConfig() {
  try {
    return obtainLocalConvexConfig();
  } catch {
    return undefined;
  }
}

export async function waitForConvexHealth(convexConfig: ConvexConfig) {
  const response = await fetch(`http://127.0.0.1:${convexConfig.cloudPort}/instance_name`);
  if (!response.ok) {
    throw new Error(`Convex health check failed with status ${response.status}`);
  }
}

export function waitForConvexReadyOutput(convexProcess: ChildProcess) {
  return new Promise<void>((resolve) => {
    let output = '';

    const cleanup = () => {
      convexProcess.stdout?.removeListener('data', checkOutput);
      convexProcess.stderr?.removeListener('data', checkOutput);
    };

    const checkOutput = (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes('Convex functions ready!')) {
        cleanup();
        resolve();
        return;
      }
      output = output.slice(-1_000);
    };

    convexProcess.stdout?.on('data', checkOutput);
    convexProcess.stderr?.on('data', checkOutput);
  });
}

export async function ensureConvexAuthEnv() {
  const existingJwks = await getConvexEnv('JWKS');
  if (existingJwks) {
    console.info(`Convex JWT auth has already been configured!`);
    return;
  }

  console.info(`Configuring Convex auth for JWKS...`);

  const convexAuthEnv = generateConvexAuthEnv();
  await setConvexEnv('JWT_PRIVATE_KEY', convexAuthEnv.JWT_PRIVATE_KEY);
  await setConvexEnv('JWKS', convexAuthEnv.JWKS);
  console.info(`Configured Convex auth for JWKS!`);
}

async function getConvexEnv(key: keyof ConvexAuthEnv) {
  return await new Promise<string | undefined>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const convexEnvProcess = spawn('pnpm', ['convex', 'env', 'get', key], {
      stdio: ['ignore', 'pipe', 'inherit'],
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        CONVEX_AGENT_MODE: 'anonymous'
      }
    });

    convexEnvProcess.stdout?.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    convexEnvProcess.once('error', (error) => {
      reject(new Error(`Convex env get ${key} had an error`, { cause: error }));
    });
    convexEnvProcess.once('exit', (code) => {
      if (code === 0) {
        resolve(
          Buffer.concat(chunks as Uint8Array[])
            .toString('utf8')
            .trim() || undefined
        );
      } else {
        resolve(undefined);
      }
    });
  });
}

async function setConvexEnv(key: keyof ConvexAuthEnv, value: string) {
  await new Promise<void>((resolve, reject) => {
    const convexEnvProcess = spawn('pnpm', ['convex', 'env', 'set', key, '--', value], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        CONVEX_AGENT_MODE: 'anonymous'
      }
    });

    convexEnvProcess.once('error', (error) => {
      reject(new Error(`Convex env set ${key} had an error`, { cause: error }));
    });
    convexEnvProcess.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Convex env set ${key} ended with code ${code}`));
      }
    });
  });
}
