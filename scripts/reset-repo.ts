#!/usr/bin/env node

import { existsSync, readdirSync, rmSync, statSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// This script can be helpful to clean up the monorepo from:
// - all node_modules folders
// - pnpm lock files
// - other generated / unnecessary folders
//
// To run it, you can use the following command from the root of the project:
// pnpm reset:repo

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const PNPM_LOCK_FILE = 'pnpm-lock.yaml';

function removeFileOrDir(targetPath: string, label: string, isDirectory: boolean = false): void {
  if (existsSync(targetPath)) {
    console.log(`🗑️  Removing ${label}: ${targetPath}`);
    try {
      rmSync(targetPath, { recursive: isDirectory, force: true });
      console.log(`✅ Removed ${label}`);
    } catch (error) {
      console.error(`❌ Failed to remove ${label}:`, error);
    }
  } else {
    console.log(`⏭️  ${label} not found, skipping`);
  }
}

function cleanupDirectory(dir: string, label: string): void {
  // Remove node_modules
  const nodeModulesPath = path.join(dir, 'node_modules');
  removeFileOrDir(nodeModulesPath, `${label}/node_modules`, true);

  // Remove pnpm-lock.yaml
  const lockFilePath = path.join(dir, PNPM_LOCK_FILE);
  removeFileOrDir(lockFilePath, `${label}/${PNPM_LOCK_FILE}`, false);
}

function cleanupDirectoryAndSubdirectories(parentDir: string, label: string): void {
  const fullPath = path.join(projectRoot, parentDir);

  if (!existsSync(fullPath)) {
    console.log(`⏭️  ${label} directory not found, skipping`);
    return;
  }

  // Cleanup the parent directory itself
  cleanupDirectory(fullPath, label);

  // Then cleanup all subdirectories
  const entries = readdirSync(fullPath);

  for (const entry of entries) {
    const entryPath = path.join(fullPath, entry);

    try {
      const stat = statSync(entryPath);
      if (stat.isDirectory()) {
        cleanupDirectory(entryPath, `${label}/${entry}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${entryPath}:`, error);
    }
  }
}

console.log('Starting repository reset...\n');

//
// 1. Clean node_modules and pnpm lock files
//
console.log('Cleaning node_modules and pnpm lock files...\n');

// Root
console.log('Cleaning root...');
cleanupDirectory(projectRoot, 'root');
console.log('');

// Demos
console.log('Cleaning demos...');
cleanupDirectoryAndSubdirectories('demos', 'demos');
console.log('');

// Packages
console.log('Cleaning packages...');
cleanupDirectoryAndSubdirectories('packages', 'packages');
console.log('');

// Tools
console.log('Cleaning tools...');
cleanupDirectoryAndSubdirectories('tools', 'tools');
console.log('');

// Docs
console.log('Cleaning docs...');
cleanupDirectory(path.join(projectRoot, 'docs'), 'docs');
console.log('');

//
// 2. Clean unnecessary folders
//
console.log('Cleaning unnecessary folders...\n');

// .nuxt folder in Nuxt demo
removeFileOrDir(
  path.join(projectRoot, 'demos/nuxt-supabase-todolist/.nuxt'),
  'demos/nuxt-supabase-todolist/.nuxt',
  true
);
console.log('');

console.log('Repository reset complete!');
console.log('Run "pnpm install" to reinstall dependencies where needed.');
