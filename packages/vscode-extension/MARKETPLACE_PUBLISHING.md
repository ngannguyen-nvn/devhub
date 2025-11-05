# Publishing DevHub to VSCode Marketplace

## ⚠️ Critical: Native Dependencies

DevHub uses `better-sqlite3`, which requires native binaries for different platforms and Node.js versions.

## Local Development vs Marketplace

### Local Development (package:dev)
```bash
npm run package:dev
```
- ✅ Fast (5 seconds)
- ✅ Small package (4 MB)
- ❌ Only works on YOUR Node.js version
- ❌ NOT suitable for marketplace

### Marketplace Publishing
```bash
# For specific platform (recommended)
npm run package:linux-x64
npm run package:darwin-x64
npm run package:darwin-arm64
npm run package:win32-x64

# Or all platforms at once
npm run package:all
```
- ✅ Downloads prebuilds for ALL runtime versions
- ✅ Works for all users regardless of VSCode version
- ✅ Suitable for marketplace
- ⏱️ Slower (downloads ~15 prebuilds per platform)
- 📦 Larger package (~17 MB)

## Publishing Steps

### 1. Build Platform-Specific Packages

On your development machine (NOT in sandbox):

```bash
cd packages/vscode-extension

# Build for each platform
npm run package:linux-x64      # Creates devhub-linux-x64-2.0.0.vsix
npm run package:darwin-x64     # Creates devhub-darwin-x64-2.0.0.vsix
npm run package:darwin-arm64   # Creates devhub-darwin-arm64-2.0.0.vsix
npm run package:win32-x64      # Creates devhub-win32-x64-2.0.0.vsix
```

**Note**: The script will download prebuilds from GitHub. This should work on your machine (not blocked like in the sandbox).

### 2. Test Before Publishing

Install and test each platform package:
```bash
code --install-extension devhub-linux-x64-2.0.0.vsix
```

### 3. Publish to Marketplace

```bash
# Install vsce globally if not already installed
npm install -g @vscode/vsce

# Publish each platform
vsce publish --packagePath devhub-linux-x64-2.0.0.vsix
vsce publish --packagePath devhub-darwin-x64-2.0.0.vsix
vsce publish --packagePath devhub-darwin-arm64-2.0.0.vsix
vsce publish --packagePath devhub-win32-x64-2.0.0.vsix
```

Or publish all at once:
```bash
vsce publish --target linux-x64 darwin-x64 darwin-arm64 win32-x64
```

## Troubleshooting Downloads

If prebuild downloads fail on your machine:

### Check Network Access
```bash
# Test if you can download from GitHub
wget https://github.com/WiseLibs/better-sqlite3/releases/download/v12.4.1/better-sqlite3-v12.4.1-node-v127-linux-x64.tar.gz
```

### Solutions if Downloads Fail

1. **Use CI/CD**: GitHub Actions, GitLab CI, etc. have unrestricted GitHub access
2. **Download manually**:
   - Download prebuilds from https://github.com/WiseLibs/better-sqlite3/releases
   - Place in `dist/node_modules/better-sqlite3/prebuilds/`
3. **Build on platform**: Build on actual Linux/macOS/Windows machines

## CI/CD Publishing (Recommended)

Create `.github/workflows/publish-extension.yml`:

```yaml
name: Publish VSCode Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Build and publish
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
        run: |
          cd packages/vscode-extension
          npm install -g @vscode/vsce
          npm run package:linux-x64
          npm run package:darwin-x64
          npm run package:darwin-arm64
          npm run package:win32-x64
          vsce publish --packagePath *.vsix
```

## Expected Package Sizes

| Package Type | Size | Prebuilds |
|-------------|------|-----------|
| package:dev | 4 MB | 1 runtime (your version) |
| package:linux-x64 | ~17 MB | 15 runtimes (all versions) |
| package:darwin-x64 | ~17 MB | 15 runtimes (all versions) |
| package:win32-x64 | ~17 MB | 15 runtimes (all versions) |

## What Gets Downloaded

For each platform, the script downloads prebuilds for:

**Electron versions** (desktop VSCode):
- electron-v121 (Electron 26.x - VSCode 1.82-1.83)
- electron-v123 (Electron 27.x - VSCode 1.83-1.84)
- electron-v125, v128, v130, v132, v133, v135, v136, v139

**Node.js versions** (remote/server VSCode):
- node-v115 (Node.js 20)
- node-v127 (Node.js 22)
- node-v131 (Node.js 23)

This ensures the extension works across all VSCode versions and environments.

## Verification

After publishing, test on:
- ✅ Fresh VSCode install
- ✅ Remote SSH
- ✅ WSL
- ✅ Different VSCode versions

## References

- [VSCode: Platform-specific extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#platformspecific-extensions)
- [better-sqlite3 prebuilds](https://github.com/WiseLibs/better-sqlite3/releases)
- [VSCode Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
