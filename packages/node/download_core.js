import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';

// When changing this version, run node download_core.js update_hashes
const version = '0.4.12';
const versionHashes = {
  'powersync_x64.dll': 'efc095c2dff5194c1dbf4943012ae8bb5349e8aaac481d18cb0d3a49fa6a1255',
  'powersync_x86.dll': '147ef50acdab8dc27075f29ae6f86dd26fb574f373e3a186492ca7d55d0b867c',
  'powersync_aarch64.dll': '90fbce6a22bc7fcde0ee62ed52eec821afa86b1bacff4597ddc9cea2f7203cb1',
  'libpowersync_x86.linux.so': '89b8b7451a01e533a5736a7025d13f0bd0640c1df40025cf8a90d6d2e7e8b1ee',
  'libpowersync_x64.linux.so': 'c15d5a069200c823c95435bbad38a9dc12743deca42b30b0c40557b2bc32ac5d',
  'libpowersync_aarch64.linux.so': 'acbf2a1b27f413d8a83e5efc91f0531c6989519203eaf2814c52942f1a445649',
  'libpowersync_armv7.linux.so': 'e262fcf4c1509d96a692f159af572a09fad781d4cc3ba885d3de276926526432',
  'libpowersync_riscv64gc.linux.so': '46101c885b4ff23e4a7059a5eb9f3fc697762455e6d296815a8ccece8eeacd41',
  'libpowersync_x64.macos.dylib': 'e0b2402702bd744d65a2c8aba4d7242f5cefd67c33926d92567ee4e02b13e20d',
  'libpowersync_aarch64.macos.dylib': 'cfbfa86a0b8203619059be4bf4cf3078f122866dcc4896b07f7b412a41628abe'
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
