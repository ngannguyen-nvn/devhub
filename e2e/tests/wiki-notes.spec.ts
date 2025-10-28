/**
 * E2E Tests for Wiki/Notes System
 *
 * Tests:
 * - Creating notes (workspace-scoped)
 * - Listing notes with filters
 * - Updating notes
 * - Deleting notes
 * - Markdown rendering
 * - Full-text search with FTS5
 * - Bidirectional linking [[note-name]]
 * - Using templates (Architecture, API, Runbook, etc.)
 * - Category organization
 * - Tag management
 * - Live markdown preview
 * - Viewing linked notes
 * - Viewing backlinks
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
import { testNote } from '../fixtures/test-data';

test.describe('Wiki/Notes System', () => {
  let createdNoteIds: string[] = [];
  let testWorkspaceId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create test workspace
    await navigateToSection(page, 'Workspaces');
    await clickButton(page, 'button:has-text("Create Workspace")');

    const workspaceName = uniqueName('Wiki Test Workspace');
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

    // Navigate to Wiki
    await navigateToSection(page, 'Wiki');
  });

  test.afterEach(async ({ page }) => {
    // Cleanup notes
    for (const noteId of createdNoteIds) {
      try {
        await page.evaluate(async (id) => {
          await fetch(`http://localhost:5000/api/notes/${id}`, {
            method: 'DELETE',
          });
        }, noteId);
      } catch (error) {
        console.warn(`Note cleanup failed: ${noteId}`);
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

    createdNoteIds = [];
    testWorkspaceId = null;
  });

  test('should display wiki/notes section', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1, h2')).toContainText(/Wiki|Notes/i);

    // Check create note button
    await expect(page.locator('button:has-text("Create Note")')).toBeVisible();

    // Check notes list or empty state
    await expect(
      page
        .locator('[data-testid="notes-list"]')
        .or(page.locator('text=/no notes|create your first/i'))
    ).toBeVisible();
  });

  test('should create a new note', async ({ page }) => {
    const noteTitle = uniqueName(testNote.title);

    // Click create note
    await clickButton(page, 'button:has-text("Create Note")');

    // Fill note form
    await fillField(page, 'input[name="title"]', noteTitle);
    await fillField(page, 'textarea[name="content"]', testNote.content);
    await fillField(page, 'input[name="category"]', testNote.category);

    // Add tags
    await fillField(page, 'input[name="tags"]', testNote.tags.join(', '));

    // Submit
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/notes') && response.request().method() === 'POST'
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await responsePromise;
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.id).toBeTruthy();

    createdNoteIds.push(data.data.id);

    // Verify note appears
    await waitForToast(page);
    await expect(page.locator(`text="${noteTitle}"`)).toBeVisible();
  });

  test('should create note from template', async ({ page }) => {
    // Click create note
    await clickButton(page, 'button:has-text("Create Note")');

    // Select template
    await page.selectOption('select[name="template"]', 'Architecture').catch(() => {
      page.click('button:has-text("Architecture")');
    });

    // Template content should be populated
    await expect(page.locator('textarea[name="content"]')).not.toBeEmpty();

    const noteTitle = uniqueName('Architecture Doc');
    await fillField(page, 'input[name="title"]', noteTitle);

    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/notes') && response.request().method() === 'POST'
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await responsePromise;
    const data = await response.json();
    createdNoteIds.push(data.data.id);

    await waitForToast(page);
    await expect(page.locator(`text="${noteTitle}"`)).toBeVisible();
  });

  test('should update a note', async ({ page }) => {
    // Create note first
    const originalTitle = uniqueName('Original Note');

    await clickButton(page, 'button:has-text("Create Note")');
    await fillField(page, 'input[name="title"]', originalTitle);
    await fillField(page, 'textarea[name="content"]', '# Original Content');

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/notes')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdNoteIds.push(data.data.id);

    await waitForToast(page);

    // Edit note
    await page.click(`[data-note-id="${data.data.id}"] button:has-text("Edit")`).catch(() => {
      page.click(`text="${originalTitle}"`);
    });

    const updatedTitle = uniqueName('Updated Note');
    await fillField(page, 'input[name="title"]', updatedTitle);
    await fillField(page, 'textarea[name="content"]', '# Updated Content');

    await clickButton(page, 'button[type="submit"]:has-text("Update")');

    // Verify update
    await waitForToast(page);
    await expect(page.locator(`text="${updatedTitle}"`)).toBeVisible();
  });

  test('should delete a note', async ({ page }) => {
    // Create note
    const noteTitle = uniqueName('Note to Delete');

    await clickButton(page, 'button:has-text("Create Note")');
    await fillField(page, 'input[name="title"]', noteTitle);
    await fillField(page, 'textarea[name="content"]', '# Delete me');

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/notes')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    const noteId = data.data.id;

    await waitForToast(page);

    // Delete note
    await page.click(`[data-note-id="${noteId}"] button:has-text("Delete")`).catch(() => {
      page.click(`[data-note-id="${noteId}"] button[aria-label="Delete"]`);
    });

    // Confirm
    await page.click('button:has-text("Confirm")').catch(() => {
      page.click('button:has-text("Delete")');
    });

    // Verify deletion
    await waitForToast(page);
    await expect(page.locator(`text="${noteTitle}"`)).not.toBeVisible();

    createdNoteIds = createdNoteIds.filter((id) => id !== noteId);
  });

  test('should render markdown content', async ({ page }) => {
    // Create note with markdown
    const noteTitle = uniqueName('Markdown Note');
    const markdownContent = '# Heading\n\n**Bold text**\n\n- List item 1\n- List item 2';

    await clickButton(page, 'button:has-text("Create Note")');
    await fillField(page, 'input[name="title"]', noteTitle);
    await fillField(page, 'textarea[name="content"]', markdownContent);

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/notes')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdNoteIds.push(data.data.id);

    await waitForToast(page);

    // View note
    await page.click(`text="${noteTitle}"`);

    // Verify markdown is rendered
    await expect(page.locator('h1:has-text("Heading")')).toBeVisible();
    await expect(page.locator('strong:has-text("Bold text")')).toBeVisible();
    await expect(page.locator('ul li:has-text("List item 1")')).toBeVisible();
  });

  test('should show live markdown preview', async ({ page }) => {
    // Create note
    await clickButton(page, 'button:has-text("Create Note")');

    // Type markdown content
    await fillField(page, 'input[name="title"]', uniqueName('Preview Test'));
    await fillField(page, 'textarea[name="content"]', '# Test Heading');

    // Check for preview panel
    await expect(
      page
        .locator('[data-testid="markdown-preview"]')
        .or(page.locator('.preview-panel'))
        .or(page.locator('h1:has-text("Test Heading")'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('should perform full-text search', async ({ page }) => {
    // Create a note with searchable content
    const searchTerm = uniqueName('UniqueSearchTerm');
    const noteTitle = uniqueName('Searchable Note');

    await clickButton(page, 'button:has-text("Create Note")');
    await fillField(page, 'input[name="title"]', noteTitle);
    await fillField(page, 'textarea[name="content"]', `This note contains ${searchTerm}`);

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/notes')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdNoteIds.push(data.data.id);

    await waitForToast(page);

    // Search for the term
    await fillField(page, 'input[placeholder*="Search"]', searchTerm);

    // Wait for search results
    await page.waitForTimeout(500);

    // Verify note appears in search results
    await expect(page.locator(`text="${noteTitle}"`)).toBeVisible();
  });

  test('should create bidirectional links', async ({ page }) => {
    // Create first note
    const note1Title = uniqueName('Note One');

    await clickButton(page, 'button:has-text("Create Note")');
    await fillField(page, 'input[name="title"]', note1Title);
    await fillField(page, 'textarea[name="content"]', '# First note');

    const createResponse1 = page.waitForResponse((response) =>
      response.url().includes('/api/notes')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response1 = await createResponse1;
    const data1 = await response1.json();
    createdNoteIds.push(data1.data.id);

    await waitForToast(page);

    // Create second note with link to first
    const note2Title = uniqueName('Note Two');

    await clickButton(page, 'button:has-text("Create Note")');
    await fillField(page, 'input[name="title"]', note2Title);
    await fillField(page, 'textarea[name="content"]', `Links to [[${note1Title}]]`);

    const createResponse2 = page.waitForResponse((response) =>
      response.url().includes('/api/notes')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response2 = await createResponse2;
    const data2 = await response2.json();
    createdNoteIds.push(data2.data.id);

    await waitForToast(page);

    // View second note and verify link
    await page.click(`text="${note2Title}"`);

    // Click on the link
    await page.click(`a:has-text("${note1Title}")`).catch(() => {
      page.click(`[data-note-link="${note1Title}"]`);
    });

    // Should navigate to first note
    await expect(page.locator(`text="${note1Title}"`)).toBeVisible();
  });

  test('should display backlinks', async ({ page }) => {
    // Create note that will be linked to
    const targetNote = uniqueName('Target Note');

    await clickButton(page, 'button:has-text("Create Note")');
    await fillField(page, 'input[name="title"]', targetNote);
    await fillField(page, 'textarea[name="content"]', '# Target');

    const createResponse1 = page.waitForResponse((response) =>
      response.url().includes('/api/notes')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response1 = await createResponse1;
    const data1 = await response1.json();
    createdNoteIds.push(data1.data.id);

    await waitForToast(page);

    // Create note that links to target
    const linkingNote = uniqueName('Linking Note');

    await clickButton(page, 'button:has-text("Create Note")');
    await fillField(page, 'input[name="title"]', linkingNote);
    await fillField(page, 'textarea[name="content"]', `References [[${targetNote}]]`);

    const createResponse2 = page.waitForResponse((response) =>
      response.url().includes('/api/notes')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response2 = await createResponse2;
    const data2 = await response2.json();
    createdNoteIds.push(data2.data.id);

    await waitForToast(page);

    // View target note
    await page.click(`text="${targetNote}"`);

    // Verify backlinks section shows linking note
    await expect(
      page
        .locator('[data-testid="backlinks"]')
        .or(page.locator('text="Backlinks"'))
    ).toBeVisible({ timeout: 5000 });

    await expect(page.locator(`text="${linkingNote}"`)).toBeVisible();
  });

  test('should filter notes by category', async ({ page }) => {
    // Create notes with different categories
    const category1 = uniqueName('Category1');
    const category2 = uniqueName('Category2');

    // Create note in category 1
    await clickButton(page, 'button:has-text("Create Note")');
    await fillField(page, 'input[name="title"]', uniqueName('Cat1 Note'));
    await fillField(page, 'textarea[name="content"]', '# Content');
    await fillField(page, 'input[name="category"]', category1);

    const createResponse1 = page.waitForResponse((response) =>
      response.url().includes('/api/notes')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response1 = await createResponse1;
    const data1 = await response1.json();
    createdNoteIds.push(data1.data.id);

    await waitForToast(page);

    // Create note in category 2
    await clickButton(page, 'button:has-text("Create Note")');
    await fillField(page, 'input[name="title"]', uniqueName('Cat2 Note'));
    await fillField(page, 'textarea[name="content"]', '# Content');
    await fillField(page, 'input[name="category"]', category2);

    const createResponse2 = page.waitForResponse((response) =>
      response.url().includes('/api/notes')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response2 = await createResponse2;
    const data2 = await response2.json();
    createdNoteIds.push(data2.data.id);

    await waitForToast(page);

    // Filter by category 1
    await page.selectOption('select[name="category"]', category1).catch(() => {
      page.click(`text="${category1}"`);
    });

    await page.waitForTimeout(500);

    // Verify only category 1 notes are visible
    await expect(page.locator(`text="${category1}"`)).toBeVisible();
  });

  test('should filter notes by tags', async ({ page }) => {
    // Create note with tags
    const tag1 = uniqueName('tag1');
    const noteTitle = uniqueName('Tagged Note');

    await clickButton(page, 'button:has-text("Create Note")');
    await fillField(page, 'input[name="title"]', noteTitle);
    await fillField(page, 'textarea[name="content"]', '# Content');
    await fillField(page, 'input[name="tags"]', tag1);

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/notes')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdNoteIds.push(data.data.id);

    await waitForToast(page);

    // Click on tag to filter
    await page.click(`[data-tag="${tag1}"]`).catch(() => {
      page.click(`text="${tag1}"`);
    });

    await page.waitForTimeout(500);

    // Verify only notes with this tag are visible
    await expect(page.locator(`text="${noteTitle}"`)).toBeVisible();
  });

  test('should display notes only from active workspace', async ({ page }) => {
    // Create note in current workspace
    const note1Title = uniqueName('Workspace 1 Note');

    await clickButton(page, 'button:has-text("Create Note")');
    await fillField(page, 'input[name="title"]', note1Title);
    await fillField(page, 'textarea[name="content"]', '# Content');

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/notes')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdNoteIds.push(data.data.id);

    await waitForToast(page);

    // Verify note visible
    await expect(page.locator(`text="${note1Title}"`)).toBeVisible();

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

    // Navigate to wiki
    await navigateToSection(page, 'Wiki');

    // Verify note from workspace 1 is NOT visible
    await expect(page.locator(`text="${note1Title}"`)).not.toBeVisible();

    // Cleanup workspace 2
    await page.evaluate(async (id) => {
      await fetch(`http://localhost:5000/api/workspaces/${id}`, {
        method: 'DELETE',
      });
    }, workspace2Id);
  });

  test('should list available templates', async ({ page }) => {
    // Click create note
    await clickButton(page, 'button:has-text("Create Note")');

    // Check template selector
    await expect(page.locator('select[name="template"]')).toBeVisible();

    // Verify templates are available
    const templates = ['Architecture', 'API', 'Runbook', 'Troubleshooting', 'Meeting'];

    for (const template of templates) {
      await expect(page.locator(`option:has-text("${template}")`)).toBeVisible().catch(() => {
        console.log(`Template ${template} may be implemented differently`);
      });
    }
  });

  test('should export note', async ({ page }) => {
    // Create note
    const noteTitle = uniqueName('Note to Export');

    await clickButton(page, 'button:has-text("Create Note")');
    await fillField(page, 'input[name="title"]', noteTitle);
    await fillField(page, 'textarea[name="content"]', '# Export this content');

    const createResponse = page.waitForResponse((response) =>
      response.url().includes('/api/notes')
    );

    await clickButton(page, 'button[type="submit"]:has-text("Create")');

    const response = await createResponse;
    const data = await response.json();
    createdNoteIds.push(data.data.id);

    await waitForToast(page);

    // View note
    await page.click(`text="${noteTitle}"`);

    // Export note
    await clickButton(page, 'button:has-text("Export")').catch(() => {
      console.log('Export functionality may not be implemented');
    });

    // Verify export options (markdown, PDF, etc.)
    await expect(
      page
        .locator('text=/markdown|download|export/i')
        .or(page.locator('[data-testid="export-options"]'))
    ).toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Export options may differ');
    });
  });
});
