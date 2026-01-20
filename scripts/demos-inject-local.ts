import { Command, type OptionValues } from 'commander';
import inquirer from 'inquirer';
import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// dist output lives at tools/local-linking/dist relative to repo root.
// When this script runs from scripts/dist, go two levels up to repo root first.
const LOCAL_LINKING_ROOT = path.resolve(import.meta.dirname, '../../tools/local-linking');
const PNPMFILE_DIST_PATH = path.join(LOCAL_LINKING_ROOT, 'dist/pnpmfile.js');

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

const ensureLocalLinkingBuilt = async () => {
  try {
    await fs.access(PNPMFILE_DIST_PATH);
    return;
  } catch {}

  console.log('Building @powersync/local-linking ...');
  // Run build from repo root
  execSync('pnpm -C tools/local-linking build', {
    cwd: path.resolve(import.meta.dirname, '..', '..'),
    stdio: 'inherit'
  });

  await fs.access(PNPMFILE_DIST_PATH);
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
    const pnpmfileContent = await fs.readFile(PNPMFILE_DIST_PATH, 'utf-8');
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

  await ensureLocalLinkingBuilt();

  const allDemos = await getDemosAll(options);
  let demos: string[];

  if (options.all) {
    demos = allDemos;
  } else if (options.pattern) {
    demos = filterDemosPattern(allDemos, options);
  } else {
    demos = await filterDemosUser(allDemos, options);
  }

  await injectPackagesAll(demos, options);
  if (options.install) {
    await installDemosAll(demos, options);
  }
};

main();
