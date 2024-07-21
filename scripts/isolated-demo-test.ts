import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const demosDir = path.resolve('../demos');

const tmpDir = path.resolve(os.tmpdir(), 'temp-demos');

const REGISTRY_PORT = 4873;

// Ensure tmp directory exists
const ensureTmpDirExists = async () => {
  try {
    await fs.mkdir(tmpDir, { recursive: true });
  } catch (err) {
    console.error(`Error creating tmp directory: ${err}`);
  }
};

// Function to update dependencies in package.json
const updateDependencies = async (packageJsonPath: string) => {
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  const updateDeps = async (deps: { [key: string]: string }) => {
    for (const dep in deps) {
      if (deps[dep].startsWith('workspace:')) {
        const version = execSync(`npm show ${dep} version`).toString().trim();
        deps[dep] = `^${version}`;
      }
    }
  };

  if (packageJson.dependencies) {
    await updateDeps(packageJson.dependencies);
  }

  if (packageJson.devDependencies) {
    await updateDeps(packageJson.devDependencies);
  }

  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
};

// Function to process each demo
const processDemo = async (demoName: string) => {
  const demoSrc = path.join(demosDir, demoName);
  const demoDest = path.join(tmpDir, demoName);

  console.log(`Processing ${demoName}`);

  console.log(`Demo will be copied to: ${demoDest}`);

  // Copy demo to tmp directory (without node modules)
  await fs.cp(demoSrc, demoDest, { recursive: true, filter: (source) => !source.includes('node_modules') });

  // Update package.json
  const packageJsonPath = path.join(demoDest, 'package.json');
  await updateDependencies(packageJsonPath);

  execSync(`pnpm set registry http://localhost:${REGISTRY_PORT}/`, { cwd: demoDest, stdio: 'inherit' });

  // Run pnpm install and pnpm build
  execSync('pnpm install', { cwd: demoDest, stdio: 'inherit' });
  execSync('pnpm build', { cwd: demoDest, stdio: 'inherit' });
};

// Main function to read demos directory and process each demo
const main = async () => {
  try {
    await ensureTmpDirExists();

    const demoNames = await fs.readdir(demosDir);
    for (const demoName of demoNames) {
      await processDemo(demoName);
    }

    console.log('All demos processed successfully.');
  } catch (err) {
    console.error(`Error processing demos: ${err}`);
  }
};

main();
