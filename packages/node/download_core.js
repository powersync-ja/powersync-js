// TODO: Make this a pre-publish hook and just bundle everything
import { createHash } from 'node:crypto';
import * as OS from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { exit } from 'node:process';

// When changing this version, run node download_core.js update_hashes
const version = '0.4.6';
const versionHashes = {
  'powersync_x64.dll': '5efaa9ad4975094912a36843cb7b503376cacd233d21ae0956f0f4b42dcb457b',
  'libpowersync_x64.so': 'e9d78620d69d3cf7d57353891fe0bf85b79d326b42c4669b9500b9e610388f76',
  'libpowersync_aarch64.so': '0d84c0dc0134fc89af65724d11e2c45e3c15569c575ecda52d0ec2fa2aeec495',
  'libpowersync_x64.dylib': '9b484eaf361451f7758ca6ad53190a73563be930a8f8a39ccefd29390046ef6c',
  'libpowersync_aarch64.dylib': 'bfb4f1ec207b298aff560f1825f8123d24316edaa27b6df3a17dd49466576b92'
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
