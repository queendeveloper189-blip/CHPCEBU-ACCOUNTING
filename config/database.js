const mysql = require('mysql2/promise');
require('dotenv').config();

// Parse DATABASE_URL if available (Render provides this)
let dbConfig = {};

if (process.env.DATABASE_URL) {
  // Parse Render's DATABASE_URL format: mysql://user:password@host:port/database
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1), // Remove leading /
    port: url.port || 3306
  };
  console.log('✓ Using DATABASE_URL from Render');
} else {
  // Fallback to individual environment variables
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trainees_accounting_system',
    port: process.env.DB_PORT || 3306
  };
  console.log('✓ Using individual DB environment variables');
}

console.log('Database Configuration:');
console.log(`  Host: ${dbConfig.host}`);
console.log(`  Port: ${dbConfig.port}`);
console.log(`  User: ${dbConfig.user}`);
console.log(`  Database: ${dbConfig.database}`);
console.log(`  Password provided: ${!!dbConfig.password}`);

const pool = mysql.createPool({
  ...dbConfig,
  connectionLimit: 10,
  enableKeepAlive: true,
  waitForConnections: true,
  queueLimit: 0,
  authPlugins: {
    mysql_native_password: () => () => dbConfig.password || ''
  }
});

// Test connection with exponential backoff
let retries = 0;
const maxRetries = 60; // Try for 5+ minutes

function testConnection() {
  pool.getConnection()
    .then(connection => {
      console.log('✓ Database connection successful');
      connection.release();
    })
    .catch((err) => {
      retries++;
      const waitTime = Math.min(5000 + (retries * 500), 10000); // Exponential backoff, max 10s
      
      console.error(`✗ Database connection failed (attempt ${retries}/${maxRetries}):`);
      console.error(`  Error: ${err.message || err.code || 'Unknown error'}`);
      console.error(`  Code: ${err.code}`);
      console.error(`  Waiting ${waitTime}ms before retry...`);
      
      // Retry with exponential backoff
      if (retries < maxRetries) {
        setTimeout(testConnection, waitTime);
      } else {
        console.error('✗ Failed to connect to database after maximum retries');
        // Don't exit - allow server to run and retry in background
        setTimeout(testConnection, 15000);
      }
    });
}

// Start testing connection
testConnection();

module.exports = pool;
