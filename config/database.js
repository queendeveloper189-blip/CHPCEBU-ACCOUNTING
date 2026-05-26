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
  queueLimit: 0
});

// Test connection
pool.getConnection()
  .then(() => {
    console.log('✓ Database connection successful');
  })
  .catch((err) => {
    console.error('✗ Database connection failed:', err.message);
    process.exit(1);
  });

module.exports = pool;
