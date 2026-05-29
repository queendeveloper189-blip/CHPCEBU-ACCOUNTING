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
  connectionTimeout: 10000,
  authPlugins: {
    mysql_native_password: () => () => process.env.DB_PASSWORD || ''
  }
});

// Test connection with retry logic
let retries = 0;
const maxRetries = 10;

function testConnection() {
  pool.getConnection()
    .then(connection => {
      console.log('✓ Database connection successful');
      connection.release();
    })
    .catch((err) => {
      retries++;
      console.error(`✗ Database connection failed (attempt ${retries}/${maxRetries}):`);
      console.error(`  Error: ${err.message || err.code || 'Unknown error'}`);
      console.error(`  Code: ${err.code}`);
      console.error(`  Errno: ${err.errno}`);
      console.error(`  SQL State: ${err.sqlState}`);
      
      // Retry after 3 seconds
      if (retries < maxRetries) {
        console.log(`Retrying in 3 seconds...`);
        setTimeout(testConnection, 3000);
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
