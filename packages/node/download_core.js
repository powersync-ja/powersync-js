import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';

// When changing this version, run node download_core.js update_hashes
const version = '0.4.6';
const versionHashes = {
  'powersync_x64.dll': '5efaa9ad4975094912a36843cb7b503376cacd233d21ae0956f0f4b42dcb457b',
  'libpowersync_x64.so': 'e9d78620d69d3cf7d57353891fe0bf85b79d326b42c4669b9500b9e610388f76',
  'libpowersync_aarch64.so': '0d84c0dc0134fc89af65724d11e2c45e3c15569c575ecda52d0ec2fa2aeec495',
  'libpowersync_x64.dylib': '9b484eaf361451f7758ca6ad53190a73563be930a8f8a39ccefd29390046ef6c',
  'libpowersync_aarch64.dylib': 'bfb4f1ec207b298aff560f1825f8123d24316edaa27b6df3a17dd49466576b92'
};

// Map of all assets to their destinations
const assetMap = {
  'powersync_x64.dll': 'powersync.dll',
  'libpowersync_x64.so': 'libpowersync.so',
  'libpowersync_aarch64.so': 'libpowersync-aarch64.so',
  'libpowersync_x64.dylib': 'libpowersync.dylib',
  'libpowersync_aarch64.dylib': 'libpowersync-aarch64.dylib'
};

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

const downloadAsset = async (asset, destination) => {
  const destinationPath = path.resolve('lib', destination);
  const expectedHash = versionHashes[asset];

  // Check if file exists and has correct hash
  const currentHash = await hashLocal(destinationPath);
  if (currentHash === expectedHash) {
    console.debug(`${destination} is up-to-date, skipping download`);
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
  console.log(`Successfully downloaded ${destination}`);
};

const checkAsset = async (asset, destination) => {
  const destinationPath = path.resolve('lib', destination);
  const expectedHash = versionHashes[asset];
  const currentHash = await hashLocal(destinationPath);

  return {
    asset,
    destination,
    destinationPath,
    expectedHash,
    currentHash,
    exists: currentHash !== null,
    isValid: currentHash === expectedHash
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
  const checks = await Promise.all(
    Object.entries(assetMap).map(([asset, destination]) => checkAsset(asset, destination))
  );

  const toDownload = checks.filter((check) => !check.isValid);
  const upToDate = checks.filter((check) => check.isValid);

  // Print summary
  if (upToDate.length > 0) {
    console.log('\nUp-to-date files:');
    for (const check of upToDate) {
      console.log(`  ✓ ${check.destination}`);
    }
  }

  if (toDownload.length > 0) {
    console.log('\nFiles to download:');
    for (const check of toDownload) {
      if (!check.exists) {
        console.log(`  • ${check.destination} (missing)`);
      } else {
        console.log(`  • ${check.destination} (hash mismatch)`);
      }
    }

    console.log('\nStarting downloads...');
    // Download required assets in parallel
    await Promise.all(toDownload.map((check) => downloadAsset(check.asset, check.destination)));

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
