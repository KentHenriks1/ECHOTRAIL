/**
 * Data Migration Script: Add missing User schema fields
 * This script safely adds the missing fields to the User table with appropriate defaults
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Logger } from '../utils/logger';

const prisma = new PrismaClient();
const logger = new Logger('UserSchemaMigration');

async function migrateUserSchema() {
  logger.info('Starting User schema migration...');

  try {
    // First, let's check the current database structure
    logger.info('Checking current database structure...');
    
    // Raw SQL to add missing columns with defaults
    const addColumns = [
      // Add name column (copying from display_name if it exists)
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS "name" VARCHAR(255)`,
      
      // Add password column with a temporary default (will be updated for existing users)
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS "password" VARCHAR(255)`,
      
      // Add role column with default USER
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS "role" VARCHAR(20) DEFAULT 'USER'`,
      
      // Add user preferences with defaults
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS "units" VARCHAR(20) DEFAULT 'METRIC'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS "language" VARCHAR(10) DEFAULT 'EN'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS "mapStyle" VARCHAR(50) DEFAULT 'standard'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS "privacyLevel" VARCHAR(20) DEFAULT 'PUBLIC'`
    ];

    logger.info('Adding missing columns...');
    for (const query of addColumns) {
      await prisma.$executeRawUnsafe(query);
      logger.info(`Executed: ${query}`);
    }

    // Update existing users with proper values
    logger.info('Updating existing users with default values...');
    
    // Copy display_name to name if name is null
    await prisma.$executeRawUnsafe(`
      UPDATE users 
      SET "name" = COALESCE("name", "display_name", 'Unknown User') 
      WHERE "name" IS NULL OR "name" = ''
    `);

    // Set a default password for existing users (they'll need to reset)
    const defaultPasswordHash = await bcrypt.hash('ChangeMe123!@#', 12);
    await prisma.$executeRawUnsafe(`
      UPDATE users 
      SET "password" = $1 
      WHERE "password" IS NULL OR "password" = ''
    `, defaultPasswordHash);

    // Ensure all preference fields have values
    await prisma.$executeRawUnsafe(`
      UPDATE users 
      SET 
        "role" = COALESCE("role", 'USER'),
        "units" = COALESCE("units", 'METRIC'),
        "language" = COALESCE("language", 'EN'),
        "mapStyle" = COALESCE("mapStyle", 'standard'),
        "privacyLevel" = COALESCE("privacyLevel", 'PUBLIC')
    `);

    // Now make the required fields NOT NULL
    logger.info('Setting column constraints...');
    const constraintQueries = [
      `ALTER TABLE users ALTER COLUMN "name" SET NOT NULL`,
      `ALTER TABLE users ALTER COLUMN "password" SET NOT NULL`
    ];

    for (const query of constraintQueries) {
      await prisma.$executeRawUnsafe(query);
      logger.info(`Executed: ${query}`);
    }

    // Create enum types if they don't exist
    logger.info('Creating enum types...');
    const enumQueries = [
      `DO $$ BEGIN
         CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
       EXCEPTION
         WHEN duplicate_object THEN null;
       END $$;`,
       
      `DO $$ BEGIN
         CREATE TYPE "Units" AS ENUM ('METRIC', 'IMPERIAL');
       EXCEPTION
         WHEN duplicate_object THEN null;
       END $$;`,
       
      `DO $$ BEGIN
         CREATE TYPE "Language" AS ENUM ('EN', 'NB', 'NO');
       EXCEPTION
         WHEN duplicate_object THEN null;
       END $$;`,
       
      `DO $$ BEGIN
         CREATE TYPE "PrivacyLevel" AS ENUM ('PUBLIC', 'FRIENDS', 'PRIVATE');
       EXCEPTION
         WHEN duplicate_object THEN null;
       END $$;`
    ];

    for (const query of enumQueries) {
      await prisma.$executeRawUnsafe(query);
    }

    // Convert varchar columns to use enums
    logger.info('Converting columns to use enums...');
    const enumConversionQueries = [
      `ALTER TABLE users ALTER COLUMN "role" TYPE "Role" USING "role"::"Role"`,
      `ALTER TABLE users ALTER COLUMN "units" TYPE "Units" USING "units"::"Units"`,
      `ALTER TABLE users ALTER COLUMN "language" TYPE "Language" USING "language"::"Language"`,
      `ALTER TABLE users ALTER COLUMN "privacyLevel" TYPE "PrivacyLevel" USING "privacyLevel"::"PrivacyLevel"`
    ];

    for (const query of enumConversionQueries) {
      try {
        await prisma.$executeRawUnsafe(query);
        logger.info(`Executed: ${query}`);
      } catch (error) {
        logger.info(`Skipped (likely already converted): ${query}`);
      }
    }

    logger.info('Migration completed successfully!');
    logger.info('');
    logger.info('IMPORTANT NOTES:');
    logger.info('================');
    logger.info('1. Existing users have been given a temporary password: "ChangeMe123!@#"');
    logger.info('2. Users should reset their passwords on next login');
    logger.info('3. The display_name field is preserved alongside the new name field');
    logger.info('4. All user preferences have been set to default values');
    logger.info('');

  } catch (error) {
    logger.error('Error during migration:', undefined, error as Error);
    throw error;
  }
}

// Execute the migration
if (require.main === module) {
  migrateUserSchema()
    .catch((e) => {
      console.error('Migration failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { migrateUserSchema };