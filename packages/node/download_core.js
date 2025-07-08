// TODO: Make this a pre-publish hook and just bundle everything
import { createHash } from 'node:crypto';
import * as OS from 'node:os';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { exit } from 'node:process';

// When changing this version, run node download_core.js update_hashes
const version = '0.4.2';
const versionHashes = {
  'powersync_x64.dll': '1106ea05b6c5671cb273300ba0712382a4b7f93b925d0d3640993ea6adab1415',
  'libpowersync_x64.so': '9a6c8b501ffa1cc1e41c8ccf3859e1263da8699ba125196e853b792b0c8932a5',
  'libpowersync_aarch64.so': '790f668982ffadff838bc3340a7a60464b10f060ea4eeb78a2c51a0bb930121e',
  'libpowersync_x64.dylib': 'e3886580a4f2aa5ecfc6bd9a09e478c525fb35c88c7983ebc65039d253caf2f0',
  'libpowersync_aarch64.dylib': '93f559a2eb181f7b97c8a56386b098fcc15f3b11169516c58598d8930ebce92b'
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
