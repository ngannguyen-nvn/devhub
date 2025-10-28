# E2E Tests

This directory contains end-to-end tests for DevHub using Playwright.

## Directory Structure

```
e2e/
├── fixtures/
│   └── test-data.ts           # Reusable test data and fixtures
├── helpers/
│   └── test-helpers.ts        # Helper functions for tests
├── tests/
│   ├── workspaces.spec.ts             # Workspace management tests
│   ├── repository-dashboard.spec.ts   # Repository dashboard tests
│   ├── service-manager.spec.ts        # Service manager tests
│   ├── docker-management.spec.ts      # Docker management tests
│   ├── environment-variables.spec.ts  # Environment variables tests
│   └── wiki-notes.spec.ts             # Wiki/notes system tests
├── screenshots/                # Screenshots captured during test runs
└── README.md                   # This file
```

## Quick Start

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run test:install

# Run all tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui
```

## Test Files

### `workspaces.spec.ts`
Tests for workspace and snapshot management including:
- Creating/updating/deleting workspaces
- Creating/restoring snapshots
- Workspace hierarchy
- Workspace activation and switching

### `repository-dashboard.spec.ts`
Tests for repository scanning and dashboard including:
- Scanning directories for git repositories
- Displaying repository information
- Detecting Dockerfiles
- Handling different scan depths

### `service-manager.spec.ts`
Tests for service management including:
- CRUD operations for services
- Starting and stopping services
- Viewing service logs
- Workspace-scoped services

### `docker-management.spec.ts`
Tests for Docker integration including:
- Building Docker images
- Managing containers
- Viewing container logs
- Generating docker-compose.yml

### `environment-variables.spec.ts`
Tests for environment variables including:
- Creating environment profiles
- Managing variables
- Secret masking
- Importing/exporting .env files

### `wiki-notes.spec.ts`
Tests for wiki/notes system including:
- Creating and editing notes
- Markdown rendering
- Full-text search
- Bidirectional linking
- Templates and categories

## Helper Functions

### Navigation
- `navigateToSection(page, sectionName)` - Navigate to a section via sidebar
- `waitForPageLoad(page)` - Wait for page to fully load

### Interactions
- `fillField(page, selector, value)` - Fill a form field
- `clickButton(page, selector)` - Click a button
- `waitForElement(page, selector)` - Wait for element to appear

### Utilities
- `waitForToast(page, message?)` - Wait for toast notification
- `cleanupTestData(page, context)` - Clean up test resources
- `uniqueName(base)` - Generate unique names for test data

### Workspace Helpers
- `switchWorkspace(page, workspaceName)` - Switch active workspace
- `createAndActivateWorkspace(page, name, description)` - Create and activate workspace

## Test Data Fixtures

Available in `fixtures/test-data.ts`:

```typescript
import { testWorkspace, testService, testNote, uniqueName } from '../fixtures/test-data';

// Use in tests
const workspaceName = uniqueName(testWorkspace.name);
```

## Writing New Tests

1. Create a new `.spec.ts` file in the `tests/` directory
2. Import necessary helpers and fixtures
3. Set up `beforeEach` and `afterEach` hooks for setup/cleanup
4. Write test cases using `test()` and `expect()`
5. Use helper functions for common operations

Example:

```typescript
import { test, expect } from '@playwright/test';
import { navigateToSection, fillField, clickButton, uniqueName } from '../helpers/test-helpers';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await navigateToSection(page, 'Feature');
  });

  test('should perform action', async ({ page }) => {
    // Your test code here
  });
});
```

## Best Practices

1. **Always clean up** - Delete created resources in `afterEach`
2. **Use unique names** - Avoid conflicts with `uniqueName()`
3. **Wait properly** - Use Playwright's built-in waiting mechanisms
4. **Be resilient** - Provide fallback selectors with `.catch()`
5. **Test isolation** - Each test should be independent

## Running Tests

See the main [TESTING.md](../TESTING.md) for detailed information on running and debugging tests.

## CI/CD

Tests automatically run on:
- Push to `main` or `claude/**` branches
- Pull requests to `main`

Results are available in the GitHub Actions tab with downloadable reports and screenshots.
