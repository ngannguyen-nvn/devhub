# DevHub E2E Testing Guide

This document describes the end-to-end (e2e) testing setup for DevHub using Playwright.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## Overview

DevHub uses [Playwright](https://playwright.dev/) for end-to-end testing. The test suite covers all major features:

- **Workspace Management** - Creating, updating, deleting workspaces and snapshots
- **Repository Dashboard** - Scanning for git repositories, displaying repo information
- **Service Manager** - CRUD operations, starting/stopping services, viewing logs
- **Docker Management** - Building images, managing containers, viewing logs
- **Environment Variables** - Creating profiles, managing variables, secrets masking
- **Wiki/Notes System** - Creating notes, markdown rendering, search, linking

### Test Statistics

- **Total Test Files:** 6
- **Total Test Cases:** 80+
- **Coverage:** All critical user workflows
- **Browser:** Chromium (can be extended to Firefox, Safari)

---

## Setup

### Prerequisites

- Node.js 18+ installed
- npm 9+ installed
- DevHub application installed (see main README.md)

### Installation

1. **Install dependencies:**

```bash
npm install
```

2. **Install Playwright browsers:**

```bash
npm run test:install
```

This installs the Chromium browser needed for running tests.

### Environment Setup

The tests expect both frontend and backend servers to be running:

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5000

The Playwright configuration includes a `webServer` setup that automatically starts both servers before running tests.

---

## Running Tests

### Run All Tests (Headless)

```bash
npm run test:e2e
```

This runs all tests in headless mode (no browser window visible).

### Run Tests with UI

```bash
npm run test:e2e:ui
```

Opens Playwright's interactive UI for running and debugging tests.

### Run Tests with Browser Visible

```bash
npm run test:e2e:headed
```

Runs tests with the browser window visible - useful for watching test execution.

### Debug Tests

```bash
npm run test:e2e:debug
```

Runs tests in debug mode with Playwright Inspector for step-by-step debugging.

### Run Specific Test File

```bash
npx playwright test e2e/tests/workspaces.spec.ts
```

### Run Specific Test

```bash
npx playwright test -g "should create a new workspace"
```

### View Test Report

After tests run, view the HTML report:

```bash
npm run test:e2e:report
```

---

## Test Structure

```
devhub/
├── e2e/
│   ├── fixtures/
│   │   └── test-data.ts           # Reusable test data
│   ├── helpers/
│   │   └── test-helpers.ts        # Helper functions
│   ├── tests/
│   │   ├── workspaces.spec.ts             # Workspace management tests
│   │   ├── repository-dashboard.spec.ts   # Repository dashboard tests
│   │   ├── service-manager.spec.ts        # Service manager tests
│   │   ├── docker-management.spec.ts      # Docker management tests
│   │   ├── environment-variables.spec.ts  # Environment variables tests
│   │   └── wiki-notes.spec.ts             # Wiki/notes system tests
│   └── screenshots/                # Test screenshots (on failure)
├── playwright.config.ts            # Playwright configuration
├── playwright-report/              # Test reports (generated)
└── TESTING.md                      # This file
```

---

## Writing Tests

### Test File Template

```typescript
import { test, expect } from '@playwright/test';
import { navigateToSection, waitForToast, fillField, clickButton } from '../helpers/test-helpers';

test.describe('Feature Name', () => {
  let createdResourceIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await navigateToSection(page, 'Feature');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup created resources
    for (const id of createdResourceIds) {
      await page.evaluate(async (resourceId) => {
        await fetch(`http://localhost:5000/api/resources/${resourceId}`, {
          method: 'DELETE',
        });
      }, id);
    }
    createdResourceIds = [];
  });

  test('should perform action', async ({ page }) => {
    // Test implementation
  });
});
```

### Available Helper Functions

Located in `e2e/helpers/test-helpers.ts`:

- `navigateToSection(page, sectionName)` - Navigate to a section via sidebar
- `waitForToast(page, message?)` - Wait for toast notification
- `fillField(page, selector, value)` - Fill form field with value
- `clickButton(page, selector)` - Click button and wait
- `waitForElement(page, selector)` - Wait for element to be visible
- `cleanupTestData(page, context)` - Clean up test resources
- `uniqueName(base)` - Generate unique name for test resources

### Test Data Fixtures

Located in `e2e/fixtures/test-data.ts`:

- `testWorkspace` - Sample workspace data
- `testService` - Sample service data
- `testEnvProfile` - Sample environment profile data
- `testNote` - Sample note data
- `uniqueName(base)` - Helper to generate unique names

### Best Practices

1. **Use data-testid attributes** for reliable element selection:
   ```html
   <div data-testid="service-list">...</div>
   ```

2. **Clean up after tests** - Always delete created resources in `afterEach`

3. **Use unique names** - Use `uniqueName()` to avoid conflicts between test runs

4. **Wait for actions to complete** - Use `waitForToast()` or `page.waitForResponse()`

5. **Handle different implementations** - Use `.catch()` for fallback selectors:
   ```typescript
   await page.click('button:has-text("Delete")').catch(() => {
     page.click('button[aria-label="Delete"]');
   });
   ```

6. **Make tests resilient** - Don't rely on hardcoded delays, use proper waiting

### Example Test

```typescript
test('should create a new service', async ({ page }) => {
  const serviceName = uniqueName('Test Service');

  // Navigate to services
  await navigateToSection(page, 'Services');

  // Click create button
  await clickButton(page, 'button:has-text("Create Service")');

  // Fill form
  await fillField(page, 'input[name="name"]', serviceName);
  await fillField(page, 'input[name="repoPath"]', '/home/user/devhub');
  await fillField(page, 'input[name="command"]', 'echo "test"');

  // Capture response to get created service ID
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/services')
  );

  // Submit form
  await clickButton(page, 'button[type="submit"]:has-text("Create")');

  // Verify creation
  const response = await responsePromise;
  const data = await response.json();

  expect(data.success).toBe(true);
  createdServiceIds.push(data.data.id);

  // Verify in UI
  await waitForToast(page);
  await expect(page.locator(`text="${serviceName}"`)).toBeVisible();
});
```

---

## CI/CD Integration

### GitHub Actions

The project includes a GitHub Actions workflow (`.github/workflows/e2e-tests.yml`) that:

1. Runs on every push to `main` and `claude/**` branches
2. Runs on pull requests to `main`
3. Sets up Node.js 18
4. Installs dependencies
5. Installs Playwright browsers
6. Builds the application
7. Runs all e2e tests
8. Uploads test reports and screenshots as artifacts

### Viewing CI Results

After a GitHub Actions run:

1. Go to the Actions tab in your GitHub repository
2. Click on the workflow run
3. Download artifacts:
   - `playwright-report` - Full HTML test report
   - `test-screenshots` - Screenshots from failed tests (if any)

---

## Configuration

### Playwright Config (`playwright.config.ts`)

Key settings:

- **testDir:** `./e2e` - Location of test files
- **timeout:** 60 seconds per test
- **workers:** 1 - Run tests serially (to avoid database conflicts)
- **retries:** 2 in CI, 0 locally
- **baseURL:** http://localhost:3000
- **browsers:** Chromium (can add Firefox, WebKit)

### Customizing Configuration

Edit `playwright.config.ts` to:

- Add more browsers:
  ```typescript
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ]
  ```

- Change timeouts:
  ```typescript
  timeout: 120 * 1000, // 2 minutes
  ```

- Adjust workers (parallel execution):
  ```typescript
  workers: process.env.CI ? 1 : 3,
  ```

---

## Troubleshooting

### Tests Fail Immediately

**Problem:** Tests fail with "net::ERR_CONNECTION_REFUSED"

**Solution:** Make sure both frontend and backend are running:
```bash
npm run dev
```

Or rely on Playwright's auto-start (configured in `playwright.config.ts`).

### Browser Download Fails

**Problem:** `playwright install` fails with 403 error

**Solution:** This can happen in restricted environments. Try:
```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
# Then install browsers manually
npx playwright install chromium
```

### Tests Are Flaky

**Problem:** Tests pass sometimes, fail other times

**Solution:**
1. Avoid hardcoded `page.waitForTimeout()` - use proper waits
2. Use `page.waitForResponse()` for API calls
3. Use `waitForElement()` helper for UI elements
4. Increase timeout for slow operations

### Database Conflicts

**Problem:** Tests interfere with each other

**Solution:**
- Tests run serially by default (`workers: 1`)
- Use `uniqueName()` for all test resources
- Clean up in `afterEach` hooks

### Screenshots Not Captured

**Problem:** No screenshots on test failure

**Solution:** Check `playwright.config.ts`:
```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

### Debugging Tips

1. **Run with UI:** `npm run test:e2e:ui`
2. **Run headed:** `npm run test:e2e:headed`
3. **Use debug mode:** `npm run test:e2e:debug`
4. **Add console.log:** Check Playwright terminal output
5. **Pause test:** Add `await page.pause()` in your test
6. **Inspect element:** Use browser DevTools in headed mode

---

## Test Coverage

### Workspace Management (10 tests)
- ✅ Display workspaces section
- ✅ Create workspace manually
- ✅ Activate workspace
- ✅ Update workspace details
- ✅ Create snapshot in workspace
- ✅ Delete workspace with cascade
- ✅ Scan folder and create workspace
- ✅ Display workspace hierarchy
- ✅ Restore snapshot
- ✅ Resource isolation between workspaces

### Repository Dashboard (10 tests)
- ✅ Display dashboard
- ✅ Scan for repositories
- ✅ Display repository details
- ✅ Detect Dockerfiles
- ✅ Show uncommitted changes
- ✅ Handle different scan depths
- ✅ Handle scan errors
- ✅ Auto-refresh repository list
- ✅ Display loading state
- ✅ Sort repositories

### Service Manager (13 tests)
- ✅ Display services section
- ✅ Create new service
- ✅ Update service configuration
- ✅ Delete service
- ✅ Start service
- ✅ Stop service
- ✅ View service logs
- ✅ Handle service errors
- ✅ Auto-refresh service list
- ✅ Workspace-scoped services
- ✅ Service count display
- ✅ Service status indicators
- ✅ Log streaming

### Docker Management (13 tests)
- ✅ Display Docker section
- ✅ List Docker images
- ✅ Build Docker image
- ✅ Remove Docker image
- ✅ Run container from image
- ✅ List containers
- ✅ Start and stop container
- ✅ View container logs
- ✅ Remove container
- ✅ Generate docker-compose.yml
- ✅ Display Docker daemon info
- ✅ Filter containers by status
- ✅ Search for images

### Environment Variables (13 tests)
- ✅ Display environment section
- ✅ Create environment profile
- ✅ Update profile
- ✅ Delete profile
- ✅ Add environment variable
- ✅ Mask secret values in UI
- ✅ Update environment variable
- ✅ Delete environment variable
- ✅ Import .env file
- ✅ Export to .env format
- ✅ Apply profile to service
- ✅ Workspace-scoped profiles
- ✅ Secret encryption

### Wiki/Notes System (14 tests)
- ✅ Display wiki section
- ✅ Create new note
- ✅ Create note from template
- ✅ Update note
- ✅ Delete note
- ✅ Render markdown content
- ✅ Live markdown preview
- ✅ Full-text search
- ✅ Bidirectional linking
- ✅ Display backlinks
- ✅ Filter by category
- ✅ Filter by tags
- ✅ Workspace-scoped notes
- ✅ Export note

**Total:** 73+ test cases covering all major features

---

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

---

## Contributing

When adding new features to DevHub:

1. Write e2e tests for the new functionality
2. Follow the existing test structure
3. Use helper functions from `test-helpers.ts`
4. Add test data to `test-data.ts` if needed
5. Ensure tests pass before committing
6. Update this documentation if needed

---

**Happy Testing!** 🚀

If you encounter any issues or have questions, please open an issue on GitHub.
