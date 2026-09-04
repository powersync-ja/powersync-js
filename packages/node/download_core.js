import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';

// When changing this version, run node download_core.js update_hashes
const version = '0.5.3';
const versionHashes = {
  'powersync_x64.dll': 'b3f62293f26d3ee309880d30e1e54819ac21b4d0b1ba9b9177f92e1dcbfdb0c7',
  'powersync_x86.dll': 'd2403446c5b2d0550eb99cb195db01798ef78a740ba4f462cd0b887e0ce4bd8a',
  'powersync_aarch64.dll': '19afce715bf63b4f590fb2c00d18c3681b818cd6eee5a35284bd3a804f090b20',
  'libpowersync_x86.linux.so': 'dc9be35f8a5b5511be8f6b28f8c9d1e00e6ecdb72074ea8e67b826474810276f',
  'libpowersync_x64.linux.so': 'a6de0c79151ad6243ca18633f0df10bed32b692095fdf0f01ebdac6eb01d2edf',
  'libpowersync_aarch64.linux.so': 'f27b1cadce2210541903ba2f4e9652782c9e14c913cde4f67c463cec00d46d14',
  'libpowersync_armv7.linux.so': '3f6ddf0838fbd34e0986e21de0db89b5a0462cdc1eaee95e42c9dcdc1f0c4cc5',
  'libpowersync_riscv64gc.linux.so': '5eaa1458153ab562ca0047aa2af4aa3303ee7291eabd92baeb2e9ab2f07935ba',
  'libpowersync_x64.macos.dylib': '1209f802bcd886a112bd0de9ca5d7497a62af045fc64b78e703bdd465ee40979',
  'libpowersync_aarch64.macos.dylib': '4fa96a98d7edb64a188493beb277bddcb7e85b286e2533d685ecf49ff51c6807'
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
