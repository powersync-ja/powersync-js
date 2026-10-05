// Downloads prebuilt powersync-sqlite-core native libraries from GitHub releases for a given
// package, verifying each against a pinned hash. Run from the target package's directory:
//
//   node ../../tools/download-core.js <node|react-native|capacitor|update_hashes>
//
// `update_hashes` re-fetches the current hashes for a target's pinned version and prints them,
// for use after bumping that target's `version` below.
import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { cwd } from 'node:process';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';

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
  'libpowersync_aarch64.macos.dylib': '4fa96a98d7edb64a188493beb277bddcb7e85b286e2533d685ecf49ff51c6807',

  'libpowersync_aarch64.android.so': 'da416aaaaaa6bbc96049a4d28cd36dc5a85b6123bbf8eff18353a491814d43ba',
  'libpowersync_armv7.android.so': '4f8ac9fc318f23d931d7ed8d0ba5cb7d4468062ed643c7bc1cb9dafe662d7d10',
  'libpowersync_x64.android.so': '901be3196a958b0e5ec4566b7086b1de6f5ec73b78f074bafb51831f9c1a6f45',
  'libpowersync_x86.android.so': 'c48de38afbb764971691815b0a20c49eebf2208711da02a08faffd36bee5908e'
};

const thisScript = import.meta.filename;

// Assets to bundle with @powersync/capacitor and @powersync/react-native as JNI assets.
const androidAbiAssets = {
  'arm64-v8a': 'libpowersync_aarch64.android.so',
  'armeabi-v7a': 'libpowersync_armv7.android.so',
  x86_64: 'libpowersync_x64.android.so',
  x86: 'libpowersync_x86.android.so'
};

// All other assets need to be downloaded to node/lib.
const androidAssets = Object.values(androidAbiAssets);
const nodeAssets = Object.keys(versionHashes).filter((name) => !androidAssets.includes(name));

const packageDirectory = (...segments) => path.resolve(thisScript, '../../packages', ...segments);
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

const releaseUrl = (version, asset) =>
  `https://github.com/powersync-ja/powersync-sqlite-core/releases/download/v${version}/${asset}`;

const relativePath = (absolutePath) => path.normalize(path.relative(cwd(), absolutePath));

const downloadAsset = async (destinationPath, asset) => {
  const expectedHash = versionHashes[asset];

  await fs.mkdir(path.dirname(destinationPath), { recursive: true });

  const url = releaseUrl(version, asset);
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

  console.log(`Successfully downloaded ${asset} to ${relativePath(destinationPath)}`);
};

const checkAsset = async (destinationPath, asset) => {
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

const download = async (files) => {
  console.log('Checking existing files...');
  const checks = await Promise.all(files.map(({ path, asset }) => checkAsset(path, asset)));

  const toDownload = checks.filter((check) => !check.isValid);
  const upToDate = checks.filter((check) => check.isValid);

  if (upToDate.length > 0) {
    console.log('\nUp-to-date files:');
    for (const { asset, destinationPath } of upToDate) {
      console.log(`  ✓ ${asset} (in ${relativePath(destinationPath)})`);
    }
  }

  if (toDownload.length > 0) {
    console.log('\nFiles to download:');
    for (const { asset, exists, destinationPath } of toDownload) {
      console.log(`  • ${asset} (${exists ? 'hash mismatch' : `missing (in ${relativePath(destinationPath)})`})`);
    }

    console.log('\nStarting downloads...');
    await Promise.all(toDownload.map(({ asset, destinationPath }) => downloadAsset(destinationPath, asset)));

    console.log('\nAll downloads completed successfully!');
  } else {
    console.log('\nAll files are up-to-date, nothing to download.');
  }
};

const updateReferenceHashes = async () => {
  for (const asset of Object.keys(versionHashes)) {
    const response = await fetch(releaseUrl(target.version, asset));
    const hash = await hashStream(Readable.fromWeb(response.body));

    console.log(`  '${asset}': '${hash}',`);
  }
};

const [, , targetName] = process.argv;
switch (targetName) {
  case 'update_hashes': {
    await updateReferenceHashes();
    break;
  }
  case 'node': {
    await download(
      nodeAssets.map((asset) => ({
        asset,
        path: packageDirectory('node', 'lib', asset)
      }))
    );
    break;
  }
  case 'capacitor':
  case 'react-native': {
    await download(
      Object.entries(androidAbiAssets).map(([abi, name]) => {
        return {
          asset: name,
          path: packageDirectory(targetName, 'android', 'core', 'jniLibs', abi, 'libpowersync.so')
        };
      })
    );
    break;
  }
  default: {
    console.error(`Usage: node download-core.js <node|capacitor|react-native|update_hashes>`);
    process.exit(1);
  }
}
