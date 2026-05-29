const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('Database Configuration:');
console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
console.log(`  Port: ${process.env.DB_PORT || 3306}`);
console.log(`  User: ${process.env.DB_USER || 'root'}`);
console.log(`  Database: ${process.env.DB_NAME || 'trainees_accounting_system'}`);
console.log(`  Password provided: ${!!process.env.DB_PASSWORD}`);

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'trainees_accounting_system',
  port: process.env.DB_PORT || 3306,
  connectionLimit: 10,
  enableKeepAlive: true,
  waitForConnections: true,
  queueLimit: 0,
  enableTimeouts: true,
  connectionTimeout: 60000, // 60 seconds timeout
  authPlugins: {
    mysql_native_password: () => () => process.env.DB_PASSWORD || ''
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
      console.error(`  Errno: ${err.errno}`);
      console.error(`  SQL State: ${err.sqlState}`);
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
