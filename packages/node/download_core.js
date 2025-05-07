// TODO: Make this a pre-publish hook and just bundle everything
import { createHash } from 'node:crypto';
import * as OS from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { exit } from 'node:process';

// When changing this version, run node download_core.js update_hashes
const version = '0.3.14';
const versionHashes = {
  'powersync_x64.dll': 'ba0fda2496878d195ea5530562509cc585fa4702fd308594d0eef6f37060dafe',
  'libpowersync_x64.so': '4cee8675b78af786f26f1e1666367de3d228f584084cca257e879060302c1371',
  'libpowersync_aarch64.so': 'ed4ec55cb29ac4b295dc076de71e4247b08d46db562a53e2875cc47420a97a55',
  'libpowersync_x64.dylib': 'cec6fb04732dd8c9a8ec6c6028b1b996965a0a359b0461d7dd6aa885d6eccddf',
  'libpowersync_aarch64.dylib': '55b60e156c3ddc9e7d6fae273943b94b83481c861676c9bcd1e2cfcea02b0a18'
};

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

const expectedHash = versionHashes[asset];
const destinationPath = path.resolve('lib', destination);

const hashStream = async (input) => {
  for await (const chunk of input.pipe(createHash('sha256')).setEncoding('hex')) {
    return chunk;
  }
};

const hashLocal = async () => {
  try {
    const handle = await fs.open(destinationPath, 'r');
    const input = handle.createReadStream();

    const result = await hashStream(input);
    await handle.close();
    return result;
  } catch {
    return null;
  }
};

const download = async () => {
  if ((await hashLocal()) == expectedHash) {
    console.debug('Local copy is up-to-date, skipping download');
    exit(0);
  }

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

  const hashAfterDownloading = await hashLocal();
  if (hashAfterDownloading != expectedHash) {
    throw `Unexpected hash after downloading (got ${hashAfterDownloading}, expected ${expectedHash})`;
  }
};

const updateReferenceHashes = async () => {
  for (const asset of Object.keys(versionHashes)) {
    const url = `https://github.com/powersync-ja/powersync-sqlite-core/releases/download/v${version}/${asset}`;
    const response = await fetch(url);
    const hash = await hashStream(Readable.fromWeb(response.body));

    console.log(`  '${asset}': '${hash}',`);
  }
};

if (process.argv[process.argv.length - 1] == 'update_hashes') {
  await updateReferenceHashes();
} else {
  await download();
}
