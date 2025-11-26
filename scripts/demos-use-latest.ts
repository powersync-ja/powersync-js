/**
 * ! If you are trying to restore package.json after running
 * ! 'demos-use-workspace', please run 'demos-use-backup'
 * ! to restore package.json to its original state first.
 *
 * Script to replace demos' workspace packages with latest published
 * versions. Modifies package.json in-place.
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

// Function to replace workspace package versions with latest published versions
const linkDemo = async (demoName: string) => {
  const demoSrc = path.join(demosDir, demoName);
  console.log(`\nUpgrading ${demoName}`);

  // Update package.json
  const packageJsonPath = path.join(demoSrc, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Track changed files
  let changes = 0;
  const updateDeps = (deps: { [key: string]: string }) => {
    for (const dep in deps) {
      const matchingPackage = workspacePackages.find((p) => p.manifest.name === dep);
      if (matchingPackage == undefined) continue;

      let latestVersion = matchingPackage.manifest.version;
      if (!latestVersion) {
        console.error(`Could not find latest version of package '${matchingPackage.manifest.name}'`);
        process.exit(1);
      }
      latestVersion = '^' + latestVersion;
      if (deps[dep] === latestVersion) {
        console.log(`- ${dep}: '${deps[dep]}' => '${latestVersion}' (no changes)`);
        continue;
      }
      console.log(`- ${dep}: '${deps[dep]}' => '${latestVersion}'`);
      deps[dep] = latestVersion;
      changes++;
    }
  };

  if (packageJson.dependencies) {
    updateDeps(packageJson.dependencies);
  }

  if (packageJson.peerDependencies) {
    updateDeps(packageJson.peerDependencies);
  }

  if (packageJson.devDependencies) {
    updateDeps(packageJson.devDependencies);
  }

  if (changes) {
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
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

  console.log('Upgrading demos...');
  for (const demoName of demoNames) {
    linkDemo(demoName);
  }
  console.log('\nDone.');

  if (opts.noInstall) {
    process.exit(0);
  }

  console.log('\nInstalling packages...\n');
  for (const demoName of demoNames) {
    const demoSrc = path.join(demosDir, demoName);
    console.log(`- ${demoName}`);
    try {
      // Patchy solution with rm -rf'ing node_modules because pnpm tries to reuse existing linked package
      execSync('rm -rf node_modules && pnpm --ignore-workspace install', { cwd: demoSrc, stdio: 'inherit' });
    } catch (e) {
      console.error(`Error installing packages: ${e}`);
      process.exit(1);
    }
  }
  console.log('\nDone.');
};

main();
