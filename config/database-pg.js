const { Pool } = require('pg');
require('dotenv').config();

// Parse database URL or use individual environment variables
let pgConfig = {};

if (process.env.DATABASE_URL) {
  // Use Render's DATABASE_URL (format: postgresql://user:password@host:port/database)
  pgConfig = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
  console.log('✓ Using DATABASE_URL (Render format)');
} else {
  // Use individual environment variables
  pgConfig = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trainees_accounting_system',
    ssl: { rejectUnauthorized: false },
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
  console.log('✓ Using individual database environment variables');
}

console.log('PostgreSQL Configuration:');
if (process.env.DATABASE_URL) {
  console.log(`  Connection String: ${process.env.DATABASE_URL.substring(0, 30)}...`);
} else {
  console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`  Port: ${process.env.DB_PORT || 5432}`);
  console.log(`  User: ${process.env.DB_USER || 'admin'}`);
  console.log(`  Database: ${process.env.DB_NAME || 'trainees_accounting_system'}`);
  console.log(`  Password provided: ${!!process.env.DB_PASSWORD}`);
}

const pool = pgConfig;

// Test connection with retry logic
let retries = 0;
const maxRetries = 60;

function testConnection() {
  pool.query('SELECT NOW()')
    .then(result => {
      console.log('✓ PostgreSQL connection successful');
    })
    .catch((err) => {
      retries++;
      const waitTime = Math.min(5000 + (retries * 500), 10000);
      
      console.error(`✗ PostgreSQL connection failed (attempt ${retries}/${maxRetries}):`);
      console.error(`  Error: ${err.message || err.code || 'Unknown error'}`);
      console.error(`  Code: ${err.code}`);
      console.error(`  Waiting ${waitTime}ms before retry...`);
      
      if (retries < maxRetries) {
        setTimeout(testConnection, waitTime);
      } else {
        console.error('✗ Failed to connect to database after maximum retries');
        setTimeout(testConnection, 15000);
      }
    });
}

// Start testing connection
testConnection();

// Handle errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
