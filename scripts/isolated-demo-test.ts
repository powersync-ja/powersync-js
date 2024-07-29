import { findWorkspacePackages } from '@pnpm/workspace.find-packages';
import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import os from 'os';
import * as path from 'path';

/**
 * There can sometimes be differences between running/building demos
 * inside and outside of the monorepo. This script will copy each demo
 * to a temporary project which has its dependencies installed and its
 * `build` script executed.
 */
const demosDir = path.resolve('demos');

const tmpDir = path.resolve(os.tmpdir(), 'temp-demos');

// Ensure tmp directory exists
const ensureTmpDirExists = async () => {
  try {
    await fs.mkdir(tmpDir, { recursive: true });
  } catch (err) {
    console.error(`Error creating tmp directory: ${err}`);
  }
};

const workspacePackages = await findWorkspacePackages(path.resolve('.'));

// Function to update dependencies in package.json
const updateDependencies = async (packageJsonPath: string) => {
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  const updateDeps = async (deps: { [key: string]: string }) => {
    for (const dep in deps) {
      if (deps[dep].startsWith('workspace:')) {
        const matchingPackage = workspacePackages.find((p) => p.manifest.name == dep);
        deps[dep] = `^${matchingPackage!.manifest.version!}`;
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

  // Run pnpm install and pnpm build
  execSync('pnpm install', { cwd: demoDest, stdio: 'inherit' });
  execSync('pnpm run --if-present test:build', { cwd: demoDest, stdio: 'inherit' });
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
    process.exit(1);
  }
};

main();
