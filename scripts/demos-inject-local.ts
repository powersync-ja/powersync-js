import { Command, type OptionValues } from 'commander';
import inquirer from 'inquirer';
import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Paths for the pnpmfile build
// Note: import.meta.dirname resolves to scripts/dist/ when compiled, so we go up one level
const LINKING_DIR = path.resolve(import.meta.dirname, '../linking');
const PNPMFILE_PATH = path.resolve(LINKING_DIR, 'dist/.pnpmfile.cjs');

/**
 * We compile the pnpmfile using Rollup to avoid the chicken-egg problem when doing the first install in a linked workspace.
 * The install script can't depend on other packages since they wont be available in the first install.
 */
const buildPnpmfile = () => {
  console.log('Building pnpmfile...');
  try {
    execSync('npx rollup -c rollup.pnpmfile.config.mjs', {
      cwd: LINKING_DIR,
      stdio: 'pipe'
    });
  } catch (e) {
    console.error('Rollup build failed:');
    console.error(e.stdout?.toString() || '');
    console.error(e.stderr?.toString() || '');
    throw e;
  }
};

const getDemosAll = async (options: OptionValues): Promise<string[]> => {
  const demos = await fs.readdir(path.resolve(options.directory));
  demos.sort();
  return demos;
};

const filterDemosUser = async (allDemos: string[], _options: OptionValues): Promise<string[]> => {
  return (
    await inquirer.prompt<{ demos: string[] }>({
      type: 'checkbox',
      message: 'Select the demos you want to inject into',
      name: 'demos',
      loop: false,
      choices: allDemos.sort().map((demo) => ({ name: demo, value: demo }))
    })
  ).demos;
};

const filterDemosPattern = (demos: string[], options: OptionValues): string[] => {
  return demos.filter((demo) => demo.includes(options.pattern));
};

const injectPackagesAll = async (demos: string[], options: OptionValues) => {
  for (const demo of demos) {
    console.log(`Processing ${demo}`);
    await injectPackages(demo, options);
  }
  console.log('Done');
};

const injectPackages = async (demo: string, options: OptionValues) => {
  const demoSrc = path.resolve(path.join(options.directory, demo));
  const pnpmFilePath = path.join(demoSrc, '.pnpmfile.cjs');

  try {
    const pnpmfileContent = await fs.readFile(PNPMFILE_PATH, 'utf-8');
    await fs.writeFile(pnpmFilePath, pnpmfileContent);
  } catch (e) {
    throw new Error(`Failed to copy pnpmfile to ${pnpmFilePath}: ${e.message}`);
  }
};
const installDemosAll = async (demos: string[], options: OptionValues) => {
  for (const demo of demos) {
    console.log(`Installing ${demo}`);
    await installDemos(demo, options);
  }
  console.log('Done');
};

const installDemos = async (demo: string, options: OptionValues) => {
  const demoSrc = path.resolve(path.join(options.directory, demo));
  try {
    execSync('pnpm install', {
      cwd: demoSrc,
      stdio: 'inherit'
    });
  } catch (e) {
    console.warn(`Warning: 'pnpm install' failed for ${demo}: ${e.message}`);
  }
};

const main = async () => {
  const program = new Command();

  program
    .name('inject-demos')
    .description(
      'Injects local `@powersync` packages into the demos without modifying any tracked files. Useful for development testing.'
    )
    .option('-p, --pattern <pattern>', 'specify a pattern matching which demos to select')
    .option('-d, --directory <path>', 'specify directory to search for demos in', 'demos')
    .option('-a, --all', 'run for all demos non-interactively', false)
    .option('-i, --install', 'run `pnpm install` after injecting', false);

  program.parse();

  if (program.args.length > 0) {
    program.help();
    process.exit(1);
  }
  const options = program.opts();

  const allDemos = await getDemosAll(options);
  let demos: string[];

  if (options.all) {
    demos = allDemos;
  } else if (options.pattern) {
    demos = filterDemosPattern(allDemos, options);
  } else {
    demos = await filterDemosUser(allDemos, options);
  }

  // Build the pnpmfile before injecting
  buildPnpmfile();

  await injectPackagesAll(demos, options);
  if (options.install) {
    await installDemosAll(demos, options);
  }
};

main();
