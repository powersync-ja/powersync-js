import { spawn } from 'node:child_process';
import { createPublicKey, generateKeyPairSync } from 'node:crypto';

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

export async function ensureConvexAuthEnv(env: NodeJS.ProcessEnv = process.env) {
  const existingJwtPrivateKey = await getConvexEnv('JWT_PRIVATE_KEY', env);
  const existingJwks = await getConvexEnv('JWKS', env);
  if (existingJwtPrivateKey && existingJwks) {
    console.info(`Convex JWT auth has already been configured!`);
    return;
  }

  console.info(`Configuring Convex auth for JWKS...`);

  const convexAuthEnv = generateConvexAuthEnv();
  await setConvexEnv('JWT_PRIVATE_KEY', convexAuthEnv.JWT_PRIVATE_KEY, env);
  await setConvexEnv('JWKS', convexAuthEnv.JWKS, env);
  console.info(`Configured Convex auth for JWKS!`);
}

async function getConvexEnv(key: keyof ConvexAuthEnv, env: NodeJS.ProcessEnv) {
  return await new Promise<string | undefined>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const convexEnvProcess = spawn('pnpm', ['convex', 'env', 'get', key], {
      stdio: ['ignore', 'pipe', 'inherit'],
      shell: process.platform === 'win32',
      env: {
        ...env
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

async function setConvexEnv(key: keyof ConvexAuthEnv, value: string, env: NodeJS.ProcessEnv) {
  await new Promise<void>((resolve, reject) => {
    const convexEnvProcess = spawn('pnpm', ['convex', 'env', 'set', key, '--', value], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...env
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
