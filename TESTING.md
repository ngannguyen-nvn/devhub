# DevHub E2E Testing Guide

End-to-end testing for DevHub using Playwright.

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

## Test Scripts

```bash
npm run test:e2e           # Run all tests (headless)
npm run test:e2e:ui        # Interactive UI mode
npm run test:e2e:headed    # Watch tests in browser
npm run test:e2e:debug     # Step-by-step debugging
npm run test:e2e:report    # View HTML report
npm run test:install       # Install browsers
```

## Test Structure

```
e2e/
├── fixtures/
│   └── test-data.ts           # Test data and utilities
├── helpers/
│   └── test-helpers.ts        # Reusable helper functions
└── tests/
    ├── workspaces.spec.ts             # Workspace tests (10)
    ├── repository-dashboard.spec.ts   # Repository tests (10)
    ├── service-manager.spec.ts        # Service tests (13)
    ├── docker-management.spec.ts      # Docker tests (13)
    ├── environment-variables.spec.ts  # Environment tests (13)
    └── wiki-notes.spec.ts             # Wiki/notes tests (14)
```

**Total: 73+ test cases**

## Running Tests Locally

### All Tests
```bash
npm run test:e2e
```

### Specific Test File
```bash
npx playwright test e2e/tests/workspaces.spec.ts
```

### Specific Test
```bash
npx playwright test -g "should create a new workspace"
```

### Different Browser
```bash
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Running Tests on GitHub

**Manual trigger only** - Tests don't run automatically.

### How to Run:

1. Go to: `https://github.com/ngannguyen-nvn/devhub/actions`
2. Click "E2E Tests" workflow
3. Click "Run workflow" button
4. Choose options:
   - **Browser:** chromium/firefox/webkit/all
   - **Test file:** Specific test or leave empty for all
   - **Headed mode:** Check for debugging
5. Click "Run workflow"

### Download Test Results:

After tests complete, download artifacts:
- `playwright-report` - Full HTML report
- `test-screenshots` - Screenshots (if tests failed)

## Writing Tests

### Basic Test Template

```typescript
import { test, expect } from '@playwright/test';
import { navigateToSection, fillField, clickButton, uniqueName } from '../helpers/test-helpers';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await navigateToSection(page, 'Feature');
  });

  test('should do something', async ({ page }) => {
    const name = uniqueName('Test Item');

    await clickButton(page, 'button:has-text("Create")');
    await fillField(page, 'input[name="name"]', name);
    await clickButton(page, 'button[type="submit"]');

    await expect(page.locator(`text="${name}"`)).toBeVisible();
  });
});
```

### Helper Functions

Available in `e2e/helpers/test-helpers.ts`:

- `navigateToSection(page, name)` - Navigate via sidebar
- `fillField(page, selector, value)` - Fill form field
- `clickButton(page, selector)` - Click button
- `waitForToast(page, message?)` - Wait for notification
- `waitForElement(page, selector)` - Wait for element
- `uniqueName(base)` - Generate unique name

### Test Data Fixtures

Available in `e2e/fixtures/test-data.ts`:

```typescript
import { testWorkspace, testService, testNote, uniqueName } from '../fixtures/test-data';

// Use in tests
const name = uniqueName(testWorkspace.name);
```

## Best Practices

1. **Always clean up** - Delete created resources in `afterEach`
2. **Use unique names** - Use `uniqueName()` to avoid conflicts
3. **Wait properly** - Use Playwright's waiting mechanisms
4. **Be resilient** - Provide fallback selectors

## Troubleshooting

### Tests fail with connection error
Make sure servers are running:
```bash
npm run dev
```

### Browser download fails
In restricted environments:
```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
npx playwright install chromium
```

### Tests are flaky
- Use proper waits instead of `waitForTimeout()`
- Use `waitForResponse()` for API calls
- Increase timeout if needed

## Configuration

Edit `playwright.config.ts` to:

- Change timeout: `timeout: 120 * 1000`
- Add browsers: Add firefox/webkit to `projects`
- Adjust workers: `workers: 3` for parallel execution

## Resources

- [Playwright Docs](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
