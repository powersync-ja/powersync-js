import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from './package.json' with { type: 'json' };

const cargoPath = resolve(fileURLToPath(import.meta.url), '../../Cargo.toml');
let cargo = readFileSync(cargoPath, 'utf8');

cargo = cargo.replace(/^version = ".*"/m, `version = "${pkg.version}"`);

writeFileSync(cargoPath, cargo);
console.log(`Updated Cargo.toml version to ${pkg.version}`);
