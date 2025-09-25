import { describe, it, expect, beforeAll, afterAll, jest } from "@jest/globals";
import { apiService } from "../../services/ApiService";
import { Trail } from "../../types/Trail";

// Mock localStorage for Node.js environment
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Advanced API Integration Tests", () => {
  beforeAll(() => {
    // Use test environment
    process.env.NODE_ENV = "test";
  });

  afterAll(() => {
    process.env.NODE_ENV = "development";
  });

  describe("Error Handling & Edge Cases", () => {
    it("should handle network timeout gracefully", async () => {
      // Mock slow network
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Network timeout")), 1000);
          })
      ) as any;

      try {
        await expect(apiService.getTrails()).rejects.toThrow("Network timeout");
      } finally {
        global.fetch = originalFetch;
      }
    }, 5000); // 5 second timeout

    it("should handle malformed JSON responses", async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve("invalid json{"),
          json: () => Promise.reject(new Error("Invalid JSON")),
        })
      ) as any;

      try {
        await expect(apiService.getTrails()).rejects.toThrow();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should handle 429 rate limiting with proper retry", async () => {
      let callCount = 0;
      const originalFetch = global.fetch;

      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: new Map([["retry-after", "1"]]),
            json: () => Promise.resolve({ error: "Rate limit exceeded" }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: [],
              pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
            }),
        });
      }) as any;

      try {
        const result = await apiService.getTrails();
        expect(result).toBeDefined();
        expect(callCount).toBeGreaterThan(1);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should handle server errors (500) gracefully", async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: () => Promise.resolve({ error: "Internal server error" }),
        })
      ) as any;

      try {
        await expect(apiService.getTrails()).rejects.toThrow(
          "Internal server error"
        );
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should handle authentication expiry", async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: "Token expired" }),
        })
      ) as any;

      try {
        await expect(apiService.getTrails()).rejects.toThrow(
          "Authentication failed"
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("Data Validation & Sanitization", () => {
    it("should validate trail data before saving", async () => {
      const invalidTrail = {
        name: "", // Empty name should fail
        coordinates: [],
        description: "Test trail",
      };

      await expect(apiService.createTrail(invalidTrail as any)).rejects.toThrow(
        "Invalid trail data: name is required"
      );
    }, 3000); // 3 second timeout

    it("should sanitize malicious input", async () => {
      const maliciousTrail = {
        name: '<script>alert("xss")</script>',
        description: "javascript:void(0)",
        coordinates: [{ lat: 59.9139, lng: 10.7522 }],
      };

      const originalFetch = global.fetch;
      let capturedBody: any;

      global.fetch = jest.fn().mockImplementation((url, options) => {
        capturedBody = JSON.parse((options as any)?.body as string);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              success: true,
              trail: { id: "test-id", ...capturedBody },
            }),
        });
      }) as any;

      try {
        await apiService.createTrail(maliciousTrail as any);

        // Verify input was sanitized
        expect(capturedBody.name).not.toContain("<script>");
        expect(capturedBody.description).not.toContain("javascript:");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should handle extremely large datasets gracefully", async () => {
      const largeTrail = {
        name: "Large Trail",
        description: "A" + "very ".repeat(10000) + "long description",
        coordinates: Array.from({ length: 50000 }, (_, i) => ({
          lat: 59.9139 + Math.random() * 0.01,
          lng: 10.7522 + Math.random() * 0.01,
          elevation: Math.random() * 1000,
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
        })),
      };

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              success: true,
              trail: { id: "large-trail-id", ...largeTrail },
            }),
        })
      ) as any;

      try {
        const result = await apiService.createTrail(largeTrail as any);
        expect(result).toBeDefined();
        expect(result.trail?.id).toBe("large-trail-id");
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("Concurrent Request Handling", () => {
    it("should handle multiple simultaneous requests", async () => {
      const originalFetch = global.fetch;
      let requestCount = 0;

      global.fetch = jest.fn().mockImplementation(() => {
        requestCount++;
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: () =>
                Promise.resolve({
                  success: true,
                  data: [
                    {
                      id: `trail-${requestCount}`,
                      name: `Trail ${requestCount}`,
                    },
                  ],
                  pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
                }),
            });
          }, Math.random() * 100); // Random delay
        });
      }) as any;

      try {
        const promises = Array.from({ length: 10 }, () =>
          apiService.getTrails()
        );
        const results = await Promise.all(promises);

        expect(results).toHaveLength(10);
        expect(requestCount).toBe(10);
        results.forEach((result, index) => {
          expect(result.data).toBeDefined();
        });
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should handle partial failures in batch operations", async () => {
      const originalFetch = global.fetch;
      let callCount = 0;

      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        const shouldFail = callCount % 3 === 0; // Every 3rd request fails

        return Promise.resolve({
          ok: !shouldFail,
          status: shouldFail ? 500 : 200,
          json: () =>
            Promise.resolve(
              shouldFail
                ? { success: false, error: "Server error" }
                : {
                    success: true,
                    data: [{ id: `trail-${callCount}` }],
                    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
                  }
            ),
        });
      }) as any;

      try {
        const promises = Array.from({ length: 9 }, () =>
          apiService.getTrails().catch((error) => ({ error: error.message }))
        );
        const results = await Promise.all(promises);

        const successes = results.filter((r) => !(r as any).error);
        const failures = results.filter((r) => (r as any).error);

        expect(successes).toHaveLength(6); // 6 successful requests
        expect(failures).toHaveLength(3); // 3 failed requests
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("Cache and Performance Edge Cases", () => {
    it("should handle cache corruption gracefully", async () => {
      // Simulate corrupted cache
      localStorage.setItem("api_cache_trails", "invalid json{");

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: [{ id: "fresh-trail" }],
              pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
            }),
        })
      ) as any;

      try {
        const result = await apiService.getTrails();
        expect(result.data).toBeDefined();
        expect(result.data[0].id).toBe("fresh-trail");
      } finally {
        global.fetch = originalFetch;
        localStorage.removeItem("api_cache_trails");
      }
    });

    it("should handle memory pressure during large operations", async () => {
      // Simulate memory-intensive operation
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() => {
        // Create large response
        const largeResponse = {
          success: true,
          data: Array.from({ length: 10000 }, (_, i) => ({
            id: `trail-${i}`,
            name: `Trail ${i}`,
            coordinates: Array.from({ length: 1000 }, (_, j) => ({
              lat: 59.9139 + Math.random() * 0.01,
              lng: 10.7522 + Math.random() * 0.01,
            })),
          })),
          pagination: { page: 1, limit: 10000, total: 10000, totalPages: 1 },
        };

        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(largeResponse),
        });
      }) as any;

      try {
        const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const result = await apiService.getTrails();
        const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

        expect(result.data).toBeDefined();
        expect(result.data.length).toBe(10000);

        // Memory usage should be reasonable (not more than 100MB increase)
        const memoryIncrease = endMemory - startMemory;
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("Security & Authorization Edge Cases", () => {
    it("should handle privilege escalation attempts", async () => {
      const maliciousRequest = {
        name: "Trail",
        isPublic: false,
        adminOverride: true, // Should be ignored
        userId: "different-user-id", // Should be ignored
        systemAdmin: true, // Should be ignored
      };

      const originalFetch = global.fetch;
      let capturedBody: any;

      global.fetch = jest.fn().mockImplementation((url, options) => {
        capturedBody = JSON.parse((options as any)?.body as string);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              success: true,
              trail: { id: "safe-trail", ...capturedBody },
            }),
        });
      }) as any;

      try {
        await apiService.createTrail(maliciousRequest as any);

        // Verify malicious fields were stripped
        expect(capturedBody.adminOverride).toBeUndefined();
        expect(capturedBody.systemAdmin).toBeUndefined();
        expect(capturedBody.userId).not.toBe("different-user-id");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should handle CSRF token validation", async () => {
      const originalFetch = global.fetch;
      let csrfTokenSent = false;

      global.fetch = jest.fn().mockImplementation((url, options) => {
        const headers = (options as any)?.headers as Record<string, string>;
        csrfTokenSent = headers && "X-CSRF-Token" in headers;

        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        });
      }) as any;

      try {
        await apiService.createTrail({
          name: "Test Trail",
          coordinates: [],
        } as any);
        expect(csrfTokenSent).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
