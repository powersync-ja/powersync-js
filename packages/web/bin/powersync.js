#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();
const path = require('path');
const fsPromise = require('fs/promises');
const { version } = require('../package.json');

program.name('powersync-web').description('CLI for PowerSync Web SDK utilities').version(version);

program
  .command('copy-assets')
  .description('Copy assets to the specified output directory')
  .option('-o, --output <directory>', 'output directory for assets', 'public')
  .action(async (options) => {
    const outputDir = options.output;

    console.log(`Target directory: ${outputDir}`);

    const cwd = process.cwd();
    const source = path.join(cwd, 'node_modules', '@powersync', 'web', 'dist');
    const destination = path.join(cwd, outputDir, '@powersync');

    await fsPromise.rm(destination, { recursive: true, force: true }); // Clear old assets

    await copyDirectory(source, destination);
  });

program.parse(process.argv);

async function copyDirectory(source, destination) {
  try {
    await fsPromise.cp(source, destination, { recursive: true });
    console.log(`Assets copied from ${source} to ${destination}`);
  } catch (err) {
    console.error(`Error copying assets: ${err.message}`);
    process.exit(1);
  }
}
