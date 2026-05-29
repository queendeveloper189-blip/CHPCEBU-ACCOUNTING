const pool = require('../config/database-pg');

async function createNotificationsTable() {
  try {
    console.log('Creating notifications table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        trainee_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('payment_rejected', 'payment_approved', 'soa_available', 'request_update', 'system') DEFAULT 'system',
        status ENUM('unread', 'read') DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trainee_id) REFERENCES trainees(id) ON DELETE CASCADE,
        INDEX idx_trainee_id (trainee_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await pool.query(createTableQuery);
    console.log('✓ Notifications table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating notifications table:', error);
    process.exit(1);
  }
}

createNotificationsTable();
