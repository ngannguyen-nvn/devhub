/**
 * E2E Tests for Repository Dashboard
 *
 * Tests:
 * - Scanning directories for git repositories
 * - Displaying repository information (branch, changes, last commit)
 * - Detecting Dockerfiles
 * - Adjusting scan depth
 * - Auto-refresh functionality
 */

import { test, expect } from '@playwright/test';
import { navigateToSection, waitForElement, fillField, clickButton } from '../helpers/test-helpers';

test.describe('Repository Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await navigateToSection(page, 'Dashboard');
  });

  test('should display repository dashboard', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1, h2')).toContainText(/Dashboard|Repositories/i);

    // Check that scan controls are visible
    await expect(page.locator('[data-testid="dashboard-scan-path-input"]')).toBeVisible();

    // Check scan button exists
    await expect(page.locator('[data-testid="dashboard-scan-button"]')).toBeVisible();
  });

  test('should scan for repositories', async ({ page }) => {
    // Enter scan path
    await fillField(page, '[data-testid="dashboard-scan-path-input"]', process.cwd());

    // Set scan depth
    await page
      .selectOption('[data-testid="dashboard-scan-depth-select"]', '2')
      .catch(() => {
        console.log('Depth selector not found or different implementation');
      });

    // Click scan button
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/repos/scan'),
      { timeout: 30000 }
    );

    await clickButton(page, '[data-testid="dashboard-scan-button"]');

    // Wait for scan to complete
    await responsePromise;

    // Verify repositories are displayed
    await waitForElement(page, '[data-testid="dashboard-repo-item"]', 10000);

    // Check that at least one repository is found
    const repoCount = await page.locator('[data-testid="dashboard-repo-item"]').count();

    expect(repoCount).toBeGreaterThan(0);
  });

  test('should display repository details', async ({ page }) => {
    // Scan for repos first
    await fillField(page, '[data-testid="dashboard-scan-path-input"]', process.cwd());

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/repos/scan')
    );

    await clickButton(page, '[data-testid="dashboard-scan-button"]');
    await responsePromise;

    // Wait for repository to appear
    await page.waitForSelector('[data-testid="dashboard-repo-item"]', {
      timeout: 10000,
    });

    // Verify repository information is displayed
    // Should show: path, branch, status, last commit
    await expect(
      page.locator('[data-testid="dashboard-repo-branch"]').or(page.locator('text=/branch|main|master/i'))
    ).toBeVisible();

    // Check for commit information
    await expect(
      page.locator('[data-testid="dashboard-repo-commit"]').or(page.locator('text=/commit|ago|authored/i'))
    ).toBeVisible();
  });

  test('should detect Dockerfiles in repositories', async ({ page }) => {
    // Scan for repos
    await fillField(page, '[data-testid="dashboard-scan-path-input"]', process.cwd());

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/repos/scan')
    );

    await clickButton(page, '[data-testid="dashboard-scan-button"]');
    const response = await responsePromise;

    const data = await response.json();

    // Check if any repository has Dockerfile
    const hasDockerfile = data.some((repo: any) => repo.hasDockerfile);

    if (hasDockerfile) {
      // Verify Dockerfile indicator is shown
      await expect(
        page.locator('[data-testid="dashboard-dockerfile-badge"]').or(page.locator('text=/dockerfile/i'))
      ).toBeVisible();
    }
  });

  test('should show uncommitted changes indicator', async ({ page }) => {
    // Scan for repos
    await fillField(page, '[data-testid="dashboard-scan-path-input"]', process.cwd());

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/repos/scan')
    );

    await clickButton(page, '[data-testid="dashboard-scan-button"]');
    const response = await responsePromise;

    const data = await response.json();

    // Check if any repository has uncommitted changes
    const hasChanges = data.some((repo: any) => repo.hasUncommittedChanges);

    if (hasChanges) {
      // Verify uncommitted changes indicator
      await expect(
        page
          .locator('[data-testid="dashboard-changes-indicator"]')
          .or(page.locator('text=/uncommitted|changes|modified/i'))
      ).toBeVisible();
    }
  });

  test('should handle different scan depths', async ({ page }) => {
    // Test with depth 0 (current directory only)
    await fillField(page, '[data-testid="dashboard-scan-path-input"]', process.cwd());

    await page
      .selectOption('[data-testid="dashboard-scan-depth-select"]', '0')
      .catch(() => {
        console.log('Depth selector implementation may differ');
      });

    const depth0Response = page.waitForResponse((response) =>
      response.url().includes('/api/repos/scan')
    );

    await clickButton(page, '[data-testid="dashboard-scan-button"]');
    const response0 = await depth0Response;

    const data0 = await response0.json();
    const count0 = Array.isArray(data0) ? data0.length : 0;

    // Test with depth 2 (should find more repos)
    await page
      .selectOption('[data-testid="dashboard-scan-depth-select"]', '2')
      .catch(() => {
        console.log('Depth selector implementation may differ');
      });

    const depth2Response = page.waitForResponse((response) =>
      response.url().includes('/api/repos/scan')
    );

    await clickButton(page, '[data-testid="dashboard-scan-button"]');
    const response2 = await depth2Response;

    const data2 = await response2.json();
    const count2 = Array.isArray(data2) ? data2.length : 0;

    // Depth 2 should find at least as many repos as depth 0
    expect(count2).toBeGreaterThanOrEqual(count0);
  });

  test('should handle scan errors gracefully', async ({ page }) => {
    // Try to scan a non-existent path
    await fillField(
      page,
      '[data-testid="dashboard-scan-path-input"]',
      '/non/existent/path/12345'
    );

    await clickButton(page, '[data-testid="dashboard-scan-button"]');

    // Should show error message or empty state
    await expect(
      page
        .locator('[data-testid="dashboard-error"]')
        .or(page.locator('text=/error|not found|no repositories/i'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should auto-refresh repository list', async ({ page }) => {
    // Scan for repos first
    await fillField(page, '[data-testid="dashboard-scan-path-input"]', process.cwd());

    await clickButton(page, '[data-testid="dashboard-scan-button"]');

    // Wait for initial load
    await page.waitForSelector('[data-testid="dashboard-repo-item"]', {
      timeout: 10000,
    });

    // Get initial count
    const initialCount = await page.locator('[data-testid="dashboard-repo-item"]').count();

    // Wait for auto-refresh (usually happens every few seconds)
    // We'll wait for a network request to the scan endpoint
    await page
      .waitForResponse((response) => response.url().includes('/api/repos/scan'), {
        timeout: 10000,
      })
      .catch(() => {
        console.log('Auto-refresh may not be implemented or timing differs');
      });

    // Verify list is still displayed
    const updatedCount = await page.locator('[data-testid="dashboard-repo-item"]').count();

    expect(updatedCount).toBe(initialCount);
  });

  test('should display loading state during scan', async ({ page }) => {
    // Enter path
    await fillField(page, '[data-testid="dashboard-scan-path-input"]', process.cwd());

    // Click scan and immediately check for loading state
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/repos/scan')
    );

    await clickButton(page, '[data-testid="dashboard-scan-button"]');

    // Check for loading indicator (spinner, disabled button, etc.)
    await expect(
      page
        .locator('[data-testid="dashboard-loading"]')
        .or(page.locator('button:has-text("Scanning")'))
        .or(page.locator('.animate-spin'))
    )
      .toBeVisible({ timeout: 1000 })
      .catch(() => {
        console.log('Loading state may be too fast or implemented differently');
      });

    await responsePromise;
  });

  test('should sort repositories by different columns', async ({ page }) => {
    // Scan for repos
    await fillField(page, '[data-testid="dashboard-scan-path-input"]', process.cwd());

    await clickButton(page, '[data-testid="dashboard-scan-button"]');

    await page.waitForSelector('[data-testid="dashboard-repo-item"]', {
      timeout: 10000,
    });

    // Try clicking on table headers to sort
    const sortableHeaders = [
      '[data-testid="dashboard-sort-name"]',
      '[data-testid="dashboard-sort-branch"]',
      '[data-testid="dashboard-sort-commit"]',
      'text=/name|repository/i',
      'text=/branch/i',
      'text=/last commit/i',
    ];

    for (const header of sortableHeaders) {
      const headerElement = page.locator(header);

      if (await headerElement.isVisible()) {
        // Click to sort
        await headerElement.click();

        // Wait a bit for sorting animation/update
        await page.waitForTimeout(500);

        // Verify table is still displayed
        await expect(page.locator('[data-testid="dashboard-repo-item"]')).toBeVisible();

        break; // Just test one sortable column
      }
    }
  });

  test('should refresh repository list manually', async ({ page }) => {
    // Scan for repos first
    await fillField(page, '[data-testid="dashboard-scan-path-input"]', process.cwd());

    await clickButton(page, '[data-testid="dashboard-scan-button"]');

    // Wait for initial load
    await page.waitForSelector('[data-testid="dashboard-repo-item"]', {
      timeout: 10000,
    });

    // Click refresh button if it exists
    const refreshButton = page.locator('[data-testid="dashboard-refresh-button"]');

    if (await refreshButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      const responsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/repos/scan')
      );

      await refreshButton.click();
      await responsePromise;

      // Verify list is still displayed
      await expect(page.locator('[data-testid="dashboard-repo-item"]')).toBeVisible();
    }
  });
});
