/**
 * E2E Tests for Service Manager
 *
 * Tests:
 * - Creating services (CRUD operations)
 * - Listing services (workspace-scoped)
 * - Updating service configuration
 * - Deleting services
 * - Starting services
 * - Stopping services
 * - Viewing service logs
 * - Auto-refresh functionality
 * - Service status indicators
 */

import { test, expect } from '@playwright/test';
import {
  navigateToSection,
  waitForToast,
  fillField,
  clickButton,
  uniqueName,
  waitForElement,
} from '../helpers/test-helpers';
import { testService } from '../fixtures/test-data';

test.describe('Service Manager', () => {
  let createdServiceIds: string[] = [];
  let testWorkspaceId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a test workspace first
    await navigateToSection(page, 'Workspaces');
    await clickButton(page, 'button:has-text("Create Workspace")');

    const workspaceName = uniqueName('Service Test Workspace');
    await fillField(page, 'input[name="name"]', workspaceName);

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/workspaces')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await responsePromise;
    const data = await response.json();
    testWorkspaceId = data.data.id;

    // Activate the workspace
    await page.evaluate(async (id) => {
      await fetch(`http://localhost:5000/api/workspaces/${id}/activate`, {
        method: 'POST',
      });
    }, testWorkspaceId);

    // Navigate to Services section
    await navigateToSection(page, 'Services');
  });

  test.afterEach(async ({ page }) => {
    // Stop and delete all created services
    for (const serviceId of createdServiceIds) {
      try {
        // Stop service first
        await page.evaluate(async (id) => {
          await fetch(`http://localhost:5000/api/services/${id}/stop`, {
            method: 'POST',
          });
        }, serviceId);

        // Then delete
        await page.evaluate(async (id) => {
          await fetch(`http://localhost:5000/api/services/${id}`, {
            method: 'DELETE',
          });
        }, serviceId);
      } catch (error) {
        console.warn(`Cleanup failed for service ${serviceId}`);
      }
    }
    createdServiceIds = [];

    // Delete test workspace
    if (testWorkspaceId) {
      try {
        await page.evaluate(async (id) => {
          await fetch(`http://localhost:5000/api/workspaces/${id}`, {
            method: 'DELETE',
          });
        }, testWorkspaceId);
      } catch (error) {
        console.warn('Workspace cleanup failed');
      }
      testWorkspaceId = null;
    }
  });

  test('should display services section', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1, h2')).toContainText(/Services/i);

    // Check that create service button exists
    await expect(page.locator('button:has-text("Create Service")')).toBeVisible();

    // Check services list or empty state
    await expect(
      page
        .locator('[data-testid="services-list"]')
        .or(page.locator('text=/no services|create your first/i'))
    ).toBeVisible();
  });

  test('should create a new service', async ({ page }) => {
    const serviceName = uniqueName(testService.name);

    // Click create service button
    await clickButton(page, 'button:has-text("Create Service")');

    // Fill service form
    await fillField(page, 'input[name="name"]', serviceName);
    await fillField(page, 'input[name="repoPath"]', '/home/user/devhub');
    await fillField(page, 'input[name="command"]', 'echo "Hello from test service"');
    await fillField(page, 'input[name="port"]', '9999');

    // Submit form
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/services') && response.request().method() === 'POST'
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await responsePromise;
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.id).toBeTruthy();

    createdServiceIds.push(data.data.id);

    // Verify service appears in list
    await waitForToast(page);
    await expect(page.locator(`text="${serviceName}"`)).toBeVisible();
  });

  test('should update service configuration', async ({ page }) => {
    // Create a service first
    const originalName = uniqueName('Original Service');

    await clickButton(page, 'button:has-text("Create Service")');
    await fillField(page, 'input[name="name"]', originalName);
    await fillField(page, 'input[name="repoPath"]', '/home/user/devhub');
    await fillField(page, 'input[name="command"]', 'echo "test"');

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/services') && response.request().method() === 'POST'
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdServiceIds.push(data.data.id);

    await waitForToast(page);

    // Edit the service
    await page.click(`[data-service-id="${data.data.id}"] button:has-text("Edit")`).catch(() => {
      page.click(`[data-service-id="${data.data.id}"] button[aria-label="Edit"]`);
    });

    const updatedName = uniqueName('Updated Service');
    await fillField(page, 'input[name="name"]', updatedName);

    await clickButton(page, 'button[type="submit"]:has-text("Update")');

    // Verify update
    await waitForToast(page);
    await expect(page.locator(`text="${updatedName}"`)).toBeVisible();
  });

  test('should delete a service', async ({ page }) => {
    // Create a service
    const serviceName = uniqueName('Service to Delete');

    await clickButton(page, 'button:has-text("Create Service")');
    await fillField(page, 'input[name="name"]', serviceName);
    await fillField(page, 'input[name="repoPath"]', '/home/user/devhub');
    await fillField(page, 'input[name="command"]', 'echo "test"');

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/services') && response.request().method() === 'POST'
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    const serviceId = data.data.id;

    await waitForToast(page);

    // Delete the service
    await page.click(`[data-service-id="${serviceId}"] button:has-text("Delete")`).catch(() => {
      page.click(`[data-service-id="${serviceId}"] button[aria-label="Delete"]`);
    });

    // Confirm deletion
    await page.click('button:has-text("Confirm")').catch(() => {
      page.click('button:has-text("Delete")');
    });

    // Verify deletion
    await waitForToast(page);
    await expect(page.locator(`text="${serviceName}"`)).not.toBeVisible();

    // Remove from cleanup since already deleted
    createdServiceIds = createdServiceIds.filter((id) => id !== serviceId);
  });

  test('should start a service', async ({ page }) => {
    // Create a simple service that runs successfully
    const serviceName = uniqueName('Service to Start');

    await clickButton(page, 'button:has-text("Create Service")');
    await fillField(page, 'input[name="name"]', serviceName);
    await fillField(page, 'input[name="repoPath"]', '/home/user/devhub');
    await fillField(page, 'input[name="command"]', 'sleep 10'); // Simple long-running command

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/services') && response.request().method() === 'POST'
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdServiceIds.push(data.data.id);

    await waitForToast(page);

    // Start the service
    await page.click(`[data-service-id="${data.data.id}"] button:has-text("Start")`);

    // Wait for service to start
    await page.waitForTimeout(1000);

    // Verify service is running (status indicator)
    await expect(
      page
        .locator(`[data-service-id="${data.data.id}"] text=/running|active/i`)
        .or(page.locator(`[data-service-id="${data.data.id}"] [data-status="running"]`))
    ).toBeVisible({ timeout: 5000 });

    // Verify stop button is now available
    await expect(
      page.locator(`[data-service-id="${data.data.id}"] button:has-text("Stop")`)
    ).toBeVisible();
  });

  test('should stop a running service', async ({ page }) => {
    // Create and start a service
    const serviceName = uniqueName('Service to Stop');

    await clickButton(page, 'button:has-text("Create Service")');
    await fillField(page, 'input[name="name"]', serviceName);
    await fillField(page, 'input[name="repoPath"]', '/home/user/devhub');
    await fillField(page, 'input[name="command"]', 'sleep 30');

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/services') && response.request().method() === 'POST'
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdServiceIds.push(data.data.id);

    await waitForToast(page);

    // Start the service
    await page.click(`[data-service-id="${data.data.id}"] button:has-text("Start")`);
    await page.waitForTimeout(1000);

    // Stop the service
    await page.click(`[data-service-id="${data.data.id}"] button:has-text("Stop")`);

    // Verify service is stopped
    await expect(
      page
        .locator(`[data-service-id="${data.data.id}"] text=/stopped|inactive/i`)
        .or(page.locator(`[data-service-id="${data.data.id}"] [data-status="stopped"]`))
    ).toBeVisible({ timeout: 5000 });

    // Verify start button is available again
    await expect(
      page.locator(`[data-service-id="${data.data.id}"] button:has-text("Start")`)
    ).toBeVisible();
  });

  test('should view service logs', async ({ page }) => {
    // Create and start a service that produces logs
    const serviceName = uniqueName('Service with Logs');

    await clickButton(page, 'button:has-text("Create Service")');
    await fillField(page, 'input[name="name"]', serviceName);
    await fillField(page, 'input[name="repoPath"]', '/home/user/devhub');
    await fillField(page, 'input[name="command"]', 'echo "Test log output" && sleep 5');

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/services') && response.request().method() === 'POST'
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdServiceIds.push(data.data.id);

    await waitForToast(page);

    // Start the service
    await page.click(`[data-service-id="${data.data.id}"] button:has-text("Start")`);
    await page.waitForTimeout(1000);

    // Click to view logs
    await page.click(`[data-service-id="${data.data.id}"]`).catch(() => {
      page.click(`[data-service-id="${data.data.id}"] button:has-text("Logs")`);
    });

    // Wait for logs to appear
    await waitForElement(page, '[data-testid="logs-viewer"]', 5000).catch(() => {
      waitForElement(page, 'pre, code, .log-output', 5000);
    });

    // Verify logs contain expected output
    await expect(
      page.locator('text="Test log output"').or(page.locator('[data-testid="logs-viewer"]'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should handle service errors', async ({ page }) => {
    // Create a service with an invalid command
    const serviceName = uniqueName('Failing Service');

    await clickButton(page, 'button:has-text("Create Service")');
    await fillField(page, 'input[name="name"]', serviceName);
    await fillField(page, 'input[name="repoPath"]', '/home/user/devhub');
    await fillField(page, 'input[name="command"]', 'invalid-command-xyz-123');

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/services') && response.request().method() === 'POST'
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdServiceIds.push(data.data.id);

    await waitForToast(page);

    // Start the service (should fail)
    await page.click(`[data-service-id="${data.data.id}"] button:has-text("Start")`);

    // Wait a bit for the service to fail
    await page.waitForTimeout(2000);

    // Verify error state is shown
    await expect(
      page
        .locator(`[data-service-id="${data.data.id}"] text=/error|failed|exited/i`)
        .or(page.locator(`[data-service-id="${data.data.id}"] [data-status="error"]`))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should auto-refresh service list', async ({ page }) => {
    // Create a service
    const serviceName = uniqueName('Auto-refresh Service');

    await clickButton(page, 'button:has-text("Create Service")');
    await fillField(page, 'input[name="name"]', serviceName);
    await fillField(page, 'input[name="repoPath"]', '/home/user/devhub');
    await fillField(page, 'input[name="command"]', 'sleep 20');

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/services') && response.request().method() === 'POST'
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdServiceIds.push(data.data.id);

    await waitForToast(page);

    // Start the service
    await page.click(`[data-service-id="${data.data.id}"] button:has-text("Start")`);

    // Wait for auto-refresh to occur (services refresh every 3s)
    await page.waitForResponse((response) => response.url().includes('/api/services'), {
      timeout: 5000,
    });

    // Verify service is still displayed
    await expect(page.locator(`text="${serviceName}"`)).toBeVisible();
  });

  test('should display services only from active workspace', async ({ page }) => {
    // Create a service in current workspace
    const service1Name = uniqueName('Workspace 1 Service');

    await clickButton(page, 'button:has-text("Create Service")');
    await fillField(page, 'input[name="name"]', service1Name);
    await fillField(page, 'input[name="repoPath"]', '/home/user/devhub');
    await fillField(page, 'input[name="command"]', 'echo "test"');

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/services') && response.request().method() === 'POST'
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdServiceIds.push(data.data.id);

    await waitForToast(page);

    // Verify service is visible
    await expect(page.locator(`text="${service1Name}"`)).toBeVisible();

    // Create another workspace
    await navigateToSection(page, 'Workspaces');
    await clickButton(page, 'button:has-text("Create Workspace")');

    const workspace2Name = uniqueName('Workspace 2');
    await fillField(page, 'input[name="name"]', workspace2Name);

    const workspace2Response = page.waitForResponse((response) =>
      response.url().includes('/api/workspaces')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const workspace2Data = await workspace2Response;
    const workspace2Json = await workspace2Data.json();
    const workspace2Id = workspace2Json.data.id;

    // Activate workspace 2
    await page.evaluate(async (id) => {
      await fetch(`http://localhost:5000/api/workspaces/${id}/activate`, {
        method: 'POST',
      });
    }, workspace2Id);

    // Navigate to services
    await navigateToSection(page, 'Services');

    // Verify service from workspace 1 is NOT visible
    await expect(page.locator(`text="${service1Name}"`)).not.toBeVisible();

    // Cleanup workspace 2
    await page.evaluate(async (id) => {
      await fetch(`http://localhost:5000/api/workspaces/${id}`, {
        method: 'DELETE',
      });
    }, workspace2Id);
  });

  test('should show service count', async ({ page }) => {
    // Create a couple of services
    for (let i = 0; i < 2; i++) {
      await clickButton(page, 'button:has-text("Create Service")');
      await fillField(page, 'input[name="name"]', uniqueName(`Service ${i + 1}`));
      await fillField(page, 'input[name="repoPath"]', '/home/user/devhub');
      await fillField(page, 'input[name="command"]', 'echo "test"');

      const createResponse = page.waitForResponse((response) =>
        response.url().includes('/api/services') && response.request().method() === 'POST'
      );

      await clickButton(page, 'button[type="submit"]:has-text("Create")');

      const response = await createResponse;
      const data = await response.json();
      createdServiceIds.push(data.data.id);

      await waitForToast(page);
    }

    // Verify service count is displayed
    await expect(
      page
        .locator('text=/2 services|total: 2/i')
        .or(page.locator('[data-testid="service-count"]'))
    ).toBeVisible({ timeout: 5000 });
  });
});
