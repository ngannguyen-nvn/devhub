# Contributing to DevHub

Thank you for your interest in contributing to DevHub! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- Docker (optional, for Docker features)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/ngannguyen-nvn/devhub.git
cd devhub

# Install dependencies
npm install

# Start development servers
npm run dev
```

This starts:
- Frontend at http://localhost:3000
- Backend at http://localhost:5000

## Project Structure

```
devhub/
├── packages/core/       # Shared business logic
├── backend/             # Express API server
├── frontend/            # React + Vite web UI
├── packages/vscode-extension/  # VSCode extension
└── shared/              # TypeScript types
```

## Development Workflow

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the coding standards

3. Test your changes:
   ```bash
   npm run type-check
   npm run lint
   ```

4. Commit with a descriptive message:
   ```bash
   git commit -m "feat: add new feature description"
   ```

### Commit Message Format

We follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### Pull Requests

1. Push your branch to GitHub
2. Open a Pull Request against `main`
3. Fill out the PR template
4. Wait for review

## Coding Standards

### TypeScript

- Use strict mode
- Prefer interfaces over types
- Add types for all function parameters and returns

### React Components

- Use functional components with hooks
- Keep components focused and small
- Use descriptive prop names

### Code Style

- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multiline

## Testing

### Running Tests

```bash
# E2E tests
npm run test:e2e

# Type checking
npm run type-check
```

### Writing Tests

- Place E2E tests in `e2e/` directory
- Use descriptive test names
- Test both success and error cases

## Areas for Contribution

### Good First Issues

Look for issues labeled `good first issue` on GitHub.

### Feature Ideas

- Improve Docker integration
- Add new wiki templates
- Enhance service monitoring
- UI/UX improvements

## Questions?

- Open a GitHub issue for bugs or features
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
