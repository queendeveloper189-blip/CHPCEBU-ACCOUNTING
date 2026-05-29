const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Initialize database and create all required tables
 */
async function initializeDatabase() {
  let connection = null;
  try {
    console.log('🔄 Initializing database...');
    
    // Connect without selecting database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      connectionTimeout: 10000
    });

    console.log('✓ Connected to MySQL server');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'trainees_accounting_system';
    try {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      console.log(`✓ Database \`${dbName}\` ready`);
    } catch (dbErr) {
      console.error('Error creating database:', dbErr.message);
      throw dbErr;
    }

    // Select the database
    try {
      await connection.query(`USE \`${dbName}\``);
    } catch (useErr) {
      console.error('Error selecting database:', useErr.message);
      throw useErr;
    }

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
      for (const statement of statements) {
        try {
          await connection.query(statement);
          executed++;
        } catch (err) {
          // Skip duplicate table/database errors
          if (err.message.includes('already exists')) {
            executed++;
          } else if (err.message.includes('Syntax error')) {
            console.warn(`⚠ Syntax error in statement: ${statement.substring(0, 50)}...`);
          } else {
            console.error('Error executing statement:', statement.substring(0, 50), err.message);
          }
        }
      }
      console.log(`✓ Database schema initialized (${executed}/${statements.length} statements)`);
    } else {
      console.warn(`⚠ Schema file not found at ${schemaPath}`);
    }

    await connection.end();
    console.log('✓ Database initialization complete\n');
    return true;
  } catch (error) {
    console.error('✗ Database initialization failed:', error.message);
    if (connection) {
      try {
        await connection.end();
      } catch (e) {}
    }
    return false;
  }
}

module.exports = initializeDatabase;
