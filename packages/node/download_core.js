import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';

// When changing this version, run node download_core.js update_hashes
const version = '0.5.2';
const versionHashes = {
  'powersync_x64.dll': '95b1aa81b5307793fcf5ef4d0982f38076e14cdd7b97ea1a84faa545af0b74db',
  'powersync_x86.dll': '215d4aa2a08972dea7cbc91c316c111c2968ec47bd40865a78237b649d8d2e9a',
  'powersync_aarch64.dll': '42a66fff06b2c927c60c78941ff8c069ad878761a46802a13dc33b9d503f6589',
  'libpowersync_x86.linux.so': '3be78268b546796c5e8983d37b3c4b28e2c6d2a5c4ec21757164c0d6b7bc11f8',
  'libpowersync_x64.linux.so': 'e3288d3e1e2bfc5ccee4fb66d5afb9c691e7da7010b3a561892857a922659819',
  'libpowersync_aarch64.linux.so': '50817891679aa5598009119aa6cf00561e28c04078c6045c109281cf32bcf747',
  'libpowersync_armv7.linux.so': 'c0028d3536fdd8684c6be20988d7edf91eb290da0b53a6f3b6752c3f0462daa7',
  'libpowersync_riscv64gc.linux.so': 'c636d46f0e591953e37e306efd8c055b44216fb019733cbdae718d70387b6042',
  'libpowersync_x64.macos.dylib': '53359ad66f31160795cf2728b1125567593bb00bd62197372fca8e461040abce',
  'libpowersync_aarch64.macos.dylib': 'a3a37b9f346a7d12717149209f01c5f580a2ee3471b37bcdfa59a324834fd698'
};

const assets = Object.keys(versionHashes);

const hashStream = async (input) => {
  for await (const chunk of input.pipe(createHash('sha256')).setEncoding('hex')) {
    return chunk;
  }
};

const hashLocal = async (filePath) => {
  try {
    const handle = await fs.open(filePath, 'r');
    const input = handle.createReadStream();

    const result = await hashStream(input);
    await handle.close();
    return result;
  } catch {
    return null;
  }
};

const downloadAsset = async (asset) => {
  const destinationPath = path.resolve('lib', asset);
  const expectedHash = versionHashes[asset];

  // Check if file exists and has correct hash
  const currentHash = await hashLocal(destinationPath);
  if (currentHash == expectedHash) {
    console.debug(`${asset} is up-to-date, skipping download`);
    return;
  }

  const url = `https://github.com/powersync-ja/powersync-sqlite-core/releases/download/v${version}/${asset}`;
  console.log(`Downloading ${url}`);
  const response = await fetch(url);
  if (response.status != 200) {
    throw `Could not download ${url}`;
  }

  const file = await fs.open(destinationPath, 'w');
  await finished(Readable.fromWeb(response.body).pipe(file.createWriteStream()));
  await file.close();

  const hashAfterDownloading = await hashLocal(destinationPath);
  if (hashAfterDownloading != expectedHash) {
    throw `Unexpected hash after downloading ${asset} (got ${hashAfterDownloading}, expected ${expectedHash})`;
  }
  console.log(`Successfully downloaded ${asset}`);
};

const checkAsset = async (asset) => {
  const destinationPath = path.resolve('lib', asset);
  const expectedHash = versionHashes[asset];
  const currentHash = await hashLocal(destinationPath);

  return {
    asset,
    destinationPath,
    expectedHash,
    currentHash,
    exists: currentHash !== null,
    isValid: currentHash == expectedHash
  };
};

const download = async () => {
  try {
    await fs.access('lib');
  } catch {
    await fs.mkdir('lib');
  }

  // First check all assets
  console.log('Checking existing files...');
  const checks = await Promise.all(assets.map((asset) => checkAsset(asset, asset)));

  const toDownload = checks.filter((check) => !check.isValid);
  const upToDate = checks.filter((check) => check.isValid);

  // Print summary
  if (upToDate.length > 0) {
    console.log('\nUp-to-date files:');
    for (const check of upToDate) {
      console.log(`  ✓ ${check.asset}`);
    }
  }

  if (toDownload.length > 0) {
    console.log('\nFiles to download:');
    for (const check of toDownload) {
      if (!check.exists) {
        console.log(`  • ${check.asset} (missing)`);
      } else {
        console.log(`  • ${check.asset} (hash mismatch)`);
      }
    }

    console.log('\nStarting downloads...');
    await Promise.all(toDownload.map((check) => downloadAsset(check.asset)));

    console.log('\nAll downloads completed successfully!');
  } else {
    console.log('\nAll files are up-to-date, nothing to download.');
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
