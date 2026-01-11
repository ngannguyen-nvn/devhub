# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in DevHub, please report it responsibly.

### How to Report

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. Email the maintainer directly or use GitHub's private vulnerability reporting feature
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- Acknowledgment within 48 hours
- Status update within 7 days
- Fix timeline based on severity

### Scope

This policy applies to:
- DevHub web application
- DevHub VSCode extension
- @devhub/core package

## Security Best Practices

### For Users

1. **Set encryption keys in production:**
   ```bash
   export DEVHUB_MASTER_KEY="your-secure-32-byte-key"
   export ENCRYPTION_KEY="your-secure-32-byte-key"
   ```

2. **Never commit .env files** with real credentials

3. **Keep DevHub updated** to the latest version

### Security Features

- AES-256-GCM encryption for environment variables
- No external network calls (fully local)
- SQLite database stored locally
- No telemetry or analytics

## Known Security Considerations

1. **Local-only tool**: DevHub is designed for local development and does not include authentication. Do not expose it to public networks.

2. **Default encryption keys**: Development fallback keys exist for convenience. Always set custom keys for any sensitive data.

3. **Process management**: DevHub can start/stop processes on your machine. Only add trusted services.
