/**
 * This scripts acts as a simple server to get test results from
 * an Android simulator.
 */

const { spawn } = require('child_process');
const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const chalk = require('chalk');
const { program } = require('commander');

const DEFAULT_AVD_NAME = 'Pixel_3a_API_34_extension_level_7_arm64-v8a';
const DEFAULT_SIMULATOR_NAME = 'iPhone 15 Pro Max';
const DEFAULT_PORT = 4243;
const TEST_TIMEOUT = 1_800_000; // 30 minutes

program.name('Test Suite').description('Automates tests for React Native app based tests');

program
  .command('run-android')
  .option(
    '--avdName <name>',
    'The virtual android device name (the adb device name will be fetched from this)',
    DEFAULT_AVD_NAME
  )
  .option('--port', 'Port to run Express HTTP server for getting results on.', DEFAULT_PORT)
  .action(async (str, options) => {
    const opts = options.opts();
    const avdName = opts.avdName;
    const deviceName = await getADBDeviceName(avdName);
    if (!deviceName) {
      throw new Error(`Could not find adb device with AVD name ${avdName}`);
    }

    const port = opts.port;
    /** Expose the Express server on the Android device */
    await spawnP('Reverse Port', `adb`, [`-s`, deviceName, `reverse`, `tcp:${port}`, `tcp:${port}`]);

    /** Build and run the Expo app, don't await this, we will await a response. */
    spawnP('Build Expo App', `yarn`, [`android`, `-d`, avdName]);

    const app = express();
    app.use(bodyParser.json());

    const resultsPromise = receiveResults(app);

    /** Listen for results */
    const server = app.listen(port);
    await resultsPromise;
    server.close();

    console.log('Done with tests');
    process.exit(0);
  });

program
  .command('run-ios')
  .option('--simulatorName <name>', 'The iOS simulator name (e.g., "iPhone 11")', DEFAULT_SIMULATOR_NAME)
  .option('--port', 'Port to run Express HTTP server for getting results on.', DEFAULT_PORT)
  .action(async (str, options) => {
    const opts = options.opts();
    const simulatorName = opts.simulatorName;
    const deviceName = await getSimulatorDeviceName(simulatorName);
    if (!deviceName) {
      throw new Error(`Could not find iOS simulator with name ${simulatorName}`);
    }

    const port = opts.port;
    const app = express();
    app.use(bodyParser.json());

    const resultsPromise = receiveResults(app);

    /** Listen for results */
    const server = app.listen(port);

    /** Build and run the Expo app, don't await this, we will await a response. */
    spawnP('Build Expo App', 'yarn', ['ios']);

    await resultsPromise;
    server.close();

    console.log('Done with tests');
    process.exit(0);
  });

program.parse();

async function spawnP(tag, cmd, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`Executing command: ${cmd} ${args.join(' ')}`);
    const runner = spawn(cmd, args);
    let stdout = '';
    runner.stdout.on('data', (data) => {
      console.log(`[${tag}]: ${data}`);
      stdout += data;
    });
    runner.stderr.on('data', (data) => console.error(`[${tag}]: ${data}`));

    runner.on('exit', (code) => {
      if (!code) {
        return resolve(stdout);
      }
      reject(new Error(`${cmd} failed with code ${code}`));
    });
  });
}

async function getADBDeviceName(avdName) {
  const tag = 'Get ADB Device';
  const devicesOutput = await spawnP(tag, 'adb', ['devices']);
  const deviceNames = _.chain(devicesOutput.split('\n'))
    .slice(1) // Remove output header
    .map((line) => line.split('\t')[0]) // Get name column
    .map((line) => line.trim()) // Omit empty results
    .filter((line) => !!line)
    .value();

  // Need to check all devices for their AVD name
  for (let deviceName of deviceNames) {
    try {
      const deviceAVDNameResponse = await spawnP(tag, `adb`, [`-s`, deviceName, `emu`, `avd`, `name`]);
      const deviceAVDName = deviceAVDNameResponse.split('\n')[0].trim();
      if (deviceAVDName == avdName) {
        return deviceName; // This device has the specified AVD name
      }
    } catch (ex) {
      console.warn(ex);
    }
  }
}

async function getSimulatorDeviceName(simulatorName) {
  try {
    const devicesOutput = await spawnP('List iOS Simulators', 'xcrun', ['simctl', 'list', 'devices', 'x']);
    const deviceNames = _.chain(devicesOutput.split('\n'))
      .map((line) => line.trim())
      .filter((line) => line.startsWith(simulatorName))
      .value();

    if (deviceNames.length > 0) {
      return deviceNames[0];
    } else {
      console.error(`No iOS simulator found with name ${simulatorName}`);
      return null;
    }
  } catch (ex) {
    console.error(ex);
    return null;
  }
}

async function receiveResults(app) {
  return new Promise((resolve, reject) => {
    /**
     * We can receive results from here
     */
    const timeout = setTimeout(() => {
      reject(new Error('Test timed out'));
    }, TEST_TIMEOUT);

    app.post('/results', (req, res) => {
      clearTimeout(timeout);
      const results = req.body;
      displayResults(results);
      if (results.some((r) => r.type == 'incorrect')) {
        reject(new Error('Not all tests have passed'));
      } else {
        resolve(results);
      }

      return res.send('Done');
    });
  });
}

function displayResults(results) {
  for (let result of results) {
    switch (result.type) {
      case 'grouping':
        console.log(chalk.blue(`Group Test Results for: ${result.description}`));
        break;
      case 'correct':
        console.log(chalk.green(`✅ ${result.description}`));
        break;
      case 'incorrect':
        console.log(chalk.red(`❌ ${result.description}`));
        console.log(chalk.red(result.errorMsg));
        break;
    }
  }
}
