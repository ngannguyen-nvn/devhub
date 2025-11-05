# Packaging DevHub VSCode Extension

## The Native Dependency Challenge

DevHub uses `better-sqlite3`, which requires native binaries (.node files) compiled for specific:
- **Runtime**: Node.js or Electron
- **Platform**: linux, darwin (macOS), win32 (Windows)
- **Architecture**: x64, arm64, etc.

VSCode extensions can run in different environments (desktop, remote, web), each with different Node.js/Electron versions.

## Recommended Approach: Platform-Specific Builds

The VSCode marketplace supports platform-specific extensions. This is the recommended way to distribute extensions with native dependencies.

### Build for Specific Platform

```bash
# For Linux x64
VSCE_TARGET=linux-x64 npm run package

# For macOS x64
VSCE_TARGET=darwin-x64 npm run package

# For macOS ARM64 (M1/M2)
VSCE_TARGET=darwin-arm64 npm run package

# For Windows x64
VSCE_TARGET=win32-x64 npm run package
```

### Publish Platform-Specific Builds

```bash
# Publish for Linux
vsce publish --target linux-x64

# Publish for all platforms
vsce publish --target linux-x64 darwin-x64 darwin-arm64 win32-x64
```

## Local Development: Quick Build

For local development and testing on your current platform only:

```bash
# Uses your locally built better-sqlite3 binary
# ⚠️ Only works on Node.js version similar to yours
SKIP_PREBUILD_DOWNLOAD=1 npm run package
```

**Warning**: This creates an extension that only works on your specific Node.js version. Not suitable for distribution.

## Troubleshooting

### "Module was compiled against different Node.js version"

This error means the .node binary was compiled for a different Node.js version than VSCode is using.

**Solution**: Rebuild the extension on the target platform or use platform-specific packaging.

### "Failed to download any prebuilds"

GitHub rate limiting or network issues are preventing prebuild downloads.

**Solutions**:
1. Wait a few minutes and try again
2. Use platform-specific build: `VSCE_TARGET=linux-x64 npm run package`
3. Use local build (dev only): `SKIP_PREBUILD_DOWNLOAD=1 npm run package`

### Testing on Remote VSCode

VSCode remote environments (SSH, WSL, Containers) use different Node.js versions than desktop VSCode.

**Solution**: Build platform-specific package for the remote environment's platform.

## Architecture Overview

```
packages/vscode-extension/
├── dist/
│   └── node_modules/
│       └── better-sqlite3/
│           ├── lib/           # JavaScript code
│           ├── build/Release/ # Legacy location for .node file
│           └── prebuilds/     # New structure for multiple versions
│               ├── node-v115/
│               ├── node-v127/ # Node.js 22 LTS
│               ├── node-v137/ # Node.js 22 latest
│               ├── electron-v130/
│               └── ...
└── devhub-2.0.0.vsix
```

The `prepare-package.js` script tries to download prebuilds for all runtime versions to support different VSCode environments.

## References

- [VSCode: Platform-specific extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#platformspecific-extensions)
- [better-sqlite3 documentation](https://github.com/WiseLibs/better-sqlite3)
- [Node.js MODULE_VERSION reference](https://nodejs.org/en/download/releases/)
