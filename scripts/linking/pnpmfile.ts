import { findWorkspacePackages } from '@pnpm/workspace.find-packages';
import { readWorkspaceManifest } from '@pnpm/workspace.read-manifest';
import fs from 'node:fs';
import path from 'node:path';

let lazyWorkspacePackagePaths: Record<string, string> | null = null;
let lazyWorkspaceManifest: Record<string, any> | null = null;

// Track linked packages for summary
const linkedPackages = new Map<string, string>();
let summaryPrinted = false;

const printSummary = () => {
  if (summaryPrinted || linkedPackages.size === 0) return;
  summaryPrinted = true;

  console.log('\n📦 pnpmfile: Linked packages summary');
  console.table(Object.fromEntries(linkedPackages));
};

process.on('beforeExit', printSummary);

const lazyLoadWorkspace = async () => {
  if (!lazyWorkspacePackagePaths) {
    const workspacePackages = await findWorkspacePackages(WORKSPACE_ROOT, {
      patterns: ['./packages/*']
    });
    lazyWorkspacePackagePaths = Object.fromEntries(
      workspacePackages
      .filter((pkg) => pkg.manifest.name?.startsWith('@powersync/'))
      .map((pkg) => [pkg.manifest.name!, pkg.rootDirRealPath])
    );
  }
  if (!lazyWorkspaceManifest) {
    const workspaceResult = await readWorkspaceManifest(WORKSPACE_ROOT)
    if (!workspaceResult) {
      throw new Error('Failed to read workspace manifest');
    }
    lazyWorkspaceManifest = workspaceResult;
  }

  return {
    workspacePackagePaths: lazyWorkspacePackagePaths!,
    workspaceManifest: lazyWorkspaceManifest!,
  }
};

// The demos are always two levels up from the workspace root
const WORKSPACE_ROOT = path.resolve('../../');

export default {
  hooks: {
  async readPackage(pkg) {
    const { workspacePackagePaths, workspaceManifest } = await lazyLoadWorkspace();

    const injectPeers = (manifestPath) => {
      try {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const localPkg = JSON.parse(content);
        if (localPkg.peerDependencies) {
          pkg.dependencies = pkg.dependencies || {};
          Object.keys(localPkg.peerDependencies).forEach((peer) => {
            if (workspacePackagePaths[peer]) {
              // Force install the peer dependency pointing to local
              pkg.dependencies[peer] = `file:${workspacePackagePaths[peer]}`;
            }
          });
        }
      } catch (e) {
        // Ignore missing files or parse errors
      }
    };

    const scanDeps = (deps) => {
      if (!deps) return;
      Object.keys(deps).forEach((dep) => {
        if (workspacePackagePaths[dep]) {
          const localPath = workspacePackagePaths[dep];

          // Point the direct dependency to the local file
          deps[dep] = `file:${localPath}`;
          linkedPackages.set(dep, localPath);

          // Also inject any peer dependencies from the local package
          injectPeers(path.resolve(process.cwd(), localPath, 'package.json'));
        }
        /**
         * Check for catalog versions
         * Note: Only our workspace packages should have catalog versions
         */
        if (deps[dep].startsWith('catalog:')) {
          const catalogVersion = workspaceManifest.catalog[dep];
          if (catalogVersion) {
            deps[dep] = catalogVersion;
          }
        }
      });
    };

    scanDeps(pkg.dependencies);
    scanDeps(pkg.devDependencies);

    return pkg;
  }}
};
