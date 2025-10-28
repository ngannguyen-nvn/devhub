/**
 * Test Helper Functions
 *
 * Reusable utilities for e2e tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for navigation to complete and page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    // Network idle might timeout, that's okay
  });
}

/**
 * Navigate to a specific section using the sidebar
 */
export async function navigateToSection(page: Page, sectionName: string) {
  await page.click(`nav a:has-text("${sectionName}")`);
  await waitForPageLoad(page);
}

/**
 * Wait for a toast notification to appear
 */
export async function waitForToast(page: Page, message?: string) {
  const toastSelector = '[role="status"]';
  await page.waitForSelector(toastSelector, { timeout: 5000 });

  if (message) {
    await expect(page.locator(toastSelector)).toContainText(message);
  }
}

/**
 * Clear the test database by deleting all test resources
 */
export async function cleanupTestData(page: Page, context: {
  workspaces?: string[];
  services?: string[];
  profiles?: string[];
  notes?: string[];
}) {
  // Note: This assumes we have API access or can use the UI to cleanup
  // For now, we'll use API calls via fetch

  const apiUrl = 'http://localhost:5000/api';

  // Delete workspaces (cascade will delete associated resources)
  if (context.workspaces) {
    for (const workspaceId of context.workspaces) {
      try {
        await page.evaluate(async (args) => {
          await fetch(`${args.apiUrl}/workspaces/${args.workspaceId}`, {
            method: 'DELETE',
          });
        }, { apiUrl, workspaceId });
      } catch (error) {
        console.warn(`Failed to delete workspace ${workspaceId}:`, error);
      }
    }
  }

  // Delete standalone services (if any)
  if (context.services) {
    for (const serviceId of context.services) {
      try {
        await page.evaluate(async (args) => {
          await fetch(`${args.apiUrl}/services/${args.serviceId}`, {
            method: 'DELETE',
          });
        }, { apiUrl, serviceId });
      } catch (error) {
        console.warn(`Failed to delete service ${serviceId}:`, error);
      }
    }
  }

  // Delete env profiles (if any)
  if (context.profiles) {
    for (const profileId of context.profiles) {
      try {
        await page.evaluate(async (args) => {
          await fetch(`${args.apiUrl}/env/profiles/${args.profileId}`, {
            method: 'DELETE',
          });
        }, { apiUrl, profileId });
      } catch (error) {
        console.warn(`Failed to delete profile ${profileId}:`, error);
      }
    }
  }

  // Delete notes (if any)
  if (context.notes) {
    for (const noteId of context.notes) {
      try {
        await page.evaluate(async (args) => {
          await fetch(`${args.apiUrl}/notes/${args.noteId}`, {
            method: 'DELETE',
          });
        }, { apiUrl, noteId });
      } catch (error) {
        console.warn(`Failed to delete note ${noteId}:`, error);
      }
    }
  }
}

/**
 * Wait for an element to be visible and stable
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Fill a form field and wait for it to be updated
 */
export async function fillField(page: Page, selector: string, value: string) {
  await page.fill(selector, value);
  await page.waitForTimeout(100); // Small delay for reactivity
}

/**
 * Click a button and wait for action to complete
 */
export async function clickButton(page: Page, selector: string) {
  await page.click(selector);
  await page.waitForTimeout(200); // Small delay for action to process
}

/**
 * Get the ID from a created resource by intercepting network response
 */
export async function getCreatedResourceId(page: Page, urlPattern: RegExp): Promise<string> {
  return new Promise((resolve) => {
    page.on('response', async (response) => {
      if (response.url().match(urlPattern) && response.status() === 200) {
        const data = await response.json();
        if (data.success && data.data?.id) {
          resolve(data.data.id);
        }
      }
    });
  });
}

/**
 * Switch to a specific workspace
 */
export async function switchWorkspace(page: Page, workspaceName: string) {
  // Click workspace switcher
  await page.click('[data-testid="workspace-switcher"]').catch(() => {
    // If testid doesn't exist, try finding by text
    page.click('button:has-text("Workspace")');
  });

  // Select workspace from dropdown
  await page.click(`text="${workspaceName}"`);

  // Wait for workspace to switch
  await waitForPageLoad(page);
}

/**
 * Create a test workspace and activate it
 */
export async function createAndActivateWorkspace(
  page: Page,
  name: string,
  description?: string
): Promise<string> {
  // Navigate to workspaces
  await navigateToSection(page, 'Workspaces');

  // Click create button
  await clickButton(page, 'button:has-text("Create Workspace")');

  // Fill form
  await fillField(page, 'input[name="name"]', name);
  if (description) {
    await fillField(page, 'textarea[name="description"]', description);
  }

  // Submit and capture ID
  const idPromise = getCreatedResourceId(page, /\/api\/workspaces$/);
  await clickButton(page, 'button[type="submit"]');

  const workspaceId = await idPromise;

  // Wait for workspace to be created
  await waitForToast(page);

  return workspaceId;
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
}
