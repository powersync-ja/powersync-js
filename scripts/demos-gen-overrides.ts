/**
 * Script to move tsconfig.json's 'references' field into a 'tsconfig.override.json' file.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const demosDir = path.resolve('demos');

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
  console.log(`\nProcessing ${demoName}`);

  // Update tsconfig.json using tsconfig.override.json
  const tsConfigPath = path.join(demoSrc, 'tsconfig.json');
  const tsConfigOverridePath = path.join(demoSrc, 'tsconfig.override.json');

  const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
  let tsConfigOverride = {};
  if (fs.existsSync(tsConfigOverridePath)) {
    tsConfigOverride = JSON.parse(fs.readFileSync(tsConfigOverridePath, 'utf8'));
  }

  const fieldsToRemove = ['references'];

  let changes = 0;
  for (const field of fieldsToRemove) {
    if (tsConfig.hasOwnProperty(field)) {
      tsConfigOverride[field] = tsConfig[field];
      delete tsConfig[field];
      changes++;
    }
  }

  if (changes) {
    fs.writeFileSync(tsConfigPath, `${JSON.stringify(tsConfig, null, 2)}\n`, 'utf8');
    fs.writeFileSync(tsConfigOverridePath, `${JSON.stringify(tsConfigOverride, null, 2)}\n`, 'utf8');
  } else {
    console.log('- No changes');
  }
};

// Main function to read demos directory and process each demo
const main = () => {
  const args: string[] = process.argv.slice(2);

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
};

main();
