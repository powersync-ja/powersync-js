/**
 * This script is for use by SDK devs who want to test their local
 * package changes against the demo apps.
 *
 * Make sure to add `  - demos/*` to the root pnpm-workspace.yaml.
 * If you want to restore the demos' package.json versions, either run
 * `git restore demos`, or run `pnpm demos:update` if you have made
 * other modifications to the package.json.
 */

import { findWorkspacePackages } from '@pnpm/workspace.find-packages';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const demosDir = path.resolve('demos');

const workspacePackages = await findWorkspacePackages(path.resolve('.'));

// Function to split user-provided demos into found and not found demos
const filterDemos = (allDemos: string[], providedDemos: string[]): [string[], string[]] => {
  const found: string[] = [];
  const notFound: string[] = [];

  providedDemos.forEach((demo) => {
    if (allDemos.includes(demo)) {
      found.push(demo);
    } else {
      notFound.push(demo);
    }
  });

  return [found, notFound];
};

// Function to replace '^x.xx.xx' with 'workspace:*' for workspace packages
const linkDemo = async (demoName: string) => {
  const newPackageVer = 'workspace:*';
  const demoSrc = path.join(demosDir, demoName);
  console.log(`Linking ${demoName}`);

  // Update package.json
  console.log('\nUpdating packages...');
  const packageJsonPath = path.join(demoSrc, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Track changed files
  let changes = false;
  const updateDeps = (deps: { [key: string]: string }) => {
    for (const dep in deps) {
      const matchingPackage = workspacePackages.find((p) => p.manifest.name === dep);
      if (matchingPackage != undefined && deps[dep] != newPackageVer) {
        console.log(`- ${dep}: '${deps[dep]}' => '${newPackageVer}'`);
        deps[dep] = newPackageVer;
        changes = true;
      }
    }
  };

  if (packageJson.dependencies) {
    updateDeps(packageJson.dependencies);
  }

  if (packageJson.peerDependencies) {
    updateDeps(packageJson.devDependencies);
  }

  if (packageJson.devDependencies) {
    updateDeps(packageJson.devDependencies);
  }

  if (changes) {
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
  } else {
    console.log('- No changes');
  }

  // Update tsconfig.json to reference tsconfig.demo.json
  const tsConfigPath = path.join(demoSrc, 'tsconfig.json');

  if (fs.existsSync(tsConfigPath)) {
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));

    const workspaceRef = {
      path: '../../tsconfig.demo.json'
    };

    console.log('Linking tsconfig.demo.json');

    changes = false;
    const references = tsConfig['references'];

    if (references) {
      const existingWorkspaceRef = references.find((v: any) => v.path === '../../tsconfig.demo.json');
      if (existingWorkspaceRef == undefined) {
        tsConfig['references'].push(workspaceRef);
        changes = true;
      }
    } else {
      tsConfig['references'] = [workspaceRef];
      changes = true;
    }

    if (changes) {
      console.log(`- Added '${JSON.stringify(workspaceRef)}'`);
      fs.writeFileSync(tsConfigPath, `${JSON.stringify(tsConfig, null, 2)}\n`, 'utf8');
    } else {
      console.log('- No changes');
    }
  }
};

// Main function to read demos directory and process each demo
const main = () => {
  const args: string[] = [];
  const opts = {
    noInstall: false
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === '--no-install') {
      opts.noInstall = true;
    } else {
      args.push(arg);
    }
  }

  const allDemos = fs.readdirSync(demosDir);
  let demoNames: string[];

  if (args.length > 0) {
    const [foundDemos, notFoundDemos] = filterDemos(allDemos, args);

    if (notFoundDemos.length > 0) {
      console.log('⚠️ Warning: Failed to locate some demos:');
      for (const demo of notFoundDemos) {
        console.log(`- ${demo}`);
      }
    }

    demoNames = foundDemos;
  } else {
    demoNames = allDemos;
  }

  console.log('\nLinking demos...');
  for (const demoName of demoNames) {
    linkDemo(demoName);
  }
  console.log('\nDone.');

  if (opts.noInstall) {
    process.exit(0);
  }

  console.log('\nInstalling packages...');
  try {
    execSync('pnpm install', { stdio: 'inherit' });
  } catch (e) {
    console.error(`Error installing packages: ${e}`);
    process.exit(1);
  }
  console.log('\nDone.');
};

main();
