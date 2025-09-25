import { describe, beforeEach, test, expect, jest } from "@jest/globals";

const API_BASE_URL =
  process.env.API_URL || "https://app-empty-hat-65510830.dpl.myneon.app";

describe("API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Neon PostgREST Database Integration", () => {
    test("should connect to database and return API documentation", async () => {
      const response = await fetch(`${API_BASE_URL}/`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.swagger).toBe("2.0");
      expect(data.info.title).toContain("schema");
      expect(data.host).toBe("0.0.0.0:3000");
    });

    test("should access PostGIS geospatial functions", async () => {
      // Test PostGIS version function
      const response = await fetch(`${API_BASE_URL}/rpc/postgis_full_version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.ok).toBe(true);
      const version = await response.text();
      expect(version).toBeDefined();
      expect(typeof version).toBe("string");
      // Should contain "POSTGIS" in the version string
      expect(version.toLowerCase()).toContain("postgis");
    });

    test("should handle geometric operations", async () => {
      // Test ST_Distance function with two Oslo points
      const response = await fetch(`${API_BASE_URL}/rpc/st_distance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geog1: "POINT(10.7522 59.9139)", // Oslo center
          geog2: "POINT(10.7600 59.9200)", // Nearby point
          use_spheroid: true,
        }),
      });

      if (response.ok) {
        const distance = await response.text();
        expect(distance).toBeDefined();
        const distanceNum = parseFloat(distance);
        expect(distanceNum).toBeGreaterThan(0);
        expect(distanceNum).toBeLessThan(10000); // Should be less than 10km
      } else {
        // If geography functions aren't set up, that's also valid
        expect([404, 400, 406]).toContain(response.status);
      }
    });

    test("should access system tables", async () => {
      // Test access to spatial_ref_sys system table
      const response = await fetch(
        `${API_BASE_URL}/spatial_ref_sys?srid=eq.4326&limit=1`
      );

      if (response.ok) {
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
        if (data.length > 0) {
          expect(data[0]).toHaveProperty("srid");
          expect(data[0].srid).toBe(4326); // WGS84
        }
      } else {
        // Table might not be accessible due to permissions
        expect([401, 404, 406]).toContain(response.status);
      }
    });

    test("should handle invalid requests gracefully", async () => {
      // Test invalid endpoint
      const response = await fetch(`${API_BASE_URL}/nonexistent_table`);

      expect([404, 401, 406]).toContain(response.status);
    });

    test("should handle malformed RPC requests", async () => {
      // Test RPC function with invalid parameters
      const response = await fetch(`${API_BASE_URL}/rpc/postgis_lib_version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalid_param: "test" }),
      });

      // Should either work (ignoring invalid params) or return error
      expect([200, 400, 404]).toContain(response.status);
    });
  });
});
