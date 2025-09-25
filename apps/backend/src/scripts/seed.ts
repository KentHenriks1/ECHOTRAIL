/**
 * Database Seeding Script
 * Creates demo users and data for testing
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Logger } from '../utils/logger';

const prisma = new PrismaClient();
const logger = new Logger('DatabaseSeed');

async function main() {
  logger.info('Starting database seeding...');

  try {
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123!@#', 12);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@echotrail.app' },
      update: {},
      create: {
        email: 'admin@echotrail.app',
        name: 'EchoTrail Admin',
        password_hash: adminPassword,
        role: 'ADMIN',
        units: 'METRIC',
        language: 'EN',
        mapStyle: 'standard',
        privacyLevel: 'PUBLIC',
      },
    });
    logger.info(`Admin user created/updated: ${admin.email}`);

    // Create demo user
    const demoPassword = await bcrypt.hash('demo123!@#', 12);
    const demo = await prisma.user.upsert({
      where: { email: 'demo@echotrail.app' },
      update: {},
      create: {
        email: 'demo@echotrail.app',
        name: 'Demo User',
        password_hash: demoPassword,
        role: 'USER',
        units: 'METRIC',
        language: 'EN',
        mapStyle: 'standard',
        privacyLevel: 'PUBLIC',
      },
    });
    logger.info(`Demo user created/updated: ${demo.email}`);

    // Create sample story
    const story = await prisma.story.upsert({
      where: { id: 'demo-story-oslo' },
      update: {},
      create: {
        id: 'demo-story-oslo',
        title: 'The Royal Palace Gardens',
        content: `In the heart of Oslo, where the Royal Palace stands proudly, there once lived a gardener named Erik who discovered something extraordinary. Legend says that in 1880, while tending to the palace gardens, Erik found a hidden grove where the trees whispered stories of ancient kings and queens.

Every morning, as the sun rose over the Oslofjord, Erik would listen to these whispers and learn about the secret meetings that took place in these very gardens. It was here that Crown Prince Oscar would meet with common folk, breaking royal protocol to understand the lives of his future subjects.

The old oak tree, still standing today, is said to hold the memories of these conversations. Visitors who sit quietly beneath its branches sometimes report hearing faint echoes of laughter and earnest discussions about justice, equality, and the future of Norway.`,
        location: 'Royal Palace Gardens, Oslo',
        latitude: 59.9139,
        longitude: 10.7522,
        tags: ['historical', 'royal', 'oslo', 'gardens', 'folklore'],
        category: 'HISTORICAL',
        mood: 'inspiring',
        estimatedReadTime: 2,
        prompt: 'Generate a historical story about the Royal Palace in Oslo, focusing on human connections and Norwegian culture',
        model: 'gpt-4o-mini',
        userId: demo.id,
      },
    });
    logger.info(`Demo story created/updated: ${story.title}`);

    logger.info('Database seeding completed successfully!');
    logger.info('');
    logger.info('Demo Credentials:');
    logger.info('================');
    logger.info(`Admin: admin@echotrail.app / admin123!@#`);
    logger.info(`Demo User: demo@echotrail.app / demo123!@#`);
    logger.info('');
  } catch (error) {
    logger.error('Error seeding database:', undefined, error as Error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });