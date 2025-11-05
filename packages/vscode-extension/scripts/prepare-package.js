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

// Skip prebuild downloads if SKIP_PREBUILD_DOWNLOAD is set (dev mode)
let successCount = 0;
let totalCount = 0;

if (process.env.SKIP_PREBUILD_DOWNLOAD) {
  console.log('⚠️  SKIP_PREBUILD_DOWNLOAD is set, skipping downloads...');
} else {
  console.log(`Downloading better-sqlite3 prebuilds for ${targetPlatform || 'current platform'}...`);

  for (const { platform, arches } of platforms) {
    for (const arch of arches) {
      for (const runtimeVersion of runtimeVersions) {
        totalCount++;

        // Create version-specific directory
        const versionBuildDir = path.join(betterSqliteDest, 'prebuilds', runtimeVersion, platform, arch);
        fs.mkdirSync(versionBuildDir, { recursive: true });

        try {
          // Try direct download with wget (more reliable than curl for GitHub releases)
          const prebuildName = `better-sqlite3-v${version}-${runtimeVersion}-${platform}-${arch}.tar.gz`;
          const downloadUrl = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${version}/${prebuildName}`;

          const tmpFile = path.join('/tmp', `${prebuildName}-${Date.now()}`);
          const tmpExtractDir = path.join('/tmp', `better-sqlite3-extract-${Date.now()}`);

          try {
            fs.mkdirSync(tmpExtractDir, { recursive: true });

            // Multi-stage fallback for downloads (handles SSL issues)
            let downloaded = false;

            // Try 1: wget with SSL verification
            try {
              execSync(`wget -q --timeout=10 -O "${tmpFile}" "${downloadUrl}"`, {
                stdio: 'pipe',
                timeout: 15000
              });
              downloaded = true;
            } catch (wgetError) {
              // Try 2: curl with SSL verification
              try {
                execSync(`curl -f -sS -L --max-time 10 -A "Mozilla/5.0" -o "${tmpFile}" "${downloadUrl}"`, {
                  stdio: 'pipe',
                  timeout: 15000
                });
                downloaded = true;
              } catch (curlError) {
                // Try 3: wget without SSL verification (for environments with SSL issues)
                try {
                  execSync(`wget -q --no-check-certificate --timeout=10 -O "${tmpFile}" "${downloadUrl}"`, {
                    stdio: 'pipe',
                    timeout: 15000
                  });
                  downloaded = true;
                } catch (wgetInsecureError) {
                  // Try 4: curl without SSL verification
                  execSync(`curl -f -sS -L -k --max-time 10 -A "Mozilla/5.0" -o "${tmpFile}" "${downloadUrl}"`, {
                    stdio: 'pipe',
                    timeout: 15000
                  });
                  downloaded = true;
                }
              }
            }

            if (!downloaded) {
              throw new Error('All download methods failed');
            }

            execSync(`tar -xzf "${tmpFile}" -C "${tmpExtractDir}"`, { stdio: 'pipe' });

            const nodeFiles = execSync(`find "${tmpExtractDir}" -name "*.node" 2>/dev/null || true`, {
              encoding: 'utf-8'
            }).trim().split('\n').filter(Boolean);

            if (nodeFiles.length > 0 && nodeFiles[0] && fs.existsSync(nodeFiles[0])) {
              fs.copyFileSync(nodeFiles[0], path.join(versionBuildDir, 'better_sqlite3.node'));
              successCount++;
            }
          } finally {
            if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
            if (fs.existsSync(tmpExtractDir)) fs.rmSync(tmpExtractDir, { recursive: true, force: true });
          }
        } catch (error) {
          // Silently skip unavailable prebuilds or download failures
        }
      }
    }
  }
}

console.log(`✓ Downloaded ${successCount}/${totalCount} prebuilds for all platforms`);

if (successCount === 0) {
  console.error('❌ Failed to download any prebuilds');
  console.error('');
  console.error('This usually means:');
  console.error('  1. Network connectivity issues with GitHub releases');
  console.error('  2. GitHub rate limiting');
  console.error('');
  console.error('Solutions:');
  console.error('  • Wait a few minutes and try again');
  console.error('  • Set VSCE_TARGET=<platform>-<arch> to build for specific platform only');
  console.error('    Example: VSCE_TARGET=linux-x64 npm run package');
  console.error('  • Or use locally built binary (current platform only):');
  console.error('    SKIP_PREBUILD_DOWNLOAD=1 npm run package');
  console.error('');

  // Check if user wants to skip prebuild download and use local build
  if (process.env.SKIP_PREBUILD_DOWNLOAD) {
    console.log('⚠ SKIP_PREBUILD_DOWNLOAD is set, using local build...');

    const localNodeFile = path.join(rootNodeModules, 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');

    if (fs.existsSync(localNodeFile)) {
      console.log('✓ Found locally built better_sqlite3.node');

      // Get current Node.js MODULE_VERSION
      const moduleVersion = process.versions.modules;
      const currentPlatform = process.platform;
      const currentArch = process.arch;

      console.log(`  Detected: Node.js MODULE_VERSION ${moduleVersion} (${currentPlatform}-${currentArch})`);

      // Copy to build/Release for backward compatibility
      fs.copyFileSync(localNodeFile, path.join(buildDir, 'better_sqlite3.node'));

      // IMPORTANT: Also copy to prebuilds structure so it can be found at runtime
      const prebuildDir = path.join(betterSqliteDest, 'prebuilds', `node-v${moduleVersion}`, currentPlatform, currentArch);
      fs.mkdirSync(prebuildDir, { recursive: true });
      fs.copyFileSync(localNodeFile, path.join(prebuildDir, 'better_sqlite3.node'));

      console.log(`✓ Copied to build/Release/ and prebuilds/node-v${moduleVersion}/${currentPlatform}/${currentArch}/`);

      // SMART MODE: Try to download common VSCode Node.js versions too
      console.log('');
      console.log('📦 Smart mode: Downloading common VSCode Node.js versions...');
      console.log('   (This allows the extension to work on any VSCode, regardless of your build Node.js version)');

      const commonVSCodeVersions = ['node-v115', 'node-v127']; // Node.js 20 and 22
      let downloadedCount = 0;

      for (const versionName of commonVSCodeVersions) {
        // Skip if this is the current version (already copied)
        if (versionName === `node-v${moduleVersion}`) {
          console.log(`   ⊙ ${versionName} - already included (your build version)`);
          continue;
        }

        const target = versionName.split('-v')[1];
        const prebuildName = `better-sqlite3-v${version}-${versionName}-${currentPlatform}-${currentArch}.tar.gz`;
        const downloadUrl = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${version}/${prebuildName}`;
        const versionBuildDir = path.join(betterSqliteDest, 'prebuilds', versionName, currentPlatform, currentArch);

        fs.mkdirSync(versionBuildDir, { recursive: true });

        const tmpFile = path.join('/tmp', `${prebuildName}-${Date.now()}`);
        const tmpExtractDir = path.join('/tmp', `better-sqlite3-extract-${Date.now()}`);

        try {
          fs.mkdirSync(tmpExtractDir, { recursive: true });

          // Try wget first, fall back to curl, fall back to insecure mode
          let downloaded = false;

          // Try 1: wget with SSL verification
          try {
            execSync(`wget -q --timeout=5 -O "${tmpFile}" "${downloadUrl}"`, {
              stdio: 'pipe',
              timeout: 10000
            });
            downloaded = true;
          } catch (wgetError) {
            // Try 2: curl with SSL verification
            try {
              execSync(`curl -f -sS -L --max-time 5 -A "Mozilla/5.0" -o "${tmpFile}" "${downloadUrl}"`, {
                stdio: 'pipe',
                timeout: 10000
              });
              downloaded = true;
            } catch (curlError) {
              // Try 3: wget without SSL verification (insecure but works)
              try {
                execSync(`wget -q --no-check-certificate --timeout=5 -O "${tmpFile}" "${downloadUrl}"`, {
                  stdio: 'pipe',
                  timeout: 10000
                });
                downloaded = true;
              } catch (wgetInsecureError) {
                // Try 4: curl without SSL verification (insecure but works)
                execSync(`curl -f -sS -L -k --max-time 5 -A "Mozilla/5.0" -o "${tmpFile}" "${downloadUrl}"`, {
                  stdio: 'pipe',
                  timeout: 10000
                });
                downloaded = true;
              }
            }
          }

          if (!downloaded) {
            throw new Error('All download methods failed');
          }

          execSync(`tar -xzf "${tmpFile}" -C "${tmpExtractDir}"`, { stdio: 'pipe' });

          const nodeFiles = execSync(`find "${tmpExtractDir}" -name "*.node" 2>/dev/null || true`, {
            encoding: 'utf-8'
          }).trim().split('\n').filter(Boolean);

          if (nodeFiles.length > 0 && nodeFiles[0] && fs.existsSync(nodeFiles[0])) {
            fs.copyFileSync(nodeFiles[0], path.join(versionBuildDir, 'better_sqlite3.node'));
            console.log(`   ✓ ${versionName} - downloaded from GitHub`);
            downloadedCount++;
          }
        } catch (error) {
          console.log(`   ✗ ${versionName} - download failed (not critical)`);
        } finally {
          if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
          if (fs.existsSync(tmpExtractDir)) fs.rmSync(tmpExtractDir, { recursive: true, force: true });
        }
      }

      console.log('');
      if (downloadedCount > 0) {
        console.log(`✓ Extension supports ${downloadedCount + 1} Node.js versions (works on most VSCode installations)`);
      } else {
        console.log(`⚠ Only local build included - extension will only work on VSCode with Node.js v${Math.floor(moduleVersion/10)}`);
        console.log('  (Downloads failed, but local build will still work if VSCode uses same Node.js version)');
      }
      console.log('  Note: This is a development build, not recommended for distribution');
    } else {
      console.error('❌ No locally built better_sqlite3.node found');
      console.error('Run "npm rebuild better-sqlite3" first');
      throw new Error('No compatible better-sqlite3 binaries available');
    }
  } else {
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
