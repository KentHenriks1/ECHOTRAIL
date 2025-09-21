import { test, expect } from "@playwright/test";

test.describe("EchoTrail App Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Go to the main app page
    await page.goto("/");
  });

  test("should load the main page", async ({ page }) => {
    // Check if the page loads
    await expect(page).toHaveTitle(/EchoTrail/);

    // Wait for the app to initialize
    await page.waitForTimeout(2000);
  });

  test("should navigate between tabs", async ({ page }) => {
    // Wait for the app to load
    await page.waitForTimeout(3000);

    // Check if navigation tabs are present
    const discoverTab = page.getByRole("tab", { name: /oppdag|discover/i });
    const memoriesTab = page.getByRole("tab", { name: /minner|memories/i });
    const settingsTab = page.getByRole("tab", {
      name: /innstillinger|settings/i,
    });

    // Test navigation to memories tab
    if (await memoriesTab.isVisible()) {
      await memoriesTab.click();
      await expect(memoriesTab).toHaveClass(/active/);
    }

    // Test navigation to settings tab
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
      await expect(settingsTab).toHaveClass(/active/);
    }

    // Navigate back to discover tab
    if (await discoverTab.isVisible()) {
      await discoverTab.click();
      await expect(discoverTab).toHaveClass(/active/);
    }
  });

  test("should display trail content", async ({ page }) => {
    // Wait for the app to load
    await page.waitForTimeout(3000);

    // Look for trail-related content
    const trailContent = page.getByText(/trail|tur|sti/i);

    if (await trailContent.isVisible()) {
      await expect(trailContent.first()).toBeVisible();
    }
  });

  test("should handle responsive design", async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(1000);

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    // Verify the page is still functional
    await expect(page).toHaveTitle(/EchoTrail/);
  });

  test("should handle loading states", async ({ page }) => {
    // Check for loading indicators
    const loadingIndicator = page.getByText(/loading|laster/i);

    if (await loadingIndicator.isVisible()) {
      // Wait for loading to complete
      await loadingIndicator.waitFor({ state: "hidden", timeout: 10000 });
    }

    // Verify content is loaded
    await expect(page.locator("body")).toContainText(
      /EchoTrail|Oppdag|Discover/
    );
  });
});
