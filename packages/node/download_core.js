// TODO: Make this a pre-publish hook and just bundle everything
import * as OS from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { exit } from 'node:process';

const version = '0.3.14';

const platform = OS.platform();
let destination;
let asset;

if (platform === 'win32') {
  asset = 'powersync_x64.dll';
  destination = 'powersync.dll';
} else if (platform === 'linux') {
  asset = OS.arch() === 'x64' ? 'libpowersync_x64.so' : 'libpowersync_aarch64.so';
  destination = 'libpowersync.so';
} else if (platform === 'darwin') {
  asset = OS.arch() === 'x64' ? 'libpowersync_x64.dylib' : 'libpowersync_aarch64.dylib';
  destination = 'libpowersync.dylib';
}

const destinationPath = path.resolve('lib', destination);
try {
  await fs.access(destinationPath);
  exit(0);
} catch {}

const url = `https://github.com/powersync-ja/powersync-sqlite-core/releases/download/v${version}/${asset}`;
const response = await fetch(url);
if (response.status != 200) {
  throw `Could not download ${url}`;
}

try {
  await fs.access('lib');
} catch {
  await fs.mkdir('lib');
}

const file = await fs.open(destinationPath, 'w');
await finished(Readable.fromWeb(response.body).pipe(file.createWriteStream()));
await file.close();
