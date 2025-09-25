// Minimal Prisma client stub for Vercel
// This allows the app to build without full database connection requirements

export const prismaVercel = {
  user: {
    findUnique: async () => ({ id: 'mock', email: 'mock@test.com', name: 'Mock User', role: 'USER' }),
    create: async () => ({ id: 'mock', email: 'mock@test.com', name: 'Mock User', role: 'USER' }),
    update: async () => ({ id: 'mock', email: 'mock@test.com', name: 'Mock User', role: 'USER' }),
    delete: async () => ({ id: 'mock', email: 'mock@test.com', name: 'Mock User', role: 'USER' }),
  },
  trail: {
    findMany: async () => [],
    findUnique: async () => null,
    create: async () => ({ id: 'mock', name: 'Mock Trail' }),
    update: async () => ({ id: 'mock', name: 'Mock Trail' }),
    delete: async () => ({ id: 'mock', name: 'Mock Trail' }),
  },
  $disconnect: async () => {},
  $queryRaw: async () => [{ count: 1 }],
}

export { prismaVercel as prisma }