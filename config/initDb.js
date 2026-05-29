const { Pool } = require('pg');
require('dotenv').config();

/**
 * Initialize database and create all required tables
 * This is non-blocking - failures don't prevent the server from running
 */
async function initializeDatabase() {
  let client = null;
  try {
    console.log('🔄 Initializing database...');
    
    // Use the existing pool or create a new client
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.warn('⚠ DATABASE_URL not set, skipping schema initialization');
      return false;
    }

    // Try to connect with timeout
    const pool = new Pool({
      connectionString: connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      statement_timeout: 30000
    });

    client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 35000)
      )
    ]);

    console.log('✓ Connected to PostgreSQL server');

    // Read and execute schema
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Split and execute each statement
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      console.log(`Found ${statements.length} SQL statements to execute`);

      let executed = 0;
      let skipped = 0;
      
      for (const statement of statements) {
        try {
          await client.query(statement);
          executed++;
        } catch (err) {
          // Skip duplicate table/database errors
          if (err.message.includes('already exists') || err.code === '42P07' || err.code === '42701') {
            skipped++;
          } else if (err.message.includes('Syntax error')) {
            console.warn(`⚠ Syntax error in statement: ${statement.substring(0, 50)}...`);
          } else {
            // Log but continue
            console.warn(`⚠ Statement error: ${err.message.substring(0, 100)}`);
          }
        }
      }
      console.log(`✓ Database schema initialized (${executed} new, ${skipped} existing)\n`);
    } else {
      console.warn(`⚠ Schema file not found at ${schemaPath}`);
    }

    client.release();
    await pool.end();
    console.log('✓ Database initialization complete\n');
    return true;
  } catch (error) {
    console.warn('⚠ Database initialization skipped (will retry on connection):', error.message);
    if (client) {
      try {
        client.release();
      } catch (e) {}
    }
    return false;
  }
}

module.exports = initializeDatabase;
