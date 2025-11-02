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
// VSCode requires NODE_MODULE_VERSION 127 (Electron 28.x)
// Closest available is electron-v128 (Electron 28.x)
console.log('Downloading better-sqlite3 prebuild for Electron v128...');
const version = require(path.join(rootNodeModules, 'better-sqlite3', 'package.json')).version;
const platform = process.platform; // linux, darwin, win32
const arch = process.arch; // x64, arm64
const electronVersion = 'electron-v128'; // Electron 28.x (NODE_MODULE_VERSION 127)

// Construct prebuild URL
const prebuildName = `better-sqlite3-v${version}-${electronVersion}-${platform}-${arch}.tar.gz`;
const downloadUrl = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${version}/${prebuildName}`;

console.log(`Downloading from: ${downloadUrl}`);

try {
  // Download and extract using curl and tar
  const tmpFile = path.join('/tmp', prebuildName);
  const tmpExtractDir = path.join('/tmp', `better-sqlite3-extract-${Date.now()}`);
  fs.mkdirSync(tmpExtractDir, { recursive: true });

  execSync(`curl -L -o "${tmpFile}" "${downloadUrl}"`, { stdio: 'inherit' });
  execSync(`tar -xzf "${tmpFile}" -C "${tmpExtractDir}"`, { stdio: 'inherit' });

  // Find the .node file (might be in nested directories)
  const nodeFiles = execSync(`find "${tmpExtractDir}" -name "*.node"`, { encoding: 'utf-8' }).trim().split('\n');
  if (nodeFiles.length > 0 && nodeFiles[0]) {
    fs.copyFileSync(nodeFiles[0], path.join(buildDir, 'better_sqlite3.node'));
    console.log('✓ Downloaded and extracted prebuild');
  } else {
    throw new Error('No .node file found in prebuild archive');
  }

  // Cleanup
  fs.unlinkSync(tmpFile);
  fs.rmSync(tmpExtractDir, { recursive: true, force: true });
} catch (error) {
  console.error(`Failed to download prebuild: ${error.message}`);
  console.log('Falling back to local build (may not work in VSCode)...');
  // Fallback: copy local build
  fs.copyFileSync(
    path.join(rootNodeModules, 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
    path.join(buildDir, 'better_sqlite3.node')
  );
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
