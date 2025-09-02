// TODO: Make this a pre-publish hook and just bundle everything
import { createHash } from 'node:crypto';
import * as OS from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { exit } from 'node:process';

// When changing this version, run node download_core.js update_hashes
const version = '0.4.5';
const versionHashes = {
  'powersync_x64.dll': '0e9e47f7265257c9f8f7416a1b5ddf91d82199ff88760b595ff6cb1776231489',
  'libpowersync_x64.so': '6421d9b280604ca4497b99949e3de24c4245b24105dee5c1e86500942ee27a17',
  'libpowersync_aarch64.so': 'fda0951274d5ce623b19a32dee6473597cd401f898f871062421557b2c36936a',
  'libpowersync_x64.dylib': '7337dcf21295d293dd073254014386a7e7809a3bb9acec0362158581c5ab3cdb',
  'libpowersync_aarch64.dylib': '7d54da7b57f76eb5fd5286151d8f4f75f3ebc9d60e66391a0e6c5cca2ee5c5bc'
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
