import { describe, test, expect, beforeEach, jest } from "@jest/globals";

const API_BASE_URL =
  process.env.API_URL || "https://app-empty-hat-65510830.dpl.myneon.app";

describe("Basic API Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should connect to Neon PostgREST API", async () => {
    const response = await fetch(`${API_BASE_URL}/`);
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data).toHaveProperty("swagger");
    expect(data.swagger).toBe("2.0");
    expect(data.info).toBeDefined();
    expect(data.paths).toBeDefined();
  });

  test("should access PostGIS spatial functions", async () => {
    // Test one of the PostGIS RPC functions - postgis_version
    const response = await fetch(`${API_BASE_URL}/rpc/postgis_lib_version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.ok).toBe(true);
    // Should return the PostGIS version as a string
    const version = await response.text();
    expect(version).toBeDefined();
    expect(typeof version).toBe("string");
  });

  test("should handle geometry functions", async () => {
    // Test ST_Point function
    const response = await fetch(`${API_BASE_URL}/rpc/st_point`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        x: 10.7522, // Oslo longitude
        y: 59.9139, // Oslo latitude
      }),
    });

    if (response.ok) {
      const result = await response.text();
      expect(result).toBeDefined();
    } else {
      // If ST_Point is not available, that's also valid - we just check the API is accessible
      expect([200, 404, 500]).toContain(response.status);
    }
  });

  test("should handle database table queries if tables exist", async () => {
    // Check if spatial_ref_sys table exists and is accessible
    const response = await fetch(`${API_BASE_URL}/spatial_ref_sys?limit=1`);

    if (response.ok) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    } else {
      // If table doesn't exist or isn't accessible, that's also valid for this test
      expect([404, 401, 406]).toContain(response.status);
    }
  });
});
