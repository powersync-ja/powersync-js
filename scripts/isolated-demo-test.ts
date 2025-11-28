import * as core from '@actions/core';
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

enum TestState {
  PASSED = 'passed',
  FAILED = 'failed',
  WARN = 'warn'
}

type TestResult = {
  state: TestState;
  error?: string;
};

type DemoResult = {
  name: string;
  installResult: TestResult;
  buildResult: TestResult;
};

const displayState = (state: TestState) => {
  switch (state) {
    case TestState.PASSED:
      return `Pass ✅`;
    case TestState.FAILED:
      return `Fail ❌`;
    case TestState.WARN:
      return `Pass ⚠️`;
  }
};

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

// Function to process each demo
const processDemo = async (demoName: string): Promise<DemoResult> => {
  const demoSrc = path.join(demosDir, demoName);
  const demoDest = path.join(tmpDir, demoName);

  console.log(`Processing ${demoName}`);

  console.log(`Demo will be copied to: ${demoDest}`);

  // Copy demo to tmp directory (without node modules)
  await fs.cp(demoSrc, demoDest, { recursive: true, filter: (source) => !source.includes('node_modules') });

  const result: DemoResult = {
    name: demoName,
    installResult: {
      state: TestState.WARN
    },
    buildResult: {
      state: TestState.WARN
    }
  };

  // Run pnpm install and pnpm build
  try {
    execSync('pnpm install', { cwd: demoDest, stdio: 'inherit' });
    result.installResult.state = TestState.PASSED;
  } catch (ex) {
    result.installResult.state = TestState.FAILED;
    result.installResult.error = ex.message;
    return result;
  }

  const packageJSONPath = path.join(demoDest, 'package.json');
  const pkg = JSON.parse(await fs.readFile(packageJSONPath, 'utf-8'));
  if (!pkg.scripts['test:build']) {
    result.buildResult.state = TestState.WARN;
    return result;
  }

  try {
    if (pkg.scripts['prepare:isolated:test']) {
      execSync('pnpm run prepare:isolated:test', { cwd: demoDest, stdio: 'inherit' });
    }

    execSync('pnpm run test:build', { cwd: demoDest, stdio: 'inherit' });
    result.buildResult.state = TestState.PASSED;
  } catch (ex) {
    result.buildResult.state = TestState.FAILED;
    result.buildResult.error = ex.message;
  }

  return result;
};

// Main function to read demos directory and process each demo
const main = async () => {
  const results: DemoResult[] = [];

  try {
    await ensureTmpDirExists();

    const demoNames = await fs.readdir(demosDir);
    for (const demoName of demoNames) {
      try {
        results.push(await processDemo(demoName));
      } catch (ex) {
        results.push({
          name: demoName,
          installResult: {
            state: TestState.FAILED,
            error: ex.message
          },
          buildResult: {
            state: TestState.FAILED
          }
        });
        console.log(`::error file=${demoName},line=1,col=1::${ex}`);
      }
    }
  } catch (err) {
    console.error(`Error processing demos: ${err}`);
    process.exit(1);
  }

  const errored = !!results.find(
    (r) => r.installResult.state == TestState.FAILED || r.buildResult.state == TestState.FAILED
  );

  await core.summary
    .addHeading('Test Results')
    .addTable([
      [
        { data: 'Demo', header: true },
        { data: 'Install', header: true },
        { data: 'Build', header: true }
      ],
      ...results.map((r) => [r.name, displayState(r.installResult.state), displayState(r.buildResult.state)])
    ])
    .write();

  if (errored) {
    console.error(`Some demos did not pass`);
    process.exit(1);
  } else {
    console.log('All demos processed successfully.');
  }
};

main();
