-- Trainees Accounting & Registrar System Database Schema
-- Version 1.0.0
-- Created: 2026

CREATE DATABASE IF NOT EXISTS trainees_accounting_system;
USE trainees_accounting_system;

-- ============================================
-- 1. ADMIN USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('super_admin', 'admin', 'staff') DEFAULT 'admin',
  status ENUM('active', 'inactive') DEFAULT 'active',
  last_login DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. TRAINEES/STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS trainees (
  id INT PRIMARY KEY AUTO_INCREMENT,
  system_id VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  contact_number VARCHAR(15) NOT NULL,
  email VARCHAR(100),
  password_hash VARCHAR(255) DEFAULT NULL,
  course ENUM(
    'Healthcare Services NCII',
    'Caregiving NCII',
    'Other'
  ) NOT NULL,
  schedule ENUM('DAY', 'NIGHT', 'WEEKEND') NOT NULL,
  date_started DATE NOT NULL,
  status ENUM('active', 'inactive', 'graduated', 'dropped') DEFAULT 'active',
  address TEXT,
  emergency_contact VARCHAR(15),
  emergency_contact_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_system_id (system_id),
  INDEX idx_status (status),
  INDEX idx_course (course),
  INDEX idx_schedule (schedule),
  FULLTEXT INDEX ft_name (first_name, last_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. FORGOT PASSWORD REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS forgot_password_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_number VARCHAR(30) UNIQUE NOT NULL,
  user_type ENUM('admin', 'trainee') NOT NULL DEFAULT 'trainee',
  identifier VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  message TEXT,
  id_file_name VARCHAR(255),
  id_file_path VARCHAR(500),
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  response_message TEXT,
  responded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (responded_by) REFERENCES admin_users(id),
  INDEX idx_trainee_id (identifier),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. SOA TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS soa_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course VARCHAR(100) NOT NULL,
  template_name VARCHAR(150) NOT NULL,
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admin_users(id),
  INDEX idx_course (course),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. SOA TEMPLATE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS soa_template_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  item_type ENUM('fee', 'miscellaneous', 'deduction', 'total') NOT NULL,
  order_position INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES soa_templates(id) ON DELETE CASCADE,
  INDEX idx_template_id (template_id),
  INDEX idx_order (order_position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. STATEMENTS OF ACCOUNT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS statements_of_account (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trainee_id INT NOT NULL,
  template_id INT NOT NULL,
  soa_number VARCHAR(20) UNIQUE NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE,
  status ENUM('draft', 'issued', 'paid', 'partial', 'overdue') DEFAULT 'draft',
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  amount_remaining DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (trainee_id) REFERENCES trainees(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES soa_templates(id),
  FOREIGN KEY (created_by) REFERENCES admin_users(id),
  INDEX idx_trainee_id (trainee_id),
  INDEX idx_status (status),
  INDEX idx_soa_number (soa_number),
  INDEX idx_issue_date (issue_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. SOA LINE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS soa_line_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  soa_id INT NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  item_type ENUM('fee', 'miscellaneous', 'deduction', 'total') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  order_position INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (soa_id) REFERENCES statements_of_account(id) ON DELETE CASCADE,
  INDEX idx_soa_id (soa_id),
  INDEX idx_order (order_position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_number VARCHAR(20) UNIQUE NOT NULL,
  trainee_id INT NOT NULL,
  request_type ENUM('document', 'paper', 'soa', 'other') NOT NULL,
  request_details TEXT NOT NULL,
  status ENUM('pending', 'in_review', 'ready', 'released', 'cancelled') DEFAULT 'pending',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  assigned_to INT,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (trainee_id) REFERENCES trainees(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES admin_users(id),
  INDEX idx_trainee_id (trainee_id),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_request_number (request_number),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. REQUEST ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS request_attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  uploaded_by INT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES admin_users(id),
  INDEX idx_request_id (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. REQUEST COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS request_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_id INT NOT NULL,
  comment_by INT NOT NULL,
  comment_text TEXT NOT NULL,
  is_visible_to_trainee TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_by) REFERENCES admin_users(id),
  INDEX idx_request_id (request_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trainee_id INT NOT NULL,
  soa_id INT,
  transaction_type ENUM('payment', 'adjustment', 'refund', 'fee') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  reference_number VARCHAR(50),
  payment_method ENUM('cash', 'check', 'online', 'bank_transfer') DEFAULT 'cash',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trainee_id) REFERENCES trainees(id) ON DELETE CASCADE,
  FOREIGN KEY (soa_id) REFERENCES statements_of_account(id),
  FOREIGN KEY (created_by) REFERENCES admin_users(id),
  INDEX idx_trainee_id (trainee_id),
  INDEX idx_soa_id (soa_id),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 11. ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  user_type ENUM('admin', 'trainee') NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_user_type (user_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 12. AUDIT TRAIL TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_trails (
  id INT PRIMARY KEY AUTO_INCREMENT,
  table_name VARCHAR(50) NOT NULL,
  record_id INT NOT NULL,
  action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  old_values JSON,
  new_values JSON,
  changed_by INT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (changed_by) REFERENCES admin_users(id),
  INDEX idx_table_name (table_name),
  INDEX idx_record_id (record_id),
  INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 13. ANNOUNCEMENTS TABLE
-- ============================================
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

-- ============================================
-- INSERT DEFAULT ADMIN USER
-- ============================================
-- Password: admin123 (bcrypt hash)
INSERT INTO admin_users (username, email, password_hash, full_name, role, status) 
VALUES (
  'admin',
  'admin@chpcebu.edu.ph',
  '$2a$10$VEJJZEZ9XXifF.tD9dGuOe63cAy2WdR5UYLpxAoG9uQxPEcMrf.m6',
  'System Administrator',
  'super_admin',
  'active'
) ON DUPLICATE KEY UPDATE username=username;

-- ============================================
-- CREATE VIEWS FOR QUICK REPORTING
-- ============================================

-- View: Trainee Account Summary
CREATE OR REPLACE VIEW trainee_account_summary AS
SELECT 
  t.id,
  t.system_id,
  CONCAT(t.first_name, ' ', t.last_name) as trainee_name,
  t.course,
  t.schedule,
  t.status,
  COUNT(DISTINCT soa.id) as soa_count,
  COALESCE(SUM(soa.total_amount), 0) as total_billings,
  COALESCE(SUM(soa.amount_paid), 0) as total_paid,
  COALESCE(SUM(soa.amount_remaining), 0) as total_balance,
  COUNT(DISTINCT r.id) as pending_requests
FROM trainees t
LEFT JOIN statements_of_account soa ON t.id = soa.trainee_id
LEFT JOIN requests r ON t.id = r.trainee_id AND r.status NOT IN ('released', 'cancelled')
GROUP BY t.id, t.system_id, t.first_name, t.last_name, t.course, t.schedule, t.status;

-- View: Outstanding Payments
CREATE OR REPLACE VIEW outstanding_payments AS
SELECT 
  t.system_id,
  CONCAT(t.first_name, ' ', t.last_name) as trainee_name,
  soa.soa_number,
  soa.issue_date,
  soa.due_date,
  soa.total_amount,
  soa.amount_paid,
  soa.amount_remaining,
  DATEDIFF(CURDATE(), soa.due_date) as days_overdue,
  soa.status
FROM trainees t
JOIN statements_of_account soa ON t.id = soa.trainee_id
WHERE soa.amount_remaining > 0
ORDER BY soa.due_date ASC;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_soa_status_trainee ON statements_of_account(status, trainee_id);
CREATE INDEX idx_requests_status_trainee ON requests(status, trainee_id);
CREATE INDEX idx_transactions_trainee_date ON transactions(trainee_id, created_at);

-- ============================================
-- SAMPLE DATA (OPTIONAL)
-- ============================================

-- Insert sample courses in SOA templates
INSERT INTO soa_templates (course, template_name, description, is_active) VALUES
('Caregiving NCII', 'Caregiving NCII Standard', 'Standard SOA template for Caregiving NCII course', 1),
('Healthcare Services NCII', 'Healthcare Services NCII Standard', 'Standard SOA template for Healthcare Services NCII course', 1);

-- Insert sample template items for Caregiving NCII
SET @template_id = LAST_INSERT_ID();
INSERT INTO soa_template_items (template_id, item_name, item_type, order_position) VALUES
(@template_id, 'Registration Fee', 'fee', 1),
(@template_id, 'Tuition Fee', 'fee', 2),
(@template_id, 'ID', 'miscellaneous', 3),
(@template_id, '2 Sets Scrub Suit', 'miscellaneous', 4),
(@template_id, '2 Sets Polo Shirt', 'miscellaneous', 5),
(@template_id, 'Basic Life Support (BLS)', 'miscellaneous', 6),
(@template_id, 'OJT Fee', 'miscellaneous', 7),
(@template_id, 'Graduation Fee', 'miscellaneous', 8),
(@template_id, 'TOR & Certificate Training', 'miscellaneous', 9),
(@template_id, 'OVERALL TOTAL', 'total', 10);

-- Insert sample trainees
INSERT INTO trainees (system_id, first_name, last_name, contact_number, email, course, schedule, date_started, status) VALUES
('2024-001', 'Maria', 'Santos', '09171234567', 'maria.santos@email.com', 'Caregiving NCII', 'DAY', '2024-01-15', 'active'),
('2024-002', 'Juan', 'dela Cruz', '09175555555', 'juan.delacruz@email.com', 'Healthcare Services NCII', 'NIGHT', '2024-02-01', 'active'),
('2024-003', 'Rosa', 'Garcia', '09179999999', 'rosa.garcia@email.com', 'Caregiving NCII', 'WEEKEND', '2024-01-20', 'active');

COMMIT;

-- ============================================
-- 13. ONLINE PAYMENTS (CHPay) TABLE
-- ============================================
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

-- ============================================
-- 14. NOTIFICATIONS TABLE
-- ============================================
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
