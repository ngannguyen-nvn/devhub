/**
 * Copy native dependencies into dist for packaging
 * For better-sqlite3, downloads the correct prebuild for VSCode's Node.js version
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootNodeModules = path.join(__dirname, '../../../node_modules');
const distDir = path.join(__dirname, '../dist');
const nativeModulesDir = path.join(distDir, 'node_modules');

// Ensure dist/node_modules exists
if (!fs.existsSync(nativeModulesDir)) {
  fs.mkdirSync(nativeModulesDir, { recursive: true });
}

// Copy better-sqlite3 lib and package.json (NOT the .node file - we'll download the right one)
console.log('Copying better-sqlite3 JavaScript files...');
const betterSqliteDest = path.join(nativeModulesDir, 'better-sqlite3');
if (fs.existsSync(betterSqliteDest)) {
  fs.rmSync(betterSqliteDest, { recursive: true, force: true });
}
fs.mkdirSync(betterSqliteDest, { recursive: true });

// Copy lib/ and package.json
copyRecursive(
  path.join(rootNodeModules, 'better-sqlite3', 'lib'),
  path.join(betterSqliteDest, 'lib')
);
fs.copyFileSync(
  path.join(rootNodeModules, 'better-sqlite3', 'package.json'),
  path.join(betterSqliteDest, 'package.json')
);

// Create build/Release directory for the .node file
const buildDir = path.join(betterSqliteDest, 'build', 'Release');
fs.mkdirSync(buildDir, { recursive: true });

// Download the correct prebuild for VSCode's Electron version
// This tries multiple Electron versions to find a compatible one
const version = require(path.join(rootNodeModules, 'better-sqlite3', 'package.json')).version;
const platform = process.platform; // linux, darwin, win32
const arch = process.arch; // x64, arm64

// List of Electron versions to try
// Ordered by compatibility: try closest to common VSCode versions first, then fallback to newer/older
// Based on available prebuilds from better-sqlite3 releases
const electronVersions = [
  'electron-v128', // Electron 28.x (NODE_MODULE_VERSION 127) - VSCode 1.85-1.86
  'electron-v130', // Electron 29.x - VSCode 1.87+
  'electron-v132', // Electron 29.x
  'electron-v125', // Electron 27.x
  'electron-v123', // Electron 27.x - VSCode 1.83-1.84
  'electron-v133', // Electron 30.x
  'electron-v135', // Electron 31.x
  'electron-v136', // Electron 32.x
  'electron-v139', // Electron 33.x
  'electron-v121', // Electron 26.x (older)
];

console.log('Trying to download compatible better-sqlite3 prebuild...');
let downloadSuccess = false;

// Try each Electron version until one works
for (const electronVersion of electronVersions) {
  const prebuildName = `better-sqlite3-v${version}-${electronVersion}-${platform}-${arch}.tar.gz`;
  const downloadUrl = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${version}/${prebuildName}`;

  console.log(`Trying ${electronVersion}...`);

  try {
    const tmpFile = path.join('/tmp', prebuildName);
    const tmpExtractDir = path.join('/tmp', `better-sqlite3-extract-${Date.now()}`);
    fs.mkdirSync(tmpExtractDir, { recursive: true });

    // Download with silent mode and check status
    execSync(`curl -f -sS -L -o "${tmpFile}" "${downloadUrl}"`, { stdio: 'pipe' });

    // If download succeeded, extract
    execSync(`tar -xzf "${tmpFile}" -C "${tmpExtractDir}"`, { stdio: 'pipe' });

    // Find the .node file
    const nodeFiles = execSync(`find "${tmpExtractDir}" -name "*.node"`, { encoding: 'utf-8' }).trim().split('\n');
    if (nodeFiles.length > 0 && nodeFiles[0]) {
      fs.copyFileSync(nodeFiles[0], path.join(buildDir, 'better_sqlite3.node'));
      console.log(`✓ Successfully downloaded ${electronVersion} prebuild`);
      downloadSuccess = true;

      // Cleanup
      fs.unlinkSync(tmpFile);
      fs.rmSync(tmpExtractDir, { recursive: true, force: true });
      break;
    } else {
      throw new Error('No .node file found');
    }
  } catch (error) {
    // This version not available or failed, try next one
    continue;
  }
}

if (!downloadSuccess) {
  console.warn('⚠ Could not download any compatible prebuild');
  console.log('Falling back to local build (may not work in VSCode)...');
  try {
    fs.copyFileSync(
      path.join(rootNodeModules, 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
      path.join(buildDir, 'better_sqlite3.node')
    );
  } catch (error) {
    console.error('❌ Failed to copy local build:', error.message);
    throw new Error('No compatible better-sqlite3 binary available');
  }
}

// Copy better-sqlite3 dependencies
copyEssentialFiles('bindings', [
  { src: 'bindings.js', required: true },
  { src: 'package.json', required: true },
]);

copyEssentialFiles('prebuild-install', [
  { src: 'bin.js', required: false },
  { src: 'index.js', required: true },
  { src: 'rc.js', required: false },
  { src: 'package.json', required: true },
]);

copyEssentialFiles('file-uri-to-path', [
  { src: 'index.js', required: true },
  { src: 'package.json', required: true },
]);

// Copy dockerode
copyEssentialFiles('dockerode', [
  { src: 'lib', required: true },
  { src: 'package.json', required: true },
]);

console.log('✓ Native dependencies prepared for packaging');

function copyEssentialFiles(packageName, files) {
  const srcRoot = path.join(rootNodeModules, packageName);
  const destRoot = path.join(nativeModulesDir, packageName);

  if (!fs.existsSync(srcRoot)) {
    console.warn(`⚠ ${packageName} not found in root node_modules`);
    return;
  }

  console.log(`Copying ${packageName} essential files...`);

  if (fs.existsSync(destRoot)) {
    fs.rmSync(destRoot, { recursive: true, force: true });
  }

  fs.mkdirSync(destRoot, { recursive: true });

  for (const file of files) {
    const srcPath = path.join(srcRoot, file.src);
    const destPath = path.join(destRoot, file.src);

    if (!fs.existsSync(srcPath)) {
      if (file.required) {
        throw new Error(`Required file ${file.src} not found in ${packageName}`);
      }
      continue;
    }

    const srcStat = fs.statSync(srcPath);
    if (srcStat.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      const parentDir = path.dirname(destPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }

  console.log(`✓ Copied ${packageName}`);
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    for (const file of files) {
      copyRecursive(
        path.join(src, file),
        path.join(dest, file)
      );
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}
