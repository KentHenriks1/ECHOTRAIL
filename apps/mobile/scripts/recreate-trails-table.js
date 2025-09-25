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

async function recreateTrailsTable() {
  try {
    console.log('🔄 Recreating trails table with proper schema...');
    
    // First, drop the existing table (this will also drop dependent objects)
    console.log('⚠️  Dropping existing trails table...');
    await db.raw('DROP TABLE IF EXISTS track_points CASCADE');
    await db.raw('DROP TABLE IF EXISTS share_links CASCADE');
    await db.raw('DROP TABLE IF EXISTS pois CASCADE'); // In case POIs table exists
    await db.raw('DROP TABLE IF EXISTS trails CASCADE');
    
    // Create trails table with proper schema
    await db.schema.createTable('trails', (table) => {
      table.string('id').primary(); // Changed to string to support test IDs
      table.string('name').notNullable();
      table.text('description');
      table.string('user_id').notNullable().defaultTo('local-user'); // Changed to string for local-user
      table.boolean('is_public').defaultTo(false);
      table.jsonb('metadata').defaultTo('{}');
      table.decimal('distance', 10, 2).defaultTo(0);
      table.integer('duration').defaultTo(0); // seconds
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
    
    // Recreate track_points table
    await db.schema.createTable('track_points', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      table.string('trail_id').references('id').inTable('trails').onDelete('CASCADE');
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
    
    // Recreate share_links table
    await db.schema.createTable('share_links', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      table.string('trail_id').references('id').inTable('trails').onDelete('CASCADE');
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
    
    console.log('🎉 Database recreation complete!');
    
  } catch (error) {
    console.error('💥 Database recreation failed:', error.message);
    throw error;
  }
}

(async () => {
  console.log('🔌 Testing Neon Database Connection...');
  
  try {
    await db.raw('SELECT 1');
    console.log('✅ Database connection successful!');
    
    await recreateTrailsTable();
    console.log('🏆 BULLETPROOF DATABASE READY!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
  
  await db.destroy();
  process.exit(0);
})().catch((error) => {
  console.error('💥 Error:', error);
  process.exit(1);
});