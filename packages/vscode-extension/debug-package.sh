#!/bin/bash

echo "===== DevHub Extension Debug Info ====="
echo ""

# Check if .vsix exists
if [ -f "devhub-2.0.0.vsix" ]; then
    echo "✓ Package found: devhub-2.0.0.vsix"
    ls -lh devhub-2.0.0.vsix
    echo ""
else
    echo "❌ Package not found: devhub-2.0.0.vsix"
    echo ""
fi

# Check dist directory
echo "Checking dist/node_modules/better-sqlite3 structure:"
echo "---------------------------------------------------"

if [ -d "dist/node_modules/better-sqlite3" ]; then
    echo "✓ better-sqlite3 directory exists"
    echo ""

    # Check build/Release
    if [ -f "dist/node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
        echo "✓ Found: build/Release/better_sqlite3.node"
        ls -lh dist/node_modules/better-sqlite3/build/Release/better_sqlite3.node
    else
        echo "❌ Missing: build/Release/better_sqlite3.node"
    fi
    echo ""

    # Check prebuilds directory
    if [ -d "dist/node_modules/better-sqlite3/prebuilds" ]; then
        echo "✓ Prebuilds directory exists"
        echo ""
        echo "Contents of prebuilds directory:"
        find dist/node_modules/better-sqlite3/prebuilds -name "*.node" -type f | while read f; do
            echo "  ✓ $f"
            ls -lh "$f"
        done
    else
        echo "❌ Missing: prebuilds directory"
        echo ""
        echo "This is the problem! The prebuilds directory is missing."
        echo "You need to rebuild with the latest script."
    fi
else
    echo "❌ dist/node_modules/better-sqlite3 does not exist"
    echo ""
    echo "You need to run: npm run package:dev"
fi

echo ""
echo "===== Instructions ====="
echo "If prebuilds directory is missing, run these commands:"
echo ""
echo "  cd /home/nnguyen/docs/devhub/packages/vscode-extension"
echo "  rm -rf dist devhub-2.0.0.vsix"
echo "  git pull origin claude/fix-environment-profiles-display-011CUobhPAxNQYKgeYnujjM5"
echo "  npm run package:dev"
echo ""
echo "Expected output should show:"
echo "  Detected: Node.js MODULE_VERSION XXX (linux-x64)"
echo "  ✓ Copied to build/Release/ and prebuilds/node-vXXX/linux/x64/"
