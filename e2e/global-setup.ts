import { chromium, FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  console.log("🚀 Starting E2E test setup...");

  // Wait for the Expo dev server to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the app to be available
    await page.goto("http://localhost:8081", { waitUntil: "networkidle" });
    console.log("✅ Expo dev server is ready");
  } catch (error) {
    console.error("❌ Failed to connect to Expo dev server:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
