# DevHub VSCode Extension - Publishing Guide

## Platform-Specific Packaging

The DevHub extension uses native dependencies (better-sqlite3, dockerode) that require platform-specific binaries. To support all users on the VSCode marketplace, we publish separate packages for each platform.

## Package Sizes by Platform

| Platform | Package Size | Files |
|----------|--------------|-------|
| linux-x64 | ~17 MB | 1780 |
| linux-arm64 | ~17 MB | 1780 |
| darwin-x64 | ~17 MB | 1780 |
| darwin-arm64 | ~17 MB | 1780 |
| win32-x64 | ~17 MB | 1780 |
| win32-arm64 | ~17 MB | 1780 |

**Total marketplace storage**: ~102 MB (6 platforms × 17 MB)

Compare to universal package: 77 MB but users download all platforms they don't need.

## Building Platform-Specific Packages

### Build for Current Platform (Testing)

```bash
npm run package
```

This creates `devhub-<platform>-<arch>-2.0.0.vsix` for your current platform.

### Build for Specific Platform

```bash
# Linux x64 (most common)
npm run package:linux-x64

# Linux ARM64 (Raspberry Pi, ARM servers)
npm run package:linux-arm64

# macOS Intel
npm run package:darwin-x64

# macOS Apple Silicon
npm run package:darwin-arm64

# Windows x64
npm run package:win32-x64

# Windows ARM64 (Surface Pro X)
npm run package:win32-arm64
```

### Build All Platforms

```bash
npm run package:all
```

This creates 6 .vsix files, one for each platform. Takes ~10-15 minutes.

**Note**: You can build for any platform from any machine. The script downloads prebuilds from GitHub releases.

## Publishing to Marketplace

### Prerequisites

1. **Install vsce**:
   ```bash
   npm install -g @vscode/vsce
   ```

2. **Get Personal Access Token (PAT)**:
   - Go to https://dev.azure.com
   - Create PAT with "Marketplace (Manage)" scope
   - Store securely

3. **Create Publisher** (first time only):
   ```bash
   vsce create-publisher <publisher-name>
   ```

### Publishing Single Platform

```bash
# Build platform-specific package
npm run package:linux-x64

# Publish
vsce publish --packagePath devhub-linux-x64-2.0.0.vsix
```

### Publishing All Platforms

```bash
# Build all platforms
npm run package:all

# Publish all at once
vsce publish \
  --packagePath devhub-linux-x64-2.0.0.vsix \
  --packagePath devhub-linux-arm64-2.0.0.vsix \
  --packagePath devhub-darwin-x64-2.0.0.vsix \
  --packagePath devhub-darwin-arm64-2.0.0.vsix \
  --packagePath devhub-win32-x64-2.0.0.vsix \
  --packagePath devhub-win32-arm64-2.0.0.vsix
```

**Or use a single command**:

```bash
# Build and publish all platforms
npm run package:all && \
vsce publish --packagePath devhub-*-2.0.0.vsix
```

### Publishing with PAT from Environment

```bash
export VSCE_PAT=<your-personal-access-token>
vsce publish --packagePath devhub-*-2.0.0.vsix
```

## How Platform Selection Works

When users install from marketplace:
1. VSCode detects user's platform/arch
2. Downloads the matching .vsix file
3. Users only download what they need (~17 MB)

## Testing Locally

### Test Current Platform

```bash
# Build for your platform
npm run package:linux-x64  # or your platform

# Install
code --install-extension devhub-linux-x64-2.0.0.vsix

# Reload VSCode
```

### Test in Remote/SSH

The extension automatically detects if running in:
- **Desktop VSCode** (Electron) - Uses electron-vXXX prebuilds
- **Remote VSCode** (Node.js) - Uses node-vXXX prebuilds

Both scenarios are covered by the same package.

## Versioning

To publish a new version:

1. **Update version** in `package.json`:
   ```json
   {
     "version": "2.0.1"
   }
   ```

2. **Build all platforms**:
   ```bash
   npm run package:all
   ```

3. **Publish**:
   ```bash
   vsce publish --packagePath devhub-*-2.0.1.vsix
   ```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Publish VSCode Extension

on:
  release:
    types: [published]

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: linux-x64
          - os: ubuntu-latest
            target: linux-arm64
          - os: macos-latest
            target: darwin-x64
          - os: macos-latest
            target: darwin-arm64
          - os: windows-latest
            target: win32-x64
          - os: windows-latest
            target: win32-arm64

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build platform-specific package
        run: npm run package:${{ matrix.target }}

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: vsix-${{ matrix.target }}
          path: '*.vsix'

  publish:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v3

      - name: Publish to marketplace
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
        run: |
          npm install -g @vscode/vsce
          vsce publish --packagePath vsix-*/*.vsix
```

## Troubleshooting

### "Cannot find module" errors

The package includes all dependencies. If you see this:
1. Ensure you're testing on the correct platform
2. Rebuild with `npm run package:<your-platform>`
3. Check `dist/node_modules` has all packages

### Package too large

Current size (~17 MB per platform) is acceptable for VSCode marketplace.

If needed to reduce:
- Remove unused dependencies
- Exclude source maps (`sourcemap: false` in esbuild.js)
- Compress with `.vscodeignore` patterns

### Wrong prebuild selected

The nativeLoader.ts automatically selects the correct prebuild based on:
- `process.versions.electron` (desktop VSCode)
- `process.versions.modules` (Node.js version)
- `process.platform` (OS)
- `process.arch` (CPU architecture)

If wrong prebuild is selected, check the console logs in Output panel.

## Maintenance

### Adding New Dependency

If adding a new npm package with native bindings:

1. Add to `dockerodeDeps` array in `scripts/prepare-package.js`
2. Or use `copyEntirePackage('package-name')`
3. Test build: `npm run package`

### Updating better-sqlite3

When updating better-sqlite3 version:

1. Update in `package.json`
2. Run `npm install`
3. Test: `npm run package`
4. Script automatically downloads new prebuilds

### Supporting New VSCode Version

If new VSCode version uses new Electron/Node.js version:

1. Check NODE_MODULE_VERSION at https://nodejs.org/api/process.html#process_process_versions
2. Add mapping to `nativeLoader.ts`:
   ```typescript
   '133': 'electron-v140',  // New Electron version
   ```
3. Add to `runtimeVersions` array in `prepare-package.js`
4. Rebuild and test

## Best Practices

1. **Test before publishing**: Always test on your platform first
2. **Version consistently**: Keep package.json version in sync across all platforms
3. **Use semantic versioning**: Major.Minor.Patch
4. **Changelog**: Update CHANGELOG.md with each release
5. **Git tags**: Tag releases in git matching package version

## Support

For issues with packaging or publishing:
- Check VSCode extension guidelines: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- vsce documentation: https://github.com/microsoft/vscode-vsce
- Platform-specific extensions: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#platformspecific-extensions
