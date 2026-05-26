const pool = require('../config/database');

async function run() {
  try {
    const sql = `
CREATE TABLE IF NOT EXISTS online_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trainee_id INT NOT NULL,
  name_of_sender VARCHAR(200) NOT NULL,
  reference_number VARCHAR(100),
  details TEXT,
  amount_sent DECIMAL(10,2) NOT NULL DEFAULT 0,
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  status ENUM('verifying', 'approved', 'rejected') DEFAULT 'verifying',
  admin_id INT DEFAULT NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (trainee_id) REFERENCES trainees(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  INDEX idx_trainee_id (trainee_id),
  INDEX idx_status (status),
  INDEX idx_reference (reference_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.query(sql);
    console.log('online_payments table created (or already exists).');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create table:', err);
    process.exit(1);
  }
}

run();
