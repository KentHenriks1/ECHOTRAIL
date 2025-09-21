import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { faker } from "@faker-js/faker";

// Mock data generators
const generateUser = () => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  avatar: faker.image.avatar(),
  role: faker.helpers.arrayElement(["USER", "ADMIN"]),
  preferences: {},
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
});

const generateTrail = () => ({
  id: faker.string.uuid(),
  name: faker.location.city() + " Trail",
  description: faker.lorem.sentences(),
  isPublic: faker.datatype.boolean(),
  metadata: {
    distance: faker.number.float({ min: 1, max: 50, fractionDigits: 2 }),
    duration: faker.number.int({ min: 300, max: 18000 }), // 5 min to 5 hours
    difficulty: faker.helpers.arrayElement(["easy", "moderate", "hard"]),
  },
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  userId: faker.string.uuid(),
});

const generateTrackPoint = () => ({
  id: faker.string.uuid(),
  latitude: faker.location.latitude(),
  longitude: faker.location.longitude(),
  timestamp: faker.date.recent().toISOString(),
  accuracy: faker.number.float({ min: 3, max: 10, fractionDigits: 1 }),
  altitude: faker.number.float({ min: 0, max: 2000, fractionDigits: 1 }),
  speed: faker.number.float({ min: 0, max: 15, fractionDigits: 2 }),
  heading: faker.number.float({ min: 0, max: 360, fractionDigits: 1 }),
  createdAt: faker.date.recent().toISOString(),
  trailId: faker.string.uuid(),
});

// API handlers
export const handlers = [
  // Health check
  http.get("http://localhost:3000/api/v1/health", () => {
    return HttpResponse.json({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        services: {
          database: "healthy",
          redis: "healthy",
        },
      },
    });
  }),

  // Authentication endpoints
  http.post("http://localhost:3000/api/v1/auth/login", async ({ request }) => {
    const body = (await request.json()) as any;

    if (body.email === "test@example.com" && body.password === "password123") {
      return HttpResponse.json({
        success: true,
        data: {
          user: generateUser(),
          token: "mock-jwt-token",
          refreshToken: "mock-refresh-token",
        },
      });
    }

    return HttpResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      },
      { status: 401 }
    );
  }),

  http.post(
    "http://localhost:3000/api/v1/auth/register",
    async ({ request }) => {
      const body = (await request.json()) as any;

      return HttpResponse.json(
        {
          success: true,
          data: {
            user: generateUser(),
            token: "mock-jwt-token",
            refreshToken: "mock-refresh-token",
          },
        },
        { status: 201 }
      );
    }
  ),

  http.post("http://localhost:3000/api/v1/auth/refresh", () => {
    return HttpResponse.json({
      success: true,
      data: {
        token: "new-mock-jwt-token",
        refreshToken: "new-mock-refresh-token",
      },
    });
  }),

  http.post("http://localhost:3000/api/v1/auth/logout", () => {
    return HttpResponse.json({
      success: true,
      data: null,
    });
  }),

  // User endpoints
  http.get("http://localhost:3000/api/v1/users/me", () => {
    return HttpResponse.json({
      success: true,
      data: generateUser(),
    });
  }),

  http.put("http://localhost:3000/api/v1/users/me", async ({ request }) => {
    const body = (await request.json()) as any;

    return HttpResponse.json({
      success: true,
      data: {
        ...generateUser(),
        ...body,
      },
    });
  }),

  // Trail endpoints
  http.get("http://localhost:3000/api/v1/trails", ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const search = url.searchParams.get("search");

    const trails = Array.from({ length: limit }, generateTrail);

    return HttpResponse.json({
      success: true,
      data: {
        trails,
        pagination: {
          page,
          limit,
          total: 100,
          pages: Math.ceil(100 / limit),
        },
      },
    });
  }),

  http.get("http://localhost:3000/api/v1/trails/:id", ({ params }) => {
    const trail = {
      ...generateTrail(),
      id: params.id as string,
    };

    return HttpResponse.json({
      success: true,
      data: trail,
    });
  }),

  http.post("http://localhost:3000/api/v1/trails", async ({ request }) => {
    const body = (await request.json()) as any;

    const trail = {
      ...generateTrail(),
      ...body,
      id: faker.string.uuid(),
    };

    return HttpResponse.json(
      {
        success: true,
        data: trail,
      },
      { status: 201 }
    );
  }),

  http.put(
    "http://localhost:3000/api/v1/trails/:id",
    async ({ params, request }) => {
      const body = (await request.json()) as any;

      const trail = {
        ...generateTrail(),
        ...body,
        id: params.id as string,
      };

      return HttpResponse.json({
        success: true,
        data: trail,
      });
    }
  ),

  http.delete("http://localhost:3000/api/v1/trails/:id", ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: null,
    });
  }),

  // Track points endpoints
  http.get("*/api/v1/trails/:id/points", ({ params, request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");

    const points = Array.from({ length: limit }, () => ({
      ...generateTrackPoint(),
      trailId: params.id as string,
    }));

    return HttpResponse.json({
      success: true,
      data: points,
    });
  }),

  http.post("*/api/v1/trails/:id/points", async ({ params, request }) => {
    const body = (await request.json()) as any;

    const points = Array.isArray(body)
      ? body.map((point) => ({
          ...generateTrackPoint(),
          ...point,
          trailId: params.id as string,
        }))
      : [
          {
            ...generateTrackPoint(),
            ...body,
            trailId: params.id as string,
          },
        ];

    return HttpResponse.json(
      {
        success: true,
        data: points,
      },
      { status: 201 }
    );
  }),

  // Share endpoints
  http.post("*/api/v1/trails/:id/share", ({ params }) => {
    return HttpResponse.json(
      {
        success: true,
        data: {
          id: faker.string.uuid(),
          token: faker.string.uuid().replace(/-/g, "").substring(0, 32),
          expiresAt: faker.date.future().toISOString(),
          isActive: true,
          createdAt: faker.date.recent().toISOString(),
          trailId: params.id as string,
        },
      },
      { status: 201 }
    );
  }),

  http.get("*/api/v1/share/:token", ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        trail: generateTrail(),
        shareLink: {
          id: faker.string.uuid(),
          token: params.token as string,
          expiresAt: faker.date.future().toISOString(),
          isActive: true,
          createdAt: faker.date.recent().toISOString(),
        },
      },
    });
  }),

  // Error handling
  http.get("http://localhost:3000/api/v1/error/500", () => {
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    );
  }),

  http.get("http://localhost:3000/api/v1/error/404", () => {
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
        },
      },
      { status: 404 }
    );
  }),
];

// Setup server
export const server = setupServer(...handlers);

// Server lifecycle helpers
export const setupMockServer = () => {
  const { beforeAll, afterEach, afterAll } = require("@jest/globals");

  beforeAll(() => {
    server.listen({
      onUnhandledRequest: "warn",
    });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });
};

// Mock global fetch to work with MSW
if (typeof global !== "undefined" && !global.fetch) {
  global.fetch = require("node-fetch");
}
