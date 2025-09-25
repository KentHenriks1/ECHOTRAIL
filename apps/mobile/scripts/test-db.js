const knex = require('knex');

const dbConfig = {
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL || '[REDACTED]',
    ssl: { rejectUnauthorized: false }
  },
  pool: {
    min: 1,
    max: 5
  }
};

const db = knex(dbConfig);

async function testConnection() {
  try {
    await db.raw('SELECT 1');
    console.log('✅ Database connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database tables...');
    
    // Create users table
    if (!(await db.schema.hasTable('users'))) {
      await db.schema.createTable('users', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.string('email').unique().notNullable();
        table.string('name').notNullable();
        table.string('password_hash').notNullable();
        table.jsonb('preferences').defaultTo('{}');
        table.enum('role', ['USER', 'PREMIUM', 'ADMIN']).defaultTo('USER');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        table.timestamp('last_login_at');
        
        // Indexes
        table.index(['email']);
        table.index(['created_at']);
      });
      console.log('✅ Created users table');
    } else {
      console.log('ℹ️  Users table already exists');
    }
    
    // Create trails table
    if (!(await db.schema.hasTable('trails'))) {
      await db.schema.createTable('trails', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.string('name').notNullable();
        table.text('description');
        table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.boolean('is_public').defaultTo(false);
        table.jsonb('metadata').defaultTo('{}');
        table.decimal('distance', 10, 2).defaultTo(0);
        table.integer('duration').defaultTo(0);
        table.jsonb('elevation').defaultTo('{"gain": 0, "loss": 0, "max": 0, "min": 0}');
        table.specificType('tags', 'text[]').defaultTo('{}');
        table.enum('sync_status', ['PENDING', 'SYNCED', 'FAILED']).defaultTo('PENDING');
        table.boolean('local_only').defaultTo(false);
        table.integer('version').defaultTo(1);
        table.timestamp('start_time');
        table.timestamp('end_time');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
        
        // Indexes
        table.index(['user_id']);
        table.index(['is_public']);
        table.index(['created_at']);
        table.index(['sync_status']);
      });
      console.log('✅ Created trails table');
    } else {
      console.log('ℹ️  Trails table already exists');
      console.log('🔧 Checking for missing columns...');
      
      // Check and add missing columns
      if (!(await db.schema.hasColumn('trails', 'is_public'))) {
        await db.schema.alterTable('trails', (table) => {
          table.boolean('is_public').defaultTo(false);
        });
        console.log('✅ Added is_public column to trails table');
      }
      
      if (!(await db.schema.hasColumn('trails', 'metadata'))) {
        await db.schema.alterTable('trails', (table) => {
          table.jsonb('metadata').defaultTo('{}');
        });
        console.log('✅ Added metadata column to trails table');
      }
      
      if (!(await db.schema.hasColumn('trails', 'distance'))) {
        await db.schema.alterTable('trails', (table) => {
          table.decimal('distance', 10, 2).defaultTo(0);
        });
        console.log('✅ Added distance column to trails table');
      }
      
      if (!(await db.schema.hasColumn('trails', 'duration'))) {
        await db.schema.alterTable('trails', (table) => {
          table.integer('duration').defaultTo(0);
        });
        console.log('✅ Added duration column to trails table');
      }
      
      if (!(await db.schema.hasColumn('trails', 'elevation'))) {
        await db.schema.alterTable('trails', (table) => {
          table.jsonb('elevation').defaultTo('{"gain": 0, "loss": 0, "max": 0, "min": 0}');
        });
        console.log('✅ Added elevation column to trails table');
      }
      
      if (!(await db.schema.hasColumn('trails', 'tags'))) {
        await db.schema.alterTable('trails', (table) => {
          table.specificType('tags', 'text[]').defaultTo('{}');
        });
        console.log('✅ Added tags column to trails table');
      }
      
      if (!(await db.schema.hasColumn('trails', 'sync_status'))) {
        await db.schema.alterTable('trails', (table) => {
          table.enum('sync_status', ['PENDING', 'SYNCED', 'FAILED']).defaultTo('PENDING');
        });
        console.log('✅ Added sync_status column to trails table');
      }
      
      if (!(await db.schema.hasColumn('trails', 'local_only'))) {
        await db.schema.alterTable('trails', (table) => {
          table.boolean('local_only').defaultTo(false);
        });
        console.log('✅ Added local_only column to trails table');
      }
      
      if (!(await db.schema.hasColumn('trails', 'version'))) {
        await db.schema.alterTable('trails', (table) => {
          table.integer('version').defaultTo(1);
        });
        console.log('✅ Added version column to trails table');
      }
      
      if (!(await db.schema.hasColumn('trails', 'start_time'))) {
        await db.schema.alterTable('trails', (table) => {
          table.timestamp('start_time');
        });
        console.log('✅ Added start_time column to trails table');
      }
      
      if (!(await db.schema.hasColumn('trails', 'end_time'))) {
        await db.schema.alterTable('trails', (table) => {
          table.timestamp('end_time');
        });
        console.log('✅ Added end_time column to trails table');
      }
    }
    
    // Create track_points table
    if (!(await db.schema.hasTable('track_points'))) {
      await db.schema.createTable('track_points', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('trail_id').references('id').inTable('trails').onDelete('CASCADE');
        table.decimal('latitude', 10, 7).notNullable();
        table.decimal('longitude', 10, 7).notNullable();
        table.decimal('elevation', 8, 2);
        table.timestamp('timestamp').notNullable();
        table.decimal('accuracy', 6, 2);
        table.decimal('speed', 6, 2);
        table.decimal('heading', 6, 2);
        table.jsonb('additional_data').defaultTo('{}');
        
        // Indexes
        table.index(['trail_id']);
        table.index(['timestamp']);
        table.index(['latitude', 'longitude']);
      });
      console.log('✅ Created track_points table');
    } else {
      console.log('ℹ️  Track_points table already exists');
    }
    
    // Create share_links table
    if (!(await db.schema.hasTable('share_links'))) {
      await db.schema.createTable('share_links', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('trail_id').references('id').inTable('trails').onDelete('CASCADE');
        table.string('token').unique().notNullable();
        table.string('share_url').notNullable();
        table.boolean('is_active').defaultTo(true);
        table.timestamp('expires_at');
        table.timestamp('created_at').defaultTo(db.fn.now());
        
        // Indexes
        table.index(['token']);
        table.index(['trail_id']);
        table.index(['is_active']);
      });
      console.log('✅ Created share_links table');
    } else {
      console.log('ℹ️  Share_links table already exists');
    }
    
    // Create user_sessions table
    if (!(await db.schema.hasTable('user_sessions'))) {
      await db.schema.createTable('user_sessions', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.string('token').unique().notNullable();
        table.timestamp('expires_at').notNullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('last_used_at').defaultTo(db.fn.now());
        
        // Indexes
        table.index(['token']);
        table.index(['user_id']);
        table.index(['expires_at']);
      });
      console.log('✅ Created user_sessions table');
    } else {
      console.log('ℹ️  User_sessions table already exists');
    }
    
    console.log('🎉 Database initialization complete!');
  } catch (error) {
    console.error('💥 Database initialization failed:', error.message);
    throw error;
  }
}

(async () => {
  console.log('🔌 Testing Neon Database Connection...');
  
  const connected = await testConnection();
  if (connected) {
    await initializeDatabase();
    console.log('🏆 BULLETPROOF DATABASE READY!');
  } else {
    console.log('❌ Database setup failed!');
    process.exit(1);
  }
  
  await db.destroy();
  process.exit(0);
})().catch((error) => {
  console.error('💥 Error:', error);
  process.exit(1);
});