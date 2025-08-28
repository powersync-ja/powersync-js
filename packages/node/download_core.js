// TODO: Make this a pre-publish hook and just bundle everything
import { createHash } from 'node:crypto';
import * as OS from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { exit } from 'node:process';

// When changing this version, run node download_core.js update_hashes
const version = '0.4.4';
const versionHashes = {
  'powersync_x64.dll': '2887b8ad48b9d05e1b3d89c73d14b170f577151eee73e8787ac67a28cd1cba9f',
  'libpowersync_x64.so': 'c9aa0cfc5d8379d8c697f3ff0c54fe31b66f3a67ae54a7eb9629fd2cba853e9b',
  'libpowersync_aarch64.so': 'e68368b099ee6bb0847e53ef754c8f3f291bf6fb77ce20cd9a73f1378cc3831a',
  'libpowersync_x64.dylib': '69b623c727df11b88ab6b8b7b3c1615815fe4b9738c8f804fc75ab15c3982eed',
  'libpowersync_aarch64.dylib': '3ec92da9c711c52b5e5df82e9ade1e228b3c80a778d6910b83b51cb0d084a7d8'
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
