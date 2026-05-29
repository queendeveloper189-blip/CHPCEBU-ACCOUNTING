const pool = require('../config/database-pg');

async function migrate() {
  try {
    console.log('Running migration: Add id_file_name and id_file_path to forgot_password_requests...');
    
    // Check if columns already exist
    const connection = await pool.getConnection();
    
    try {
      // Try to add id_file_name column
      await connection.query(
        'ALTER TABLE forgot_password_requests ADD COLUMN id_file_name VARCHAR(255) AFTER message'
      );
      console.log('✓ Added id_file_name column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ id_file_name column already exists');
      } else {
        throw err;
      }
    }

    try {
      // Try to add id_file_path column
      await connection.query(
        'ALTER TABLE forgot_password_requests ADD COLUMN id_file_path VARCHAR(500) AFTER id_file_name'
      );
      console.log('✓ Added id_file_path column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ id_file_path column already exists');
      } else {
        throw err;
      }
    }

    connection.release();
    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
