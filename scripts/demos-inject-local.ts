import { Command, type OptionValues } from 'commander';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import inquirer from 'inquirer';
import { findWorkspacePackages } from '@pnpm/workspace.find-packages';

// Get workspace packages and create a mapping from package name to local path
const workspacePackages = await findWorkspacePackages(path.resolve('.'), {
  patterns: ['./packages/*']
});
const packagePaths = {};
workspacePackages.forEach((pkg) => {
  const pkgName = pkg.manifest.name!;
  if (pkgName.startsWith('@powersync/')) {
    packagePaths[pkgName] = pkg.rootDirRealPath;
  }
});

// Intercepts the resolution of `@powersync/*` packages (plus peer dependencies) and
// replaces them with local versions.
const PNPMFILE_CJS = `const fs = require("fs");
const path = require("path");

const localPaths = ${JSON.stringify(packagePaths)};
const getLocalPath = (name) => localPaths[name];

module.exports = {
  hooks: {
    readPackage(pkg) {
      const injectPeers = (manifestPath) => {
        try {
          const content = fs.readFileSync(manifestPath, "utf-8");
          const localPkg = JSON.parse(content);
          if (localPkg.peerDependencies) {
            pkg.dependencies = pkg.dependencies || {};
            Object.keys(localPkg.peerDependencies).forEach((peer) => {
              if (peer.startsWith("@powersync/")) {
                // Force install the peer dependency pointing to local
                pkg.dependencies[peer] = \`file:\${getLocalPath(peer)}\`;
              }
            });
          }
        } catch (e) {
          // Ignore missing files or parse errors
        }
      };

      const scanDeps = (deps) => {
        if (!deps) return;
        Object.keys(deps).forEach((dep) => {
          if (dep.startsWith("@powersync/")) {
            const relPath = getLocalPath(dep);
            
            // 1. Point the direct dependency to the local file
            deps[dep] = \`file:\${relPath}\`;

            // 2. Read that local file to find and install its peers
            injectPeers(path.resolve(process.cwd(), relPath, "package.json"));
          }
        });
      };

      scanDeps(pkg.dependencies);
      scanDeps(pkg.devDependencies);

      return pkg;
    },
  },
};
`;

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
  return demos.filter((demo) => demo.includes(options.filter));
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
    // Default to 'wx' to prevent overwriting existing files
    const writeFileOpts = options.force ? undefined : { flag: 'wx' };
    await fs.writeFile(pnpmFilePath, PNPMFILE_CJS, writeFileOpts);
  } catch (e) {
    if (e.code) {
      if (e.code === 'EEXIST') {
        console.warn(`Warning: File '${pnpmFilePath}' exists, skipping write.`);
        return;
      }
    }

    throw new Error('Unknown error:', e);
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
    .option('-i, --install', 'run `pnpm install` after injecting', false)
    .option('-f, --force', 'overwrite existing `.pnpmfile.cjs` files if found', false);

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

  await injectPackagesAll(demos, options);
  if (options.install) {
    await installDemosAll(demos, options);
  }
};

main();
