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

// Download multiple prebuilds for different Electron versions
// This ensures the extension works for all users regardless of their VSCode version
const version = require(path.join(rootNodeModules, 'better-sqlite3', 'package.json')).version;

// Support platform-specific packaging for marketplace
// Set VSCE_TARGET to build for specific platform, e.g., VSCE_TARGET=linux-x64
const targetPlatform = process.env.VSCE_TARGET;

let platforms;
if (targetPlatform) {
  // Platform-specific build (for marketplace)
  const [platform, arch] = targetPlatform.split('-');
  platforms = [{ platform, arches: [arch] }];
  console.log(`Building for target platform: ${targetPlatform}`);
} else {
  // Universal build (for local testing) - downloads for current platform only
  platforms = [{ platform: process.platform, arches: [process.arch] }];
  console.log(`Building for current platform: ${process.platform}-${process.arch}`);
}

// Download prebuilds for both Electron and Node.js runtimes
// VSCode can run with either Electron (desktop) or Node.js (remote/server)
const runtimeVersions = [
  // Electron versions for desktop VSCode
  'electron-v121', // Electron 26.x - VSCode 1.82-1.83
  'electron-v123', // Electron 27.x - VSCode 1.83-1.84
  'electron-v125', // Electron 27.x
  'electron-v128', // Electron 28.x - VSCode 1.85-1.86
  'electron-v130', // Electron 29.x - VSCode 1.87+
  'electron-v132', // Electron 29.x
  'electron-v133', // Electron 30.x
  'electron-v135', // Electron 31.x
  'electron-v136', // Electron 32.x
  'electron-v139', // Electron 33.x
  // Node.js versions for remote/server VSCode
  'node-v108', // Node.js 18
  'node-v115', // Node.js 20
  'node-v120', // Node.js 21
  'node-v127', // Node.js 22
  'node-v131', // Node.js 23
];

console.log(`Downloading better-sqlite3 prebuilds for ${targetPlatform || 'current platform'}...`);

let successCount = 0;
let totalCount = 0;

