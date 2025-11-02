/**
 * Copy native dependencies into dist for packaging
 * This avoids workspace hoisting issues and reduces package size
 */

const fs = require('fs');
const path = require('path');

const rootNodeModules = path.join(__dirname, '../../../node_modules');
const distDir = path.join(__dirname, '../dist');
const nativeModulesDir = path.join(distDir, 'node_modules');

// Ensure dist/node_modules exists
if (!fs.existsSync(nativeModulesDir)) {
  fs.mkdirSync(nativeModulesDir, { recursive: true });
}

// Copy better-sqlite3 (only essential files)
const betterSqliteFiles = [
  { src: 'build/Release/better_sqlite3.node', required: true },
  { src: 'lib', required: true },
  { src: 'package.json', required: true },
];

copyEssentialFiles('better-sqlite3', betterSqliteFiles);

// Copy dockerode (only essential files)
const dockerodeFiles = [
  { src: 'lib', required: true },
  { src: 'package.json', required: true },
];

copyEssentialFiles('dockerode', dockerodeFiles);

console.log('✓ Native dependencies prepared for packaging');

function copyEssentialFiles(packageName, files) {
  const srcRoot = path.join(rootNodeModules, packageName);
  const destRoot = path.join(nativeModulesDir, packageName);

  if (!fs.existsSync(srcRoot)) {
    console.warn(`⚠ ${packageName} not found in root node_modules`);
    return;
  }

  console.log(`Copying ${packageName} essential files...`);

  // Remove destination if exists
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
      // Ensure parent directory exists
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
