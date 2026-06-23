import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from '../package.json' with { type: 'json' };

const version = pkg.version;

const abstractRemotePath = resolve(fileURLToPath(import.meta.url), '../../src/client/sync/stream/AbstractRemote.ts');
let source = readFileSync(abstractRemotePath, 'utf-8');
source = source.replace(/^const POWERSYNC_JS_VERSION = '.*'/m, `const POWERSYNC_JS_VERSION = '${version}'`);

writeFileSync(abstractRemotePath, source);
console.log(`Updated POWERSYNC_JS_VERSION constant to ${version}`);
