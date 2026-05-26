const pool = require('../config/database');

async function createAnnouncementsTable() {
  try {
    console.log('Creating announcements table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS announcements (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_by INT NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        target_audience ENUM('all', 'specific_course', 'specific_schedule') DEFAULT 'all',
        target_course VARCHAR(100),
        target_schedule VARCHAR(50),
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES admin_users(id),
        INDEX idx_active (is_active),
        INDEX idx_created_at (created_at),
        INDEX idx_priority (priority)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await pool.query(createTableQuery);
    console.log('✓ Announcements table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating announcements table:', error);
    process.exit(1);
  }
}

createAnnouncementsTable();
