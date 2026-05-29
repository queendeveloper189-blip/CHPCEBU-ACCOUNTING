const mysql = require('mysql2/promise');
require('dotenv').config();

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
  connectionTimeout: 10000
});

// Test connection with retry logic
let retries = 0;
const maxRetries = 5;

function testConnection() {
  pool.getConnection()
    .then(connection => {
      console.log('✓ Database connection successful');
      connection.release();
    })
    .catch((err) => {
      retries++;
      console.error(`✗ Database connection failed (attempt ${retries}/${maxRetries}):`, err.message);
      
      // Retry after 5 seconds
      if (retries < maxRetries) {
        console.log(`Retrying in 5 seconds...`);
        setTimeout(testConnection, 5000);
      } else {
        console.error('✗ Failed to connect to database after maximum retries');
        // Don't exit - allow server to run and retry in background
        setTimeout(testConnection, 30000);
      }
    });
}

// Start testing connection
testConnection();

module.exports = pool;
