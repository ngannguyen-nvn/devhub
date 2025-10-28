/**
 * E2E Tests for Workspace Management
 *
 * Tests:
 * - Creating workspaces (manual and from folder scan)
 * - Listing and viewing workspaces
 * - Updating workspace details
 * - Activating/switching workspaces
 * - Creating snapshots
 * - Restoring snapshots
 * - Deleting workspaces (with cascade)
 * - Workspace hierarchy (workspace → snapshots)
 */

import { test, expect } from '@playwright/test';
import { navigateToSection, waitForToast, fillField, clickButton, uniqueName } from '../helpers/test-helpers';
import { testWorkspace, testSnapshot } from '../fixtures/test-data';

test.describe('Workspace Management', () => {
  let createdWorkspaceIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup created workspaces
    for (const workspaceId of createdWorkspaceIds) {
      try {
        await page.evaluate(async (id) => {
          await fetch(`http://localhost:5000/api/workspaces/${id}`, {
            method: 'DELETE',
          });
        }, workspaceId);
      } catch (error) {
        console.warn(`Cleanup failed for workspace ${workspaceId}`);
      }
    }
    createdWorkspaceIds = [];
  });

  test('should display workspaces section', async ({ page }) => {
    await navigateToSection(page, 'Workspaces');

    // Check page title
    await expect(page.locator('h1, h2')).toContainText(/Workspaces/i);

    // Check that workspace list is visible
    await expect(page.locator('[data-testid="workspace-list"]').or(page.locator('[data-testid="workspace-create-button"]'))).toBeVisible();
  });

  test('should create a new workspace manually', async ({ page }) => {
    await navigateToSection(page, 'Workspaces');

    const workspaceName = uniqueName(testWorkspace.name);

    // Click create workspace button
    await clickButton(page, '[data-testid="workspace-create-button"]');

    // Fill workspace form
    await fillField(page, '[data-testid="workspace-name-input"]', workspaceName);
    await fillField(page, '[data-testid="workspace-description-input"]', testWorkspace.description);

    // Capture the created workspace ID
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/workspaces') && response.status() === 200
    );

    // Submit form
    await clickButton(page, '[data-testid="workspace-create-submit-button"]');

    const response = await responsePromise;
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.id).toBeTruthy();

    createdWorkspaceIds.push(data.data.id);

    // Verify workspace appears in list
    await expect(page.locator(`text="${workspaceName}"`)).toBeVisible();

    // Verify success notification
    await waitForToast(page);
  });

  test('should activate a workspace', async ({ page }) => {
    // First create a workspace
    await navigateToSection(page, 'Workspaces');

    const workspaceName = uniqueName('Workspace to Activate');

    await clickButton(page, '[data-testid="workspace-create-button"]');
    await fillField(page, '[data-testid="workspace-name-input"]', workspaceName);

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/workspaces') && response.status() === 200
    );

    await clickButton(page, '[data-testid="workspace-create-submit-button"]');

    const response = await responsePromise;
    const data = await response.json();
    createdWorkspaceIds.push(data.data.id);

    // Activate the workspace
    await page.click(`[data-testid="workspace-activate-button-${data.data.id}"]`).catch(() => {
      // Alternative: click on the workspace card/row to activate
      page.click(`text="${workspaceName}"`);
    });

    // Verify workspace is activated
    await waitForToast(page);

    // Check if workspace switcher shows the active workspace
    const workspaceSwitcher = page.locator('[data-testid="workspace-switcher"]').or(
      page.locator('button:has-text("' + workspaceName + '")')
    );

    await expect(workspaceSwitcher).toBeVisible();
  });

  test('should update workspace details', async ({ page }) => {
    // Create a workspace first
    await navigateToSection(page, 'Workspaces');

    const originalName = uniqueName('Original Workspace');
    const updatedName = uniqueName('Updated Workspace');

    await clickButton(page, '[data-testid="workspace-create-button"]');
    await fillField(page, '[data-testid="workspace-name-input"]', originalName);

    const createResponse = page.waitForResponse(
      (response) => response.url().includes('/api/workspaces') && response.status() === 200
    );

    await clickButton(page, '[data-testid="workspace-create-submit-button"]');

    const response = await createResponse;
    const data = await response.json();
    createdWorkspaceIds.push(data.data.id);

    // Find and click edit button
    await page.click(`[data-testid="workspace-edit-button-${data.data.id}"]`).catch(() => {
      // Alternative: use icon button or menu
      page.click(`[data-workspace-id="${data.data.id}"] button[aria-label="Edit"]`);
    });

    // Update the name
    await fillField(page, '[data-testid="workspace-name-input"]', updatedName);
    await clickButton(page, '[data-testid="workspace-update-submit-button"]');

    // Verify update
    await waitForToast(page);
    await expect(page.locator(`text="${updatedName}"`)).toBeVisible();
  });

  test('should create a snapshot in workspace', async ({ page }) => {
    // First create a workspace
    await navigateToSection(page, 'Workspaces');

    const workspaceName = uniqueName('Workspace with Snapshot');

    await clickButton(page, '[data-testid="workspace-create-button"]');
    await fillField(page, '[data-testid="workspace-name-input"]', workspaceName);

    const createWorkspaceResponse = page.waitForResponse(
      (response) => response.url().includes('/api/workspaces') && response.status() === 200
    );

    await clickButton(page, '[data-testid="workspace-create-submit-button"]');

    const workspaceResponse = await createWorkspaceResponse;
    const workspaceData = await workspaceResponse.json();
    createdWorkspaceIds.push(workspaceData.data.id);

    // Navigate to workspace detail view
    await page.click(`text="${workspaceName}"`);

    // Create a snapshot
    await clickButton(page, '[data-testid="snapshot-create-button"]');

    const snapshotName = uniqueName(testSnapshot.name);
    await fillField(page, '[data-testid="snapshot-name-input"]', snapshotName);
    await fillField(page, '[data-testid="snapshot-description-input"]', testSnapshot.description);

    await clickButton(page, '[data-testid="snapshot-create-submit-button"]');

    // Verify snapshot created
    await waitForToast(page);
    await expect(page.locator(`text="${snapshotName}"`)).toBeVisible();
  });

  test('should delete a workspace with cascade', async ({ page }) => {
    // Create a workspace
    await navigateToSection(page, 'Workspaces');

    const workspaceName = uniqueName('Workspace to Delete');

    await clickButton(page, '[data-testid="workspace-create-button"]');
    await fillField(page, '[data-testid="workspace-name-input"]', workspaceName);

    const createResponse = page.waitForResponse(
      (response) => response.url().includes('/api/workspaces') && response.status() === 200
    );

    await clickButton(page, '[data-testid="workspace-create-submit-button"]');

    const response = await createResponse;
    const data = await response.json();
    const workspaceId = data.data.id;

    // Delete the workspace
    await page.click(`[data-testid="workspace-delete-button-${workspaceId}"]`).catch(() => {
      page.click(`[data-workspace-id="${workspaceId}"] button[aria-label="Delete"]`);
    });

    // Confirm deletion
    await page.click('[data-testid="workspace-delete-confirm-button"]').catch(() => {
      page.click('button:has-text("Delete")');
    });

    // Verify deletion
    await waitForToast(page);
    await expect(page.locator(`text="${workspaceName}"`)).not.toBeVisible();

    // Remove from cleanup list since it's already deleted
    createdWorkspaceIds = createdWorkspaceIds.filter((id) => id !== workspaceId);
  });

  test('should scan folder and create workspace', async ({ page }) => {
    await navigateToSection(page, 'Workspaces');

    // Click scan folder button
    await clickButton(page, '[data-testid="workspace-scan-folder-button"]');

    // Enter folder path - use process.cwd() for current directory
    await fillField(page, '[data-testid="workspace-folderpath-input"]', process.cwd());

    const createResponse = page.waitForResponse(
      (response) => response.url().includes('/api/workspaces') && response.status() === 200
    );

    await clickButton(page, '[data-testid="workspace-scan-submit-button"]');

    const response = await createResponse;
    const data = await response.json();

    if (data.success && data.data.id) {
      createdWorkspaceIds.push(data.data.id);
    }

    // Verify workspace created
    await waitForToast(page);
  });

  test('should display workspace hierarchy (workspace → snapshots)', async ({ page }) => {
    // Create a workspace with snapshots
    await navigateToSection(page, 'Workspaces');

    const workspaceName = uniqueName('Hierarchical Workspace');

    await clickButton(page, '[data-testid="workspace-create-button"]');
    await fillField(page, '[data-testid="workspace-name-input"]', workspaceName);

    const createWorkspaceResponse = page.waitForResponse(
      (response) => response.url().includes('/api/workspaces') && response.status() === 200
    );

    await clickButton(page, '[data-testid="workspace-create-submit-button"]');

    const workspaceResponse = await createWorkspaceResponse;
    const workspaceData = await workspaceResponse.json();
    createdWorkspaceIds.push(workspaceData.data.id);

    // Click on workspace to view details
    await page.click(`text="${workspaceName}"`);

    // Verify we're in workspace detail view
    await expect(page.locator('h1, h2')).toContainText(workspaceName);

    // Verify snapshots section is visible
    await expect(
      page.locator('[data-testid="snapshot-list"]').or(page.locator('[data-testid="snapshot-create-button"]'))
    ).toBeVisible();
  });

  test('should restore a snapshot', async ({ page }) => {
    // Create a workspace and snapshot
    await navigateToSection(page, 'Workspaces');

    const workspaceName = uniqueName('Workspace for Restore');

    await clickButton(page, '[data-testid="workspace-create-button"]');
    await fillField(page, '[data-testid="workspace-name-input"]', workspaceName);

    const createWorkspaceResponse = page.waitForResponse(
      (response) => response.url().includes('/api/workspaces') && response.status() === 200
    );

    await clickButton(page, '[data-testid="workspace-create-submit-button"]');

    const workspaceResponse = await createWorkspaceResponse;
    const workspaceData = await workspaceResponse.json();
    createdWorkspaceIds.push(workspaceData.data.id);

    // Navigate to workspace
    await page.click(`text="${workspaceName}"`);

    // Create snapshot
    await clickButton(page, '[data-testid="snapshot-create-button"]');

    const snapshotName = uniqueName('Snapshot to Restore');
    await fillField(page, '[data-testid="snapshot-name-input"]', snapshotName);

    await clickButton(page, '[data-testid="snapshot-create-submit-button"]');

    await waitForToast(page);

    // Restore the snapshot
    await page.click(`text="${snapshotName}"`).catch(() => {
      page.locator(`[data-snapshot-name="${snapshotName}"]`).click();
    });

    await clickButton(page, '[data-testid="snapshot-restore-button"]');

    // Confirm restore
    await page.click('[data-testid="snapshot-restore-confirm-button"]').catch(() => {
      page.click('button:has-text("Restore")');
    });

    // Verify restore success
    await waitForToast(page);
  });
});
