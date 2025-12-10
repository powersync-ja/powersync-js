#!/usr/bin/env node

import { existsSync, readdirSync, rmSync, statSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// This script can be helpful to clean up the monorepo from all the node_module folders to prepare a fresh install
// to run it, you can use the following command from the root of the project:
// npx tsx ./scripts/reset-node-modules.ts


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

function removeNodeModules(dir: string, label: string): void {
  const nodeModulesPath = path.join(dir, 'node_modules');
  if (existsSync(nodeModulesPath)) {
    console.log(`🗑️  Removing ${label}: ${nodeModulesPath}`);
    try {
      rmSync(nodeModulesPath, { recursive: true, force: true });
      console.log(`✅ Removed ${label}`);
    } catch (error) {
      console.error(`❌ Failed to remove ${label}:`, error);
    }
  } else {
    console.log(`⏭️  ${label} not found, skipping`);
  }
}

function removeNodeModulesInDirectory(parentDir: string, label: string): void {
  const fullPath = path.join(projectRoot, parentDir);
  
  if (!existsSync(fullPath)) {
    console.log(`⏭️  ${label} directory not found, skipping`);
    return;
  }

  const entries = readdirSync(fullPath);
  
  for (const entry of entries) {
    const entryPath = path.join(fullPath, entry);
    
    try {
      const stat = statSync(entryPath);
      if (stat.isDirectory()) {
        removeNodeModules(entryPath, `${label}/${entry}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${entryPath}:`, error);
    }
  }
}

console.log('Starting cleanup of all node_modules directories...\n');

// Clean root node_modules
console.log('Cleaning root node_modules...');
removeNodeModules(projectRoot, 'root');
console.log('');

// Clean demos node_modules
console.log('Cleaning demos node_modules...');
removeNodeModulesInDirectory('demos', 'demos');
console.log('');

// Clean packages node_modules
console.log('Cleaning packages node_modules...');
removeNodeModulesInDirectory('packages', 'packages');
console.log('');

// Clean tools node_modules
console.log('Cleaning tools node_modules...');
removeNodeModulesInDirectory('tools', 'tools');
console.log('');

// Clean docs node_modules
console.log('Cleaning docs node_modules...');
removeNodeModules(path.join(projectRoot, 'docs'), 'docs');
console.log('');

console.log('Cleanup complete!');
console.log('Run "pnpm install" to reinstall dependencies');
