import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';

// When changing this version, run node download_core.js update_hashes
const version = '0.5.1';
const versionHashes = {
  'powersync_x64.dll': 'c219af1591907c6cbd0258caab194ce70ef0a0fde30194e4a8f2835d50fd985e',
  'powersync_x86.dll': '91b47afcb6054b7252d1350290c5d6aa53ea3b5028e30703387837c792161fcc',
  'powersync_aarch64.dll': 'd735968bf8e42fc7e0cb1e2ce584b1f09aaa52c48919d121906cbc1caec5ed2d',
  'libpowersync_x86.linux.so': '077d6128bfa7fab7fc4a11f7a64abacef8e0863a1ac545a28dc7a91c2bfbd69a',
  'libpowersync_x64.linux.so': '3b999bf954525d24ec44d5cb716092af2e74df7a9ffcfad87c3a78dcc66ee9fd',
  'libpowersync_aarch64.linux.so': 'f0d6c10090d41c9f4c6b09f3b424dacd07bd5b95bd383e6c7f3789dc9e0cf6ed',
  'libpowersync_armv7.linux.so': 'a30fd521f08e1e1c883765b137a2b47e294c827cc5a6bdab1fe7133203078cbb',
  'libpowersync_riscv64gc.linux.so': '9ae819f50fa2682fb3ec9afcb6046ab33a112b55234b05ecd3fc599add9fb920',
  'libpowersync_x64.macos.dylib': '5d5a83092aa40b4604d653080ad727a32c2d2f098d2f7f51984221991676bda3',
  'libpowersync_aarch64.macos.dylib': 'b0e4752c0f39e36e5b9896ddb81640fac9e694a6f1014a83746cdb63e696e89c'
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
