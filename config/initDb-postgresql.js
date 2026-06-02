const { Pool } = require('pg');
require('dotenv').config();
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  const maxAttempts = 30;
  let attempt = 0;

  console.log('🔄 Initializing PostgreSQL database...');

  while (attempt < maxAttempts) {
    attempt++;
    let client = null;
    let pool = null;

    try {
      console.log(`  [Attempt ${attempt}/${maxAttempts}] Connecting to database...`);

      const connectionString = process.env.DATABASE_URL;

      if (!connectionString) {
        console.warn('⚠ DATABASE_URL not set, skipping schema initialization');
        return false;
      }

      // Create pool
      pool = new Pool({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false },
        statement_timeout: 30000,
        connectionTimeoutMillis: 5000
      });

      // Get client with timeout
      client = await Promise.race([
        pool.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout (5s)')), 5000)
        )
      ]);

      // Test connection
      await client.query('SELECT NOW()');
      console.log('  ✓ Connected to PostgreSQL server');

    // Create tables with PostgreSQL syntax
    const tables = [
      // Admin Users Table
      `CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        status VARCHAR(50) DEFAULT 'active',
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create index for admin_users
      `CREATE INDEX IF NOT EXISTS idx_admin_username ON admin_users(username)`,
      `CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_admin_status ON admin_users(status)`,

      // Trainees Table
      `CREATE TABLE IF NOT EXISTS trainees (
        id SERIAL PRIMARY KEY,
        system_id VARCHAR(20) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        contact_number VARCHAR(15) NOT NULL,
        email VARCHAR(100),
        password_hash VARCHAR(255) DEFAULT NULL,
        course VARCHAR(100) NOT NULL,
        schedule VARCHAR(50) NOT NULL,
        date_started DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        address TEXT,
        emergency_contact VARCHAR(15),
        emergency_contact_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE INDEX IF NOT EXISTS idx_trainees_system_id ON trainees(system_id)`,
      `CREATE INDEX IF NOT EXISTS idx_trainees_status ON trainees(status)`,
      `CREATE INDEX IF NOT EXISTS idx_trainees_course ON trainees(course)`,
      `CREATE INDEX IF NOT EXISTS idx_trainees_schedule ON trainees(schedule)`,

      // Forgot Password Requests
      `CREATE TABLE IF NOT EXISTS forgot_password_requests (
        id SERIAL PRIMARY KEY,
        request_number VARCHAR(30) UNIQUE NOT NULL,
        user_type VARCHAR(50) NOT NULL DEFAULT 'trainee',
        identifier VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        message TEXT,
        id_file_name VARCHAR(255),
        id_file_path VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        response_message TEXT,
        responded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (responded_by) REFERENCES admin_users(id)
      )`,

      `CREATE INDEX IF NOT EXISTS idx_fpr_identifier ON forgot_password_requests(identifier)`,
      `CREATE INDEX IF NOT EXISTS idx_fpr_status ON forgot_password_requests(status)`,

      // SOA Templates
      `CREATE TABLE IF NOT EXISTS soa_templates (
        id SERIAL PRIMARY KEY,
        course VARCHAR(100) NOT NULL,
        template_name VARCHAR(150) NOT NULL,
        description TEXT,
        is_active SMALLINT DEFAULT 1,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES admin_users(id)
      )`,

      `CREATE INDEX IF NOT EXISTS idx_soa_templates_course ON soa_templates(course)`,
      `CREATE INDEX IF NOT EXISTS idx_soa_templates_active ON soa_templates(is_active)`,

      // SOA Template Items
      `CREATE TABLE IF NOT EXISTS soa_template_items (
        id SERIAL PRIMARY KEY,
        template_id INT NOT NULL,
        item_name VARCHAR(100) NOT NULL,
        item_type VARCHAR(50) NOT NULL,
        order_position INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES soa_templates(id) ON DELETE CASCADE
      )`,

      `CREATE INDEX IF NOT EXISTS idx_soa_items_template_id ON soa_template_items(template_id)`,
      `CREATE INDEX IF NOT EXISTS idx_soa_items_order ON soa_template_items(order_position)`,

      // Statements of Account
      `CREATE TABLE IF NOT EXISTS statements_of_account (
        id SERIAL PRIMARY KEY,
        trainee_id INT NOT NULL,
        template_id INT NOT NULL,
        soa_number VARCHAR(20) UNIQUE NOT NULL,
        issue_date DATE NOT NULL,
        due_date DATE,
        status VARCHAR(50) DEFAULT 'draft',
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        amount_paid DECIMAL(10, 2) DEFAULT 0,
        amount_remaining DECIMAL(10, 2) DEFAULT 0,
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trainee_id) REFERENCES trainees(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES soa_templates(id),
        FOREIGN KEY (created_by) REFERENCES admin_users(id)
      )`,

      `CREATE INDEX IF NOT EXISTS idx_soa_trainee_id ON statements_of_account(trainee_id)`,
      `CREATE INDEX IF NOT EXISTS idx_soa_status ON statements_of_account(status)`,
      `CREATE INDEX IF NOT EXISTS idx_soa_number ON statements_of_account(soa_number)`,
      `CREATE INDEX IF NOT EXISTS idx_soa_issue_date ON statements_of_account(issue_date)`,

      // SOA Line Items
      `CREATE TABLE IF NOT EXISTS soa_line_items (
        id SERIAL PRIMARY KEY,
        soa_id INT NOT NULL,
        item_name VARCHAR(100) NOT NULL,
        item_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        order_position INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (soa_id) REFERENCES statements_of_account(id) ON DELETE CASCADE
      )`,

      `CREATE INDEX IF NOT EXISTS idx_soa_line_items_soa_id ON soa_line_items(soa_id)`,
      `CREATE INDEX IF NOT EXISTS idx_soa_line_items_order ON soa_line_items(order_position)`,

      // Requests
      `CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        request_number VARCHAR(20) UNIQUE NOT NULL,
        trainee_id INT NOT NULL,
        request_type VARCHAR(50) NOT NULL,
        request_details TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(50) DEFAULT 'medium',
        assigned_to INT,
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (trainee_id) REFERENCES trainees(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES admin_users(id)
      )`,

      `CREATE INDEX IF NOT EXISTS idx_requests_trainee_id ON requests(trainee_id)`,
      `CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status)`,
      `CREATE INDEX IF NOT EXISTS idx_requests_priority ON requests(priority)`,
      `CREATE INDEX IF NOT EXISTS idx_requests_number ON requests(request_number)`,
      `CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at)`,

      // Request Attachments
      `CREATE TABLE IF NOT EXISTS request_attachments (
        id SERIAL PRIMARY KEY,
        request_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(50),
        file_size INT,
        uploaded_by INT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES admin_users(id)
      )`,

      `CREATE INDEX IF NOT EXISTS idx_request_attachments_request_id ON request_attachments(request_id)`,

      // Request Comments
      `CREATE TABLE IF NOT EXISTS request_comments (
        id SERIAL PRIMARY KEY,
        request_id INT NOT NULL,
        comment_by INT NOT NULL,
        comment_text TEXT NOT NULL,
        is_visible_to_trainee SMALLINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
        FOREIGN KEY (comment_by) REFERENCES admin_users(id)
      )`,

      `CREATE INDEX IF NOT EXISTS idx_request_comments_request_id ON request_comments(request_id)`,
      `CREATE INDEX IF NOT EXISTS idx_request_comments_created_at ON request_comments(created_at)`,

      // Transactions
      `CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        trainee_id INT NOT NULL,
        soa_id INT,
        transaction_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        reference_number VARCHAR(50),
        payment_method VARCHAR(50) DEFAULT 'cash',
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trainee_id) REFERENCES trainees(id) ON DELETE CASCADE,
        FOREIGN KEY (soa_id) REFERENCES statements_of_account(id),
        FOREIGN KEY (created_by) REFERENCES admin_users(id)
      )`,

      `CREATE INDEX IF NOT EXISTS idx_transactions_trainee_id ON transactions(trainee_id)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_soa_id ON transactions(soa_id)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)`,

      // Activity Logs
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INT,
        user_type VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        ip_address VARCHAR(45),
        user_agent VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_activity_logs_user_type ON activity_logs(user_type)`,
      `CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at)`,

      // Audit Trails
      `CREATE TABLE IF NOT EXISTS audit_trails (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL,
        record_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        old_values JSONB,
        new_values JSONB,
        changed_by INT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (changed_by) REFERENCES admin_users(id)
      )`,

      `CREATE INDEX IF NOT EXISTS idx_audit_trails_table_name ON audit_trails(table_name)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_trails_record_id ON audit_trails(record_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_trails_changed_at ON audit_trails(changed_at)`,

      // Announcements
      `CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_by INT NOT NULL,
        is_active SMALLINT DEFAULT 1,
        target_audience VARCHAR(50) DEFAULT 'all',
        target_course VARCHAR(100),
        target_schedule VARCHAR(50),
        priority VARCHAR(50) DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES admin_users(id)
      )`,

      `CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority)`,

      // Online Payments
      `CREATE TABLE IF NOT EXISTS online_payments (
        id SERIAL PRIMARY KEY,
        trainee_id INT NOT NULL,
        name_of_sender VARCHAR(200) NOT NULL,
        reference_number VARCHAR(100),
        details TEXT,
        amount_sent DECIMAL(10, 2) NOT NULL DEFAULT 0,
        file_name VARCHAR(255),
        file_path VARCHAR(500),
        status VARCHAR(50) DEFAULT 'verifying',
        admin_id INT DEFAULT NULL,
        verified_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trainee_id) REFERENCES trainees(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_online_payments_trainee_id ON online_payments(trainee_id)`,
      `CREATE INDEX IF NOT EXISTS idx_online_payments_status ON online_payments(status)`,
      `CREATE INDEX IF NOT EXISTS idx_online_payments_reference ON online_payments(reference_number)`,

      // Notifications
      `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        trainee_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'system',
        status VARCHAR(50) DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trainee_id) REFERENCES trainees(id) ON DELETE CASCADE
      )`,

      `CREATE INDEX IF NOT EXISTS idx_notifications_trainee_id ON notifications(trainee_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)`,

      // Session Table (for express-session with connect-pg-simple)
      `CREATE TABLE IF NOT EXISTS "session" (
        "sid" VARCHAR NOT NULL COLLATE "C",
        "sess" JSON NOT NULL,
        "expire" TIMESTAMP(6) NOT NULL,
        PRIMARY KEY ("sid")
      )`,

      `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")`
    ];

    console.log(`  Creating ${tables.length} tables and indexes...`);

    let created = 0;
    let skipped = 0;
    
    for (const statement of tables) {
      try {
        await client.query(statement);
        created++;
      } catch (err) {
        if (err.code === '42P07' || err.code === '42701' || err.message.includes('already exists')) {
          skipped++;
        }
      }
    }

    console.log(`  ✓ Tables ready (${created} new, ${skipped} existing)`);

    // Ensure default admin exists
    try {
      const adminCheck = await client.query('SELECT id FROM admin_users WHERE username = $1', ['admin']);
      if (adminCheck.rows.length === 0) {
        const hash = await bcrypt.hash('admin123', 10);
        await client.query(
          `INSERT INTO admin_users (username, email, password_hash, full_name, role, status) VALUES ($1, $2, $3, $4, $5, $6)`,
          ['admin', 'admin@chpcebu.edu.ph', hash, 'System Administrator', 'super_admin', 'active']
        );
        console.log(`  ✓ Default admin user created`);
      }
    } catch (err) {
      console.warn(`  ⚠ Admin user: ${err.message}`);
    }

    client.release();
    // DO NOT close the pool - it's needed for the rest of the app!

    console.log('✓ Database initialization successful\n');
    return true;

    } catch (error) {
      if (client) {
        try {
          client.release();
        } catch (e) {}
      }
      // Only close pool if we're giving up, not on retry
      const shouldGiveUp = attempt >= maxAttempts;

      console.warn(`  ✗ ${error.message}`);

      if (!shouldGiveUp) {
        const delay = Math.min(2000 + (attempt * 1000), 15000);
        console.log(`  Retrying in ${Math.floor(delay / 1000)}s...\n`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        if (pool) {
          try {
            await pool.end();
          } catch (e) {}
        }
        console.error(`\n❌ Failed to connect after ${maxAttempts} attempts`);
        console.error('⚠ Server will continue but database operations may fail\n');
        return false;
      }
    }
  }
}

