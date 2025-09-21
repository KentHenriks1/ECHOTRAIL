import knex, { Knex } from "knex";
import { logger } from "../utils/logger";

// Database configuration for different environments
const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: {
      connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 2,
      max: 10,
      createTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: false,
    },
    debug: false,
  },

  production: {
    client: "pg",
    connection: {
      connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 2,
      max: 20,
      createTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: false,
    },
    debug: false,
  },

  test: {
    client: "pg",
    connection: {
      connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 1,
      max: 5,
    },
    debug: false,
  },
};

// Get environment
const environment = process.env.NODE_ENV || "development";
const dbConfig = config[environment];

// Create database instance
export const db = knex(dbConfig);

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await db.raw("SELECT 1");
    logger.info("Database connection successful");
    return true;
  } catch (error) {
    logger.error("Database connection failed:", error);
    return false;
  }
}

/**
 * Initialize database with tables
 */
export async function initializeDatabase(): Promise<void> {
  try {
    logger.info("Initializing database...");

    // Create users table
    if (!(await db.schema.hasTable("users"))) {
      await db.schema.createTable("users", (table) => {
        table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
        table.string("email").unique().notNullable();
        table.string("name").notNullable();
        table.string("password_hash").notNullable();
        table.jsonb("preferences").defaultTo("{}");
        table.enum("role", ["USER", "PREMIUM", "ADMIN"]).defaultTo("USER");
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());
        table.timestamp("last_login_at");

        // Indexes
        table.index(["email"]);
        table.index(["created_at"]);
      });
      logger.info("Created users table");
    }

    // Create trails table
    if (!(await db.schema.hasTable("trails"))) {
      await db.schema.createTable("trails", (table) => {
        table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
        table.string("name").notNullable();
        table.text("description");
        table
          .uuid("user_id")
          .references("id")
          .inTable("users")
          .onDelete("CASCADE");
        table.boolean("is_public").defaultTo(false);
        table.jsonb("metadata").defaultTo("{}");
        table.decimal("distance", 10, 2).defaultTo(0);
        table.integer("duration").defaultTo(0); // seconds
        table
          .jsonb("elevation")
          .defaultTo('{"gain": 0, "loss": 0, "max": 0, "min": 0}');
        table.specificType("tags", "text[]").defaultTo("{}");
        table
          .enum("sync_status", ["PENDING", "SYNCED", "FAILED"])
          .defaultTo("PENDING");
        table.boolean("local_only").defaultTo(false);
        table.integer("version").defaultTo(1);
        table.timestamp("start_time");
        table.timestamp("end_time");
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("updated_at").defaultTo(db.fn.now());

        // Indexes
        table.index(["user_id"]);
        table.index(["is_public"]);
        table.index(["created_at"]);
        table.index(["sync_status"]);
      });
      logger.info("Created trails table");
    } else {
      // Migrate existing table if needed
      logger.info("Checking trails table for missing columns...");

      // Check and add missing columns
      if (!(await db.schema.hasColumn("trails", "distance"))) {
        await db.schema.alterTable("trails", (table) => {
          table.decimal("distance", 10, 2).defaultTo(0);
        });
        logger.info("Added distance column to trails table");
      }

      if (!(await db.schema.hasColumn("trails", "duration"))) {
        await db.schema.alterTable("trails", (table) => {
          table.integer("duration").defaultTo(0);
        });
        logger.info("Added duration column to trails table");
      }

      if (!(await db.schema.hasColumn("trails", "elevation"))) {
        await db.schema.alterTable("trails", (table) => {
          table
            .jsonb("elevation")
            .defaultTo('{"gain": 0, "loss": 0, "max": 0, "min": 0}');
        });
        logger.info("Added elevation column to trails table");
      }

      if (!(await db.schema.hasColumn("trails", "tags"))) {
        await db.schema.alterTable("trails", (table) => {
          table.specificType("tags", "text[]").defaultTo("{}");
        });
        logger.info("Added tags column to trails table");
      }

      if (!(await db.schema.hasColumn("trails", "sync_status"))) {
        await db.schema.alterTable("trails", (table) => {
          table
            .enum("sync_status", ["PENDING", "SYNCED", "FAILED"])
            .defaultTo("PENDING");
        });
        logger.info("Added sync_status column to trails table");
      }

      if (!(await db.schema.hasColumn("trails", "local_only"))) {
        await db.schema.alterTable("trails", (table) => {
          table.boolean("local_only").defaultTo(false);
        });
        logger.info("Added local_only column to trails table");
      }

      if (!(await db.schema.hasColumn("trails", "version"))) {
        await db.schema.alterTable("trails", (table) => {
          table.integer("version").defaultTo(1);
        });
        logger.info("Added version column to trails table");
      }

      if (!(await db.schema.hasColumn("trails", "start_time"))) {
        await db.schema.alterTable("trails", (table) => {
          table.timestamp("start_time");
        });
        logger.info("Added start_time column to trails table");
      }

      if (!(await db.schema.hasColumn("trails", "end_time"))) {
        await db.schema.alterTable("trails", (table) => {
          table.timestamp("end_time");
        });
        logger.info("Added end_time column to trails table");
      }
    }

    // Create track_points table
    if (!(await db.schema.hasTable("track_points"))) {
      await db.schema.createTable("track_points", (table) => {
        table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
        table
          .uuid("trail_id")
          .references("id")
          .inTable("trails")
          .onDelete("CASCADE");
        table.decimal("latitude", 10, 7).notNullable();
        table.decimal("longitude", 10, 7).notNullable();
        table.decimal("elevation", 8, 2);
        table.timestamp("timestamp").notNullable();
        table.decimal("accuracy", 6, 2);
        table.decimal("speed", 6, 2);
        table.decimal("heading", 6, 2);
        table.jsonb("additional_data").defaultTo("{}");

        // Indexes
        table.index(["trail_id"]);
        table.index(["timestamp"]);
        table.index(["latitude", "longitude"]);
      });
      logger.info("Created track_points table");
    }

    // Create share_links table
    if (!(await db.schema.hasTable("share_links"))) {
      await db.schema.createTable("share_links", (table) => {
        table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
        table
          .uuid("trail_id")
          .references("id")
          .inTable("trails")
          .onDelete("CASCADE");
        table.string("token").unique().notNullable();
        table.string("share_url").notNullable();
        table.boolean("is_active").defaultTo(true);
        table.timestamp("expires_at");
        table.timestamp("created_at").defaultTo(db.fn.now());

        // Indexes
        table.index(["token"]);
        table.index(["trail_id"]);
        table.index(["is_active"]);
      });
      logger.info("Created share_links table");
    }

    // Create user_sessions table
    if (!(await db.schema.hasTable("user_sessions"))) {
      await db.schema.createTable("user_sessions", (table) => {
        table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
        table
          .uuid("user_id")
          .references("id")
          .inTable("users")
          .onDelete("CASCADE");
        table.string("token").unique().notNullable();
        table.timestamp("expires_at").notNullable();
        table.timestamp("created_at").defaultTo(db.fn.now());
        table.timestamp("last_used_at").defaultTo(db.fn.now());

        // Indexes
        table.index(["token"]);
        table.index(["user_id"]);
        table.index(["expires_at"]);
      });
      logger.info("Created user_sessions table");
    }

    logger.info("Database initialization complete");
  } catch (error) {
    logger.error("Database initialization failed:", error);
    throw error;
  }
}

/**
 * Clean up database connection
 */
export async function closeConnection(): Promise<void> {
  try {
    await db.destroy();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error("Error closing database connection:", error);
  }
}
