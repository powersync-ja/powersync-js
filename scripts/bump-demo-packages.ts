import { findWorkspacePackages } from '@pnpm/workspace.find-packages';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';

enum ResultType {
  SUCCESS,
  WARNING,
  FAILED
}

type ProcessResult =
  | {
      demoName: string;
      resultType: ResultType.SUCCESS;
    }
  | {
      demoName: string;
      resultType: ResultType.WARNING;
      message: string;
    }
  | {
      demoName: string;
      resultType: ResultType.FAILED;
      message: string;
    };

type Flags = {
  '--ignore-workspace': boolean;
  '--pattern': boolean;
  '--dry-run': boolean;
};

const DEMOS_DIR = 'demos';

const workspacePackages = await findWorkspacePackages(path.resolve('.'), {
  patterns: ['./packages/*']
});

const defaultFlags = (): Flags => {
  return {
    '--ignore-workspace': false,
    '--pattern': false,
    '--dry-run': false
  };
};

const parseArgs = (processArgs: string[]): [string, string[], Flags] => {
  // processArgs[0] == 'node'
  // processArgs[1] == 'bump-demo-package.ts'
  const name: string = processArgs[1];
  const args: string[] = [];
  const flags: Flags = defaultFlags();

  // Boolean flags
  for (const arg of processArgs.slice(2)) {
    if (arg in flags) {
      flags[arg] = true;
    } else {
      args.push(arg);
    }
  }

  return [name, args, flags];
};

let [_programName, programArgs, programOpts]: [string, string[], Flags] = parseArgs(process.argv);

const processDemo = (demoPath: string): ProcessResult => {
  const demoName = path.basename(demoPath);
  const demoSrc = path.resolve(demoPath);

  console.log(`Processing ${demoName}`);
  if (!fs.lstatSync(demoSrc).isDirectory()) {
    return {
      demoName,
      resultType: ResultType.WARNING,
      message: `'${demoSrc}' is not a directory.`
    };
  }

  const packageJsonPath = path.join(demoSrc, 'package.json');
  let packageJson: any;

  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch (e) {
    if (e instanceof SyntaxError) {
      return {
        demoName,
        resultType: ResultType.FAILED,
        message: `Error parsing package.json: ${e.message}`
      };
    }

    if (!('code' in e)) {
      return {
        demoName,
        resultType: ResultType.FAILED,
        message: `Unknown error: ${e}`
      };
    }

    return {
      demoName,
      resultType: ResultType.FAILED,
      message: `Error reading package.json: ${e.message}`
    };
  }

  let result: ProcessResult = {
    demoName,
    resultType: ResultType.SUCCESS
  };
  const processDeps = (deps: [string, string][]) => {
    for (const workspacePackage of workspacePackages) {
      const packageName = workspacePackage.manifest.name!;
      if (packageName in deps) {
        const originalVersion = deps[packageName];
        const latestVersion = '^' + workspacePackage.manifest.version!;

        if (result.resultType !== ResultType.WARNING && originalVersion.startsWith('workspace')) {
          if (!programOpts['--ignore-workspace']) {
            result = {
              demoName,
              resultType: ResultType.WARNING,
              message: `Package '${packageName}' had version '${originalVersion}' which is unexpected.`
            };
          }
        }

        console.log(`> ${packageName}: ${originalVersion} => ${latestVersion}`);
        deps[packageName] = latestVersion;
      }
    }
  };

  if (packageJson.dependencies) {
    processDeps(packageJson.dependencies);
  }

  if (packageJson.peerDependencies) {
    processDeps(packageJson.peerDependencies);
  }

  if (packageJson.devDependencies) {
    processDeps(packageJson.devDependencies);
  }

  if (!programOpts['--dry-run']) {
    try {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    } catch (e) {
      result = {
        demoName,
        resultType: ResultType.FAILED,
        message: `Error writing package.json: ${e.message}`
      };
    }
  }

  console.log('Done\n');
  return result;
};

const main = () => {
  let demos: string[] = [];

  if (programOpts['--pattern']) {
    const pattern = programArgs.join(' ');
    console.log(`Finding demos using pattern '${pattern}'`);

    const process = spawnSync('find', [DEMOS_DIR, '-maxdepth', '1', '-name', pattern], {
      encoding: 'utf8'
    });
    demos = process.stdout.split('\n').filter((d) => d.trim().length > 0);

    console.log('Done\n');
  } else {
    const allDemos = fs.readdirSync(path.resolve('./demos'));
    const givenDemos = programArgs;

    if (givenDemos.length > 0) {
      console.log('Bumping given demos');
      demos = givenDemos;
    } else {
      console.log('Bumping all demos');
      demos = allDemos;
    }

    demos = demos.map((d) => path.join(DEMOS_DIR, d));
  }

  const results = demos.map((demo) => processDemo(demo));

  const warnings = results.filter((r) => r.resultType == ResultType.WARNING);
  const errors = results.filter((r) => r.resultType == ResultType.FAILED);

  if (warnings.length > 0) {
    console.log('Warnings:');
  }

  if (errors.length > 0) {
    console.log('Failures:');
  }
};

main();