module.exports = initializeDatabase;

    // Ensure default admin exists
    try {
      const adminCheck = await client.query('SELECT id FROM admin_users WHERE username = $1', ['admin']);
      if (adminCheck.rows.length === 0) {
        const hash = await bcrypt.hash('admin123', 10);
        await client.query(
          `INSERT INTO admin_users (username, email, password_hash, full_name, role, status) VALUES ($1, $2, $3, $4, $5, $6)`,
          ['admin', 'admin@chpcebu.edu.ph', hash, 'System Administrator', 'super_admin', 'active']
        );
        console.log(`  ✓ Default admin user created`);
      }
    } catch (err) {
      console.warn(`  ⚠ Admin user: ${err.message}`);
    }

    client.release();
    // DO NOT close the pool - it's needed for the rest of the app!

    console.log('✓ Database initialization successful\n');
    return true;

    } catch (error) {
      if (client) {
        try {
          client.release();
        } catch (e) {}
      }
      // Only close pool if we're giving up, not on retry
      const shouldGiveUp = attempt >= maxAttempts;

      console.warn(`  ✗ ${error.message}`);

      if (!shouldGiveUp) {
        const delay = Math.min(2000 + (attempt * 1000), 15000);
        console.log(`  Retrying in ${Math.floor(delay / 1000)}s...\n`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        if (pool) {
          try {
            await pool.end();
          } catch (e) {}
        }
        console.error(`\n❌ Failed to connect after ${maxAttempts} attempts`);
        console.error('⚠ Server will continue but database operations may fail\n');
        return false;
      }
    }
  }
}

module.exports = initializeDatabase;
