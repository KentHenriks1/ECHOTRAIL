async function globalTeardown() {
  console.log("🧹 Cleaning up after E2E tests...");

  // Clean up any global resources if needed
  // For example: close database connections, stop services, etc.

  console.log("✅ E2E test cleanup completed");
}

export default globalTeardown;