for (const { platform, arches } of platforms) {
  for (const arch of arches) {
    for (const runtimeVersion of runtimeVersions) {
      totalCount++;
      const prebuildName = `better-sqlite3-v${version}-${runtimeVersion}-${platform}-${arch}.tar.gz`;
      const downloadUrl = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${version}/${prebuildName}`;

      // Create version-specific directory
      const versionBuildDir = path.join(betterSqliteDest, 'prebuilds', runtimeVersion, platform, arch);
      fs.mkdirSync(versionBuildDir, { recursive: true });

      try {
        const tmpFile = path.join('/tmp', `${prebuildName}-${Date.now()}`);
        const tmpExtractDir = path.join('/tmp', `better-sqlite3-extract-${Date.now()}`);
        fs.mkdirSync(tmpExtractDir, { recursive: true });

        execSync(`curl -f -sS -L -o "${tmpFile}" "${downloadUrl}"`, { stdio: 'pipe' });
        execSync(`tar -xzf "${tmpFile}" -C "${tmpExtractDir}"`, { stdio: 'pipe' });

        const nodeFiles = execSync(`find "${tmpExtractDir}" -name "*.node"`, { encoding: 'utf-8' }).trim().split('\n');
        if (nodeFiles.length > 0 && nodeFiles[0]) {
          fs.copyFileSync(nodeFiles[0], path.join(versionBuildDir, 'better_sqlite3.node'));
          successCount++;
        }

        fs.unlinkSync(tmpFile);
        fs.rmSync(tmpExtractDir, { recursive: true, force: true });
      } catch (error) {
        // Silently skip unavailable prebuilds
      }
    }
  }
}

console.log(`✓ Downloaded ${successCount}/${totalCount} prebuilds for all platforms`);

if (successCount === 0) {
  console.log('⚠ Failed to download prebuilds, trying local build fallback...');

  // Fallback: Copy the locally built .node file if it exists
  const localNodeFile = path.join(rootNodeModules, 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');

  if (fs.existsSync(localNodeFile)) {
    console.log('✓ Found locally built better_sqlite3.node, copying for current platform...');

    // Copy to build/Release for backward compatibility with older better-sqlite3 loading logic
    fs.copyFileSync(localNodeFile, path.join(buildDir, 'better_sqlite3.node'));

    // Also copy to prebuilds structure for each runtime version
    const currentPlatform = process.platform;
    const currentArch = process.arch;

    for (const runtimeVersion of runtimeVersions) {
      const versionBuildDir = path.join(betterSqliteDest, 'prebuilds', runtimeVersion, currentPlatform, currentArch);
      fs.mkdirSync(versionBuildDir, { recursive: true });
      fs.copyFileSync(localNodeFile, path.join(versionBuildDir, 'better_sqlite3.node'));
      successCount++;
    }

    console.log(`✓ Copied local build to ${runtimeVersions.length} runtime version directories`);
  } else {
    console.error('❌ No locally built better_sqlite3.node found');
    console.error('Run "npm rebuild better-sqlite3" to build it for your platform');
    throw new Error('No compatible better-sqlite3 binaries available');
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

// Copy dockerode and its dependencies
copyEssentialFiles('dockerode', [
  { src: 'lib', required: true },
  { src: 'package.json', required: true },
]);

// Copy all dockerode dependencies (auto-discovered via npm ls)
// This list was generated by recursively traversing dockerode's dependency tree
const dockerodeDeps = [
  '@balena/dockerignore',
  '@grpc/grpc-js',
  '@grpc/proto-loader',
  '@js-sdsl/ordered-map',
  '@protobufjs/aspromise',
  '@protobufjs/base64',
  '@protobufjs/codegen',
  '@protobufjs/eventemitter',
  '@protobufjs/fetch',
  '@protobufjs/float',
  '@protobufjs/inquire',
  '@protobufjs/path',
  '@protobufjs/pool',
  '@protobufjs/utf8',
  'ansi-regex',
  'ansi-styles',
  'asn1',
  'base64-js',
  'bcrypt-pbkdf',
  'bl',
  'buffer',
  'chownr',
  'cliui',
  'color-convert',
  'color-name',
  'debug',
  'docker-modem',
  'emoji-regex',
  'end-of-stream',
  'escalade',
  'fs-constants',
  'get-caller-file',
  'ieee754',
  'inherits',
  'is-fullwidth-code-point',
  'lodash.camelcase',
  'long',
  'mkdirp-classic',
  'ms',
  'once',
  'protobufjs',
  'pump',
  'readable-stream',
  'require-directory',
  'safe-buffer',
  'safer-buffer',
  'split-ca',
  'ssh2',
  'string-width',
  'string_decoder',
  'strip-ansi',
  'tar-fs',
  'tar-stream',
  'tweetnacl',
  'util-deprecate',
  'uuid',
  'wrap-ansi',
  'wrappy',
  'y18n',
  'yargs',
  'yargs-parser',
];

console.log(`Copying ${dockerodeDeps.length} dockerode dependencies...`);
dockerodeDeps.forEach(dep => copyEntirePackage(dep));

console.log('✓ Native dependencies prepared for packaging');

function copyEntirePackage(packageName) {
  // Handle scoped packages (e.g., @grpc/grpc-js)
  const srcRoot = path.join(rootNodeModules, ...packageName.split('/'));
  const destRoot = path.join(nativeModulesDir, ...packageName.split('/'));

  if (!fs.existsSync(srcRoot)) {
    console.log(`  ⚠ ${packageName} not found, skipping`);
    return;
  }

  console.log(`Copying ${packageName}...`);

  if (fs.existsSync(destRoot)) {
    fs.rmSync(destRoot, { recursive: true, force: true });
  }

  // Copy entire package directory
  copyRecursive(srcRoot, destRoot);
  console.log(`✓ Copied ${packageName}`);
}

function copyEssentialFiles(packageName, files) {
  // Handle scoped packages (e.g., @grpc/grpc-js)
  const srcRoot = path.join(rootNodeModules, ...packageName.split('/'));
  const destRoot = path.join(nativeModulesDir, ...packageName.split('/'));

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
