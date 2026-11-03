import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';

// When changing this version, run node download_core.js update_hashes
const version = '0.5.4';
const versionHashes = {
  'powersync_x64.dll': '9a7fdd69481d0d0429c065efd7430cf12bc2e073998ba2c57471a65731670824',
  'powersync_x86.dll': 'b8d94b31cfa93b09fdf4ef7723e321efb36cdedd6eff90e62c09555640c52fea',
  'powersync_aarch64.dll': '09dd3d90ffebd8bba453ff19533a926d0164f751a4fd80cfd0bb1bd16224d779',
  'libpowersync_x86.linux.so': 'fd749210142e1d4afe159fd36f69f9fc46b25526cb1564b49763952af134eba6',
  'libpowersync_x64.linux.so': '6f7598882698302e4fbd12d87a24dd02ec0d1c3e6bd73f1a53aebda23f44cb46',
  'libpowersync_aarch64.linux.so': '9c0fcaff33696c6a250c8a148207c3d7cd6665dcd862150f07452743053edfc6',
  'libpowersync_armv7.linux.so': 'b37aa63a5606a1821a3a9c7f817dbb399e5784a97a396f9701a29c8da66cbc5a',
  'libpowersync_riscv64gc.linux.so': '96a586ed5a69c1943d192a59bef57745622c6556ee6ea77b8f37518bca33e570',
  'libpowersync_x64.macos.dylib': 'c91eaa533d2a30649766a84067d136d975a55c38a3267ef0649c4c0b658e4475',
  'libpowersync_aarch64.macos.dylib': 'e85ce5ba226e1eb84320737f9bf55f09e6bc9e0e786e1f27acfbc8fac19b813a'
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
