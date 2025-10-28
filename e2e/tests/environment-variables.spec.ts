/**
 * E2E Tests for Environment Variables Manager
 *
 * Tests:
 * - Creating environment profiles (dev/staging/prod)
 * - Listing profiles (workspace-scoped)
 * - Updating profiles
 * - Deleting profiles
 * - Adding environment variables to profiles
 * - Updating variables
 * - Deleting variables
 * - Secret masking in UI
 * - Importing .env files
 * - Exporting to .env format
 * - Applying profiles to services
 * - Per-service environment variables
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
import { testEnvProfile, testEnvVariables } from '../fixtures/test-data';

test.describe('Environment Variables Manager', () => {
  let createdProfileIds: string[] = [];
  let createdVariableIds: string[] = [];
  let testWorkspaceId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create a test workspace
    await navigateToSection(page, 'Workspaces');
    await clickButton(page, 'button:has-text("Create Workspace")');

    const workspaceName = uniqueName('Env Test Workspace');
    await fillField(page, 'input[name="name"]', workspaceName);

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/workspaces')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await responsePromise;
    const data = await response.json();
    testWorkspaceId = data.data.id;

    // Activate workspace
    await page.evaluate(async (id) => {
      await fetch(`http://localhost:5000/api/workspaces/${id}/activate`, {
        method: 'POST',
      });
    }, testWorkspaceId);

    // Navigate to Environment section
    await navigateToSection(page, 'Environment');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup variables
    for (const variableId of createdVariableIds) {
      try {
        await page.evaluate(async (id) => {
          await fetch(`http://localhost:5000/api/env/variables/${id}`, {
            method: 'DELETE',
          });
        }, variableId);
      } catch (error) {
        console.warn(`Variable cleanup failed: ${variableId}`);
      }
    }

    // Cleanup profiles
    for (const profileId of createdProfileIds) {
      try {
        await page.evaluate(async (id) => {
          await fetch(`http://localhost:5000/api/env/profiles/${id}`, {
            method: 'DELETE',
          });
        }, profileId);
      } catch (error) {
        console.warn(`Profile cleanup failed: ${profileId}`);
      }
    }

    // Cleanup workspace
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
    }

    createdProfileIds = [];
    createdVariableIds = [];
    testWorkspaceId = null;
  });

  test('should display environment variables section', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1, h2')).toContainText(/Environment|Env/i);

    // Check create profile button exists
    await expect(page.locator('button:has-text("Create Profile")')).toBeVisible();

    // Check profiles list or empty state
    await expect(
      page
        .locator('[data-testid="env-profiles"]')
        .or(page.locator('text=/no profiles|create your first/i'))
    ).toBeVisible();
  });

  test('should create a new environment profile', async ({ page }) => {
    const profileName = uniqueName(testEnvProfile.name);

    // Click create profile button
    await clickButton(page, 'button:has-text("Create Profile")');

    // Fill profile form
    await fillField(page, 'input[name="name"]', profileName);
    await fillField(page, 'textarea[name="description"]', testEnvProfile.description);

    // Submit form
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/env/profiles') && response.request().method() === 'POST'
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await responsePromise;
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.id).toBeTruthy();

    createdProfileIds.push(data.data.id);

    // Verify profile appears in list
    await waitForToast(page);
    await expect(page.locator(`text="${profileName}"`)).toBeVisible();
  });

  test('should update environment profile', async ({ page }) => {
    // Create profile first
    const originalName = uniqueName('Original Profile');

    await clickButton(page, 'button:has-text("Create Profile")');
    await fillField(page, 'input[name="name"]', originalName);

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/env/profiles')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdProfileIds.push(data.data.id);

    await waitForToast(page);

    // Edit profile
    await page
      .click(`[data-profile-id="${data.data.id}"] button:has-text("Edit")`)
      .catch(() => {
        page.click(`[data-profile-id="${data.data.id}"] button[aria-label="Edit"]`);
      });

    const updatedName = uniqueName('Updated Profile');
    await fillField(page, 'input[name="name"]', updatedName);

    await clickButton(page, 'button[type="submit"]:has-text("Update")');

    // Verify update
    await waitForToast(page);
    await expect(page.locator(`text="${updatedName}"`)).toBeVisible();
  });

  test('should delete environment profile', async ({ page }) => {
    // Create profile
    const profileName = uniqueName('Profile to Delete');

    await clickButton(page, 'button:has-text("Create Profile")');
    await fillField(page, 'input[name="name"]', profileName);

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/env/profiles')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    const profileId = data.data.id;

    await waitForToast(page);

    // Delete profile
    await page.click(`[data-profile-id="${profileId}"] button:has-text("Delete")`).catch(() => {
      page.click(`[data-profile-id="${profileId}"] button[aria-label="Delete"]`);
    });

    // Confirm deletion
    await page.click('button:has-text("Confirm")').catch(() => {
      page.click('button:has-text("Delete")');
    });

    // Verify deletion
    await waitForToast(page);
    await expect(page.locator(`text="${profileName}"`)).not.toBeVisible();

    // Remove from cleanup list
    createdProfileIds = createdProfileIds.filter((id) => id !== profileId);
  });

  test('should add environment variable to profile', async ({ page }) => {
    // Create profile first
    const profileName = uniqueName('Profile with Variables');

    await clickButton(page, 'button:has-text("Create Profile")');
    await fillField(page, 'input[name="name"]', profileName);

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/env/profiles')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdProfileIds.push(data.data.id);

    await waitForToast(page);

    // Click to view/edit profile variables
    await page.click(`text="${profileName}"`);

    // Add variable
    await clickButton(page, 'button:has-text("Add Variable")');

    // Fill variable form
    await fillField(page, 'input[name="key"]', testEnvVariables[0].key);
    await fillField(page, 'input[name="value"]', testEnvVariables[0].value);
    await fillField(page, 'textarea[name="description"]', testEnvVariables[0].description);

    // Set secret flag
    if (testEnvVariables[0].isSecret) {
      await page.check('input[name="isSecret"]');
    }

    // Submit
    const varResponse = page.waitForResponse((response) =>
      response.url().includes('/api/env/variables')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Add")');

    const varData = await varResponse;
    const varResult = await varData.json();

    if (varResult.success && varResult.data?.id) {
      createdVariableIds.push(varResult.data.id);
    }

    // Verify variable appears
    await waitForToast(page);
    await expect(page.locator(`text="${testEnvVariables[0].key}"`)).toBeVisible();
  });

  test('should mask secret values in UI', async ({ page }) => {
    // Create profile
    const profileName = uniqueName('Profile with Secrets');

    await clickButton(page, 'button:has-text("Create Profile")');
    await fillField(page, 'input[name="name"]', profileName);

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/env/profiles')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdProfileIds.push(data.data.id);

    await waitForToast(page);

    // Open profile
    await page.click(`text="${profileName}"`);

    // Add secret variable
    await clickButton(page, 'button:has-text("Add Variable")');

    const secretVar = testEnvVariables.find((v) => v.isSecret);
    if (secretVar) {
      await fillField(page, 'input[name="key"]', secretVar.key);
      await fillField(page, 'input[name="value"]', secretVar.value);
      await page.check('input[name="isSecret"]');

      const varResponse = page.waitForResponse((response) =>
        response.url().includes('/api/env/variables')
      );

      await clickButton(page, 'button[type="submit"]:has-text("Add")');

      const varData = await varResponse;
      const varResult = await varData.json();

      if (varResult.success && varResult.data?.id) {
        createdVariableIds.push(varResult.data.id);
      }

      await waitForToast(page);

      // Verify value is masked (shown as asterisks or dots)
      await expect(
        page
          .locator('[data-variable-key="' + secretVar.key + '"] text=/\\*+|•+/i')
          .or(page.locator('[data-variable-key="' + secretVar.key + '"] [data-masked="true"]'))
      ).toBeVisible({ timeout: 5000 });

      // Verify actual value is NOT visible in plain text
      await expect(page.locator(`text="${secretVar.value}"`)).not.toBeVisible();
    }
  });

  test('should update environment variable', async ({ page }) => {
    // Create profile and variable
    const profileName = uniqueName('Profile for Update');

    await clickButton(page, 'button:has-text("Create Profile")');
    await fillField(page, 'input[name="name"]', profileName);

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/env/profiles')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdProfileIds.push(data.data.id);

    await waitForToast(page);

    // Open profile and add variable
    await page.click(`text="${profileName}"`);
    await clickButton(page, 'button:has-text("Add Variable")');

    const originalKey = 'ORIGINAL_KEY';
    await fillField(page, 'input[name="key"]', originalKey);
    await fillField(page, 'input[name="value"]', 'original-value');

    const varResponse = page.waitForResponse((response) =>
      response.url().includes('/api/env/variables')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Add")');

    const varData = await varResponse;
    const varResult = await varData.json();
    createdVariableIds.push(varResult.data.id);

    await waitForToast(page);

    // Edit variable
    await page
      .click(`[data-variable-id="${varResult.data.id}"] button:has-text("Edit")`)
      .catch(() => {
        page.click(`[data-variable-id="${varResult.data.id}"] button[aria-label="Edit"]`);
      });

    await fillField(page, 'input[name="value"]', 'updated-value');

    await clickButton(page, 'button[type="submit"]:has-text("Update")');

    // Verify update
    await waitForToast(page);
  });

  test('should delete environment variable', async ({ page }) => {
    // Create profile and variable
    const profileName = uniqueName('Profile for Deletion');

    await clickButton(page, 'button:has-text("Create Profile")');
    await fillField(page, 'input[name="name"]', profileName);

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/env/profiles')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdProfileIds.push(data.data.id);

    await waitForToast(page);

    // Add variable
    await page.click(`text="${profileName}"`);
    await clickButton(page, 'button:has-text("Add Variable")');

    const varKey = 'VAR_TO_DELETE';
    await fillField(page, 'input[name="key"]', varKey);
    await fillField(page, 'input[name="value"]', 'delete-me');

    const varResponse = page.waitForResponse((response) =>
      response.url().includes('/api/env/variables')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Add")');

    const varData = await varResponse;
    const varResult = await varData.json();
    const variableId = varResult.data.id;

    await waitForToast(page);

    // Delete variable
    await page.click(`[data-variable-id="${variableId}"] button:has-text("Delete")`).catch(() => {
      page.click(`[data-variable-id="${variableId}"] button[aria-label="Delete"]`);
    });

    // Confirm
    await page.click('button:has-text("Confirm")').catch(() => {
      page.click('button:has-text("Delete")');
    });

    // Verify deletion
    await waitForToast(page);
    await expect(page.locator(`text="${varKey}"`)).not.toBeVisible();

    createdVariableIds = createdVariableIds.filter((id) => id !== variableId);
  });

  test('should import .env file', async ({ page }) => {
    // Create profile
    const profileName = uniqueName('Import Profile');

    await clickButton(page, 'button:has-text("Create Profile")');
    await fillField(page, 'input[name="name"]', profileName);

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/env/profiles')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdProfileIds.push(data.data.id);

    await waitForToast(page);

    // Open profile
    await page.click(`text="${profileName}"`);

    // Click import button
    await clickButton(page, 'button:has-text("Import")');

    // Paste .env content
    const envContent = 'DATABASE_URL=postgresql://localhost:5432/db\nAPI_KEY=secret123';
    await fillField(page, 'textarea[name="envContent"]', envContent);

    // Submit import
    await clickButton(page, 'button[type="submit"]:has-text("Import")');

    // Verify variables imported
    await waitForToast(page);
    await expect(page.locator('text="DATABASE_URL"')).toBeVisible();
    await expect(page.locator('text="API_KEY"')).toBeVisible();
  });

  test('should export profile to .env format', async ({ page }) => {
    // Create profile with variables
    const profileName = uniqueName('Export Profile');

    await clickButton(page, 'button:has-text("Create Profile")');
    await fillField(page, 'input[name="name"]', profileName);

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/env/profiles')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdProfileIds.push(data.data.id);

    await waitForToast(page);

    // Add some variables
    await page.click(`text="${profileName}"`);
    await clickButton(page, 'button:has-text("Add Variable")');

    await fillField(page, 'input[name="key"]', 'EXPORT_VAR');
    await fillField(page, 'input[name="value"]', 'export-value');

    const varResponse = page.waitForResponse((response) =>
      response.url().includes('/api/env/variables')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Add")');

    await varResponse;
    await waitForToast(page);

    // Export profile
    await clickButton(page, 'button:has-text("Export")');

    // Verify .env content is displayed or downloaded
    await expect(
      page
        .locator('text=/EXPORT_VAR=export-value/i')
        .or(page.locator('[data-testid="export-content"]'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should apply profile to service', async ({ page }) => {
    // Create profile
    const profileName = uniqueName('Apply Profile');

    await clickButton(page, 'button:has-text("Create Profile")');
    await fillField(page, 'input[name="name"]', profileName);

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/env/profiles')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdProfileIds.push(data.data.id);

    await waitForToast(page);

    // Create a service first
    await navigateToSection(page, 'Services');
    await clickButton(page, 'button:has-text("Create Service")');

    const serviceName = uniqueName('Service for Env');
    await fillField(page, 'input[name="name"]', serviceName);
    await fillField(page, 'input[name="repoPath"]', '/home/user/devhub');
    await fillField(page, 'input[name="command"]', 'echo "test"');

    const serviceResponse = page.waitForResponse((response) =>
      response.url().includes('/api/services')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const serviceData = await serviceResponse;
    const serviceResult = await serviceData.json();
    const serviceId = serviceResult.data.id;

    await waitForToast(page);

    // Go back to environment
    await navigateToSection(page, 'Environment');

    // Apply profile to service
    await page.click(`text="${profileName}"`);
    await clickButton(page, 'button:has-text("Apply to Service")');

    // Select service
    await page.selectOption('select[name="serviceId"]', serviceId).catch(() => {
      page.click(`text="${serviceName}"`);
    });

    // Apply
    await clickButton(page, 'button[type="submit"]:has-text("Apply")');

    // Verify application
    await waitForToast(page);

    // Cleanup service
    await page.evaluate(async (id) => {
      await fetch(`http://localhost:5000/api/services/${id}`, {
        method: 'DELETE',
      });
    }, serviceId);
  });

  test('should display profiles only from active workspace', async ({ page }) => {
    // Create profile in current workspace
    const profile1Name = uniqueName('Workspace 1 Profile');

    await clickButton(page, 'button:has-text("Create Profile")');
    await fillField(page, 'input[name="name"]', profile1Name);

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/env/profiles')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdProfileIds.push(data.data.id);

    await waitForToast(page);

    // Verify profile visible
    await expect(page.locator(`text="${profile1Name}"`)).toBeVisible();

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

    // Navigate to environment
    await navigateToSection(page, 'Environment');

    // Verify profile from workspace 1 is NOT visible
    await expect(page.locator(`text="${profile1Name}"`)).not.toBeVisible();

    // Cleanup workspace 2
    await page.evaluate(async (id) => {
      await fetch(`http://localhost:5000/api/workspaces/${id}`, {
        method: 'DELETE',
      });
    }, workspace2Id);
  });
});
