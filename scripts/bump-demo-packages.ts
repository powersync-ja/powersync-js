import { Command, type OptionValues } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { findWorkspacePackages } from '@pnpm/workspace.find-packages';

enum ProcessStatus {
  SUCCESS,
  WARNING,
  ERROR
}

type ProcessResult =
  | {
      demoName: string;
      status: ProcessStatus.SUCCESS;
    }
  | {
      demoName: string;
      status: ProcessStatus.WARNING;
      errors: string[];
    }
  | {
      demoName: string;
      status: ProcessStatus.ERROR;
      errors: string[];
    };

const displayStatus = (status: ProcessStatus): string => {
  switch (status) {
    case ProcessStatus.SUCCESS:
      return '✅ Success';
    case ProcessStatus.WARNING:
      return '🚧 Warning';
    case ProcessStatus.ERROR:
      return '🚫  Error ';
  }
};

const displayResults = (results: ProcessResult[]) => {
  let errored = false;

  const data = results.map((r) => {
    errored = errored || r.status === ProcessStatus.ERROR;
    const errors: string | null =
      r.status === ProcessStatus.SUCCESS ? null : r.errors.map((e) => e.slice(0, 40)).join('\n');
    return {
      demo: r.demoName,
      status: displayStatus(r.status),
      errors
    };
  });

  console.table(data, ['status', 'demo', 'errors']);

  return errored;
};

const workspacePackages = await findWorkspacePackages(path.resolve('.'), {
  patterns: ['./packages/*']
});

const resolveDemos = async (): Promise<string[]> => {
  const demos = await fs.readdir('./demos');
  return demos.sort();
};

const chooseDemos = async (demos: string[]): Promise<string[]> => {
  const choices = demos.map((d) => ({ name: d, value: d }));
  const result = await inquirer.prompt({
    type: 'checkbox',
    message: 'Select the demos you want to version',
    name: 'demos',
    loop: false,
    choices
  });
  return result.demos;
};

const processDemos = async (demos: string[], options: OptionValues): Promise<ProcessResult[]> => {
  const results = [];
  for (const demo of demos) {
    console.log(`\n> \x1b[1m${demo}\x1b[0m`);

    const result = await processDemo(demo, options);
    if (result.status !== ProcessStatus.SUCCESS) {
      const prefix =
        result.status === ProcessStatus.WARNING ? '\x1b[1;33m[WARNING]\x1b[0m: ' : '\x1b[1;31m[ERROR]\x1b[0m: ';
      result.errors.forEach((e) => console.error(prefix + e));
    }
    results.push(result);
  }

  return results;
};

const processDemo = async (demoName: string, options: OptionValues): Promise<ProcessResult> => {
  const demoSrc = path.resolve(path.join('demos', demoName));

  if (!(await fs.lstat(demoSrc)).isDirectory()) {
    return {
      demoName,
      status: ProcessStatus.ERROR,
      errors: [`./demos/${demoName} is not a directory.`]
    };
  }

  const packageJsonPath = path.join(demoSrc, 'package.json');
  let packageJson: any;

  try {
    packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  } catch (e) {
    return {
      demoName,
      status: ProcessStatus.ERROR,
      errors: [`Error reading package.json: ${e}`]
    };
  }

  let packagesFound = 0;
  const processDeps = (deps: { [_: string]: string }) => {
    workspacePackages.forEach((pkg) => {
      const pkgName = pkg.manifest.name!;
      if (!(pkgName in deps)) return;
      packagesFound++;

      const currentVersion = deps[pkgName];
      const latestVersion = '^' + pkg.manifest.version!;

      console.log(`${pkgName}: ${currentVersion} => ${latestVersion}`);
      deps[pkgName] = latestVersion;
    });
  };

  if (packageJson.dependencies) processDeps(packageJson.dependencies);
  if (packageJson.devDependencies) processDeps(packageJson.devDependencies);

  if (packagesFound === 0) {
    return {
      demoName,
      status: ProcessStatus.WARNING,
      errors: [`No workspace packages found`]
    };
  }

  if (!options.dryRun) {
    try {
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    } catch (e) {
      return {
        demoName,
        status: ProcessStatus.ERROR,
        errors: [`Failed to write package.json: ${e}`]
      };
    }
  }

  return {
    demoName,
    status: ProcessStatus.SUCCESS
  };
};

const main = async () => {
  const program = new Command();
  program
    .option('--dry-run', 'resolve version changes without applying', false)
    .option('--all', 'run for all demos non-interactively', false);
  program.parse();
  const options = program.opts();

  const allDemos = await resolveDemos();
  const userDemos = options.all ? allDemos : await chooseDemos(allDemos);

  const results = await processDemos(userDemos, options);
  const failed = displayResults(results);
  if (failed) {
    console.error('Not all demos succeeded.');
    process.exit(1);
  }
  console.log('All demos succeeded.');
};

main();
