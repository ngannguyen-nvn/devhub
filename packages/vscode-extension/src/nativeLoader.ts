/**
 * Runtime loader for better-sqlite3 that selects the correct prebuild
 * based on the current Electron version
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * Load better-sqlite3 with the correct prebuild for current Electron version
 */
export function loadBetterSqlite3(extensionPath: string) {
  const platform = process.platform;
  const arch = process.arch;

  // Get process versions to detect runtime
  const electronVersion = process.versions.electron;
  const moduleVersion = process.versions.modules;

  console.log(`Runtime detection: Electron ${electronVersion || 'N/A'}, NODE_MODULE_VERSION ${moduleVersion}`);

  // Try to find a compatible prebuild
  const betterSqlitePath = path.join(extensionPath, 'dist', 'node_modules', 'better-sqlite3');
  const prebuildsPath = path.join(betterSqlitePath, 'prebuilds');

  let tryOrder: string[] = [];

  // Detect if running in Electron or Node.js
  if (electronVersion) {
    // Running in Electron - use electron-vXXX prebuilds
    // Map NODE_MODULE_VERSION to electron-vXXX
    // The prebuild naming uses the ABI version (e.g., electron-v140 for Electron 39 with ABI 140)
    const abiToElectronMap: Record<string, string> = {
      '116': 'electron-v121',
      '119': 'electron-v123',
      '121': 'electron-v125',
      '125': 'electron-v125',
      '127': 'electron-v128',
      '128': 'electron-v130',
      '129': 'electron-v132',
      '130': 'electron-v133',
      '131': 'electron-v135',
      '132': 'electron-v136',
      '137': 'electron-v139',
      '139': 'electron-v139', // Electron 34.x (VSCode 1.94-1.106)
      '140': 'electron-v140', // Electron 39.x (VSCode 1.107-1.108)
      '141': 'electron-v141', // Electron 40.x (future)
      '142': 'electron-v142', // Electron 41.x (future)
      '143': 'electron-v143', // Electron 42.x (future)
      '144': 'electron-v144', // Electron 43.x (future)
    };

    const electronABI = abiToElectronMap[moduleVersion];

    if (electronABI) {
      tryOrder = [electronABI, ...Object.values(abiToElectronMap).filter(v => v !== electronABI)];
    } else {
      console.warn(`Unknown Electron NODE_MODULE_VERSION ${moduleVersion}, trying all Electron prebuilds...`);
      tryOrder = Object.values(abiToElectronMap);
    }
  } else {
    // Running in Node.js - use node-vXXX prebuilds
    // Map NODE_MODULE_VERSION to node-vXXX
    const abiToNodeMap: Record<string, string> = {
      '108': 'node-v108', // Node 18
      '115': 'node-v115', // Node 20
      '120': 'node-v120', // Node 21
      '127': 'node-v127', // Node 22
      '131': 'node-v131', // Node 23
    };

    const nodeABI = abiToNodeMap[moduleVersion];

    if (nodeABI) {
      tryOrder = [nodeABI, ...Object.values(abiToNodeMap).filter(v => v !== nodeABI)];
    } else {
      console.warn(`Unknown Node.js NODE_MODULE_VERSION ${moduleVersion}, trying all Node.js prebuilds...`);
      tryOrder = Object.values(abiToNodeMap);
    }
  }

  for (const version of tryOrder) {
    const prebuildPath = path.join(prebuildsPath, version, platform, arch, 'better_sqlite3.node');

    if (fs.existsSync(prebuildPath)) {
      console.log(`Found prebuild: ${version} at ${prebuildPath}`);

      // Copy to the location where bindings expects it
      const targetPath = path.join(betterSqlitePath, 'build', 'Release', 'better_sqlite3.node');
      const targetDir = path.dirname(targetPath);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Delete existing file if present to ensure overwrite
      if (fs.existsSync(targetPath)) {
        console.log(`Removing existing file at ${targetPath}`);
        fs.unlinkSync(targetPath);
      }

      fs.copyFileSync(prebuildPath, targetPath);
      console.log(`Successfully copied prebuild to ${targetPath}`);
      return;
    } else {
      console.log(`Prebuild not found: ${version} at ${prebuildPath}`);
    }
  }

  // If we get here, no compatible prebuild was found
  throw new Error(
    `No compatible better-sqlite3 prebuild found for Electron ${electronVersion} ` +
    `(NODE_MODULE_VERSION ${moduleVersion}) on ${platform}-${arch}. ` +
    `Please report this issue with your VSCode version.`
  );
}
