import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from '../package.json' with { type: 'json' };

const version = pkg.version;

const versionTsPath = resolve(fileURLToPath(import.meta.url), '../../src/version.ts');
const source = `// Note: This file gets updated by tool/update_version.js script as part of the Changesets release workflow.
// The update happens in the changesets PR, before the package is built.
export const POWERSYNC_JS_VERSION = '${version}';
`;

writeFileSync(versionTsPath, source);
console.log(`Updated POWERSYNC_JS_VERSION constant to ${version}`);
