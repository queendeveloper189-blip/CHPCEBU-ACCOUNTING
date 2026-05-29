const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');

// Middleware
const isAuthenticated = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const isAdmin = (req, res, next) => {
  if (!req.session.userId || req.session.userType !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// File upload configuration
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// ========================
// STUDENT MANAGEMENT
// ========================

// Get all trainees
router.get('/trainees', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status, course, schedule, search } = req.query;
    let query = 'SELECT * FROM trainees WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (course) {
      query += ' AND course = ?';
      params.push(course);
    }
    if (schedule) {
      query += ' AND schedule = ?';
      params.push(schedule);
    }
    if (search) {
      query += ' AND (system_id LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR contact_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const [trainees] = await pool.query(query, params);
    res.json(trainees);

  } catch (error) {
    console.error('Error fetching trainees:', error);
    res.status(500).json({ error: 'Failed to fetch trainees' });
  }
});

// Get single trainee
router.get('/trainees/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [trainees] = await pool.query('SELECT * FROM trainees WHERE id = ?', [req.params.id]);
    
    if (trainees.length === 0) {
      return res.status(404).json({ error: 'Trainee not found' });
    }

    // Get SOAs
    const [soas] = await pool.query(
      'SELECT * FROM statements_of_account WHERE trainee_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    // Get requests
    const [requests] = await pool.query(
      'SELECT r.id, r.request_number, r.trainee_id, r.request_type, r.request_details, r.status, r.priority, r.assigned_to, r.due_date, r.created_at, r.updated_at, r.completed_at, COALESCE(u.full_name, "Unassigned") as assigned_to_name FROM requests r LEFT JOIN admin_users u ON r.assigned_to = u.id WHERE r.trainee_id = ? ORDER BY r.created_at DESC LIMIT 10',
      [req.params.id]
    );

    res.json({
      trainee: trainees[0],
      soas,
      requests
    });

  } catch (error) {
    console.error('Error fetching trainee:', error);
    res.status(500).json({ error: 'Failed to fetch trainee' });
  }
});

// Create trainee
router.post('/trainees', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { system_id, first_name, last_name, middle_name, contact_number, email, course, schedule, date_started, address, emergency_contact, emergency_contact_name } = req.body;

    if (!system_id || !first_name || !last_name || !contact_number || !course || !schedule || !date_started) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if system_id already exists
    const [existing] = await pool.query('SELECT id FROM trainees WHERE system_id = ?', [system_id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'System ID already exists' });
    }

    const [result] = await pool.query(
      'INSERT INTO trainees (system_id, first_name, last_name, middle_name, contact_number, email, course, schedule, date_started, address, emergency_contact, emergency_contact_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [system_id, first_name, last_name, middle_name, contact_number, email, course, schedule, date_started, address, emergency_contact, emergency_contact_name]
    );

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, user_type, action, description) VALUES (?, ?, ?, ?)',
      [req.session.userId, 'admin', 'CREATE_TRAINEE', `Created trainee: ${first_name} ${last_name} (${system_id})`]
    );

    res.status(201).json({
      success: true,
      message: 'Trainee created successfully',
      id: result.insertId
    });

  } catch (error) {
    console.error('Error creating trainee:', error);
    res.status(500).json({ error: 'Failed to create trainee' });
  }
});

// Update trainee
router.put('/trainees/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { first_name, last_name, middle_name, contact_number, email, course, schedule, address, emergency_contact, emergency_contact_name, status } = req.body;

    const updates = [];
    const params = [];

    if (first_name) { updates.push('first_name = ?'); params.push(first_name); }
    if (last_name) { updates.push('last_name = ?'); params.push(last_name); }
    if (middle_name !== undefined) { updates.push('middle_name = ?'); params.push(middle_name); }
    if (contact_number) { updates.push('contact_number = ?'); params.push(contact_number); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (course) { updates.push('course = ?'); params.push(course); }
    if (schedule) { updates.push('schedule = ?'); params.push(schedule); }
    if (address) { updates.push('address = ?'); params.push(address); }
    if (emergency_contact) { updates.push('emergency_contact = ?'); params.push(emergency_contact); }
    if (emergency_contact_name) { updates.push('emergency_contact_name = ?'); params.push(emergency_contact_name); }
    if (status) { updates.push('status = ?'); params.push(status); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);

    await pool.query(`UPDATE trainees SET ${updates.join(', ')} WHERE id = ?`, params);

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, user_type, action, description) VALUES (?, ?, ?, ?)',
      [req.session.userId, 'admin', 'UPDATE_TRAINEE', `Updated trainee ID: ${req.params.id}`]
    );

    res.json({ success: true, message: 'Trainee updated successfully' });

  } catch (error) {
    console.error('Error updating trainee:', error);
    res.status(500).json({ error: 'Failed to update trainee' });
  }
});

// Delete trainee
router.delete('/trainees/:id', isAuthenticated, isAdmin, async (req, res) => {
  let connection = null;
  try {
    connection = await pool.getConnection();
    
    // Get trainee info before deletion
    const [trainees] = await connection.query('SELECT * FROM trainees WHERE id = ?', [req.params.id]);
    
    if (trainees.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Trainee not found' });
    }

    // Delete trainee (cascade will delete related records)
    await connection.query('DELETE FROM trainees WHERE id = ?', [req.params.id]);

    // Log activity
    await connection.query(
      'INSERT INTO activity_logs (user_id, user_type, action, description) VALUES (?, ?, ?, ?)',
      [req.session.userId, 'admin', 'DELETE_TRAINEE', `Deleted trainee: ${trainees[0].first_name} ${trainees[0].last_name}`]
    );

    connection.release();

    res.json({ success: true, message: 'Trainee deleted successfully' });

  } catch (error) {
    console.error('Error deleting trainee:', error);
    try {
      if (connection) connection.release();
    } catch (releaseError) {
      console.error('Error releasing connection:', releaseError);
    }
    res.status(500).json({ error: 'Failed to delete trainee' });
  }
});

// ========================
// SOA TEMPLATES
// ========================

// Get all SOA templates
router.get('/soa-templates', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [templates] = await pool.query('SELECT * FROM soa_templates WHERE is_active = 1 ORDER BY course, template_name');
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get template with items
router.get('/soa-templates/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [templates] = await pool.query('SELECT * FROM soa_templates WHERE id = ?', [req.params.id]);
    
    if (templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const [items] = await pool.query('SELECT * FROM soa_template_items WHERE template_id = ? ORDER BY order_position', [req.params.id]);

    res.json({
      template: templates[0],
      items
    });

  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create SOA template
router.post('/soa-templates', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { course, template_name, description, items } = req.body;

    if (!course || !template_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [result] = await connection.query(
        'INSERT INTO soa_templates (course, template_name, description, created_by) VALUES (?, ?, ?, ?)',
        [course, template_name, description, req.session.userId]
      );

      const templateId = result.insertId;

      if (items && items.length > 0) {
        // Insert items
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await connection.query(
            'INSERT INTO soa_template_items (template_id, item_name, item_type, order_position) VALUES (?, ?, ?, ?)',
            [templateId, item.item_name, item.item_type, i + 1]
          );
        }
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        id: templateId
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update SOA template
router.put('/soa-templates/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { course, template_name, description } = req.body;
    const updates = [];
    const params = [];

    if (course) { updates.push('course = ?'); params.push(course); }
    if (template_name) { updates.push('template_name = ?'); params.push(template_name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);

    await pool.query(`UPDATE soa_templates SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, message: 'Template updated successfully' });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete SOA template
router.delete('/soa-templates/:id', isAuthenticated, isAdmin, async (req, res) => {
  let connection = null;
  try {
    connection = await pool.getConnection();

    const [templates] = await connection.query('SELECT * FROM soa_templates WHERE id = ?', [req.params.id]);
    if (templates.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Template not found' });
    }

    await connection.query('DELETE FROM soa_templates WHERE id = ?', [req.params.id]);
    connection.release();

    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Error releasing connection:', releaseError);
      }
    }
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ========================
// STATEMENTS OF ACCOUNT
// ========================

// Create SOA
router.post('/soa', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { trainee_id, template_id, issue_date, due_date, items } = req.body;

    if (!trainee_id || !issue_date || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Generate SOA number
      const [lastSoa] = await connection.query(
        'SELECT soa_number FROM statements_of_account ORDER BY id DESC LIMIT 1'
      );

      const soaNumber = `SOA-${Date.now()}`;

      // Calculate total
      let totalAmount = 0;
      items.forEach(item => {
        if (item.item_type !== 'total') {
          totalAmount += parseFloat(item.amount) || 0;
        }
      });

      const [result] = await connection.query(
        'INSERT INTO statements_of_account (trainee_id, template_id, soa_number, issue_date, due_date, total_amount, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [trainee_id, template_id || null, soaNumber, issue_date, due_date || null, totalAmount, req.session.userId]
      );

      const soaId = result.insertId;

      // Insert line items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await connection.query(
          'INSERT INTO soa_line_items (soa_id, item_name, item_type, amount, order_position) VALUES (?, ?, ?, ?, ?)',
          [soaId, item.item_name, item.item_type, item.amount || 0, i + 1]
        );
      }

      await connection.commit();

      // Create notification for trainee
      try {
        await pool.query(
          `INSERT INTO notifications (trainee_id, title, message, type, status) VALUES (?, ?, ?, ?, ?)`,
          [
            trainee_id,
            'New Statement of Account Available',
            `Your new Statement of Account (${soaNumber}) has been generated and is ready for review. Total Amount: ₱${totalAmount.toFixed(2)}. Please check your account for details.`,
            'soa_available',
            'unread'
          ]
        );
      } catch (notifError) {
        console.log('Notification table may not exist, skipping notification:', notifError.message);
      }

      connection.release();

      res.status(201).json({
        success: true,
        message: 'SOA created successfully',
        id: soaId,
        soa_number: soaNumber
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error creating SOA:', error);
    res.status(500).json({ error: 'Failed to create SOA' });
  }
});

// Get all SOAs for admin dashboard
router.get('/soa', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [soas] = await pool.query(
      `SELECT soa.*, t.system_id, t.first_name, t.last_name, t.course, t.schedule
       FROM statements_of_account soa
       JOIN trainees t ON soa.trainee_id = t.id
       ORDER BY soa.created_at DESC`
    );
    res.json(soas);
  } catch (error) {
    console.error('Error fetching SOAs:', error);
    res.status(500).json({ error: 'Failed to fetch SOAs' });
  }
});

// Get trainee SOAs
router.get('/trainees/:id/soa', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [soas] = await pool.query(
      'SELECT * FROM statements_of_account WHERE trainee_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(soas);
  } catch (error) {
    console.error('Error fetching SOAs:', error);
    res.status(500).json({ error: 'Failed to fetch SOAs' });
  }
});

// Get SOA details
router.get('/soa/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [soas] = await pool.query('SELECT * FROM statements_of_account WHERE id = ?', [req.params.id]);
    
    if (soas.length === 0) {
      return res.status(404).json({ error: 'SOA not found' });
    }

    const [items] = await pool.query('SELECT * FROM soa_line_items WHERE soa_id = ? ORDER BY order_position', [req.params.id]);
    const [trainee] = await pool.query('SELECT * FROM trainees WHERE id = ?', [soas[0].trainee_id]);

    res.json({
      soa: soas[0],
      items,
      trainee: trainee[0]
    });

  } catch (error) {
    console.error('Error fetching SOA:', error);
    res.status(500).json({ error: 'Failed to fetch SOA' });
  }
});

// Update SOA status
router.put('/soa/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status, amount_paid } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const connection = await pool.getConnection();

    const [soas] = await connection.query('SELECT total_amount, trainee_id, soa_number FROM statements_of_account WHERE id = ?', [req.params.id]);
    
    if (soas.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'SOA not found' });
    }

    const totalAmount = soas[0].total_amount;
    const paid = amount_paid || 0;
    const remaining = totalAmount - paid;
    const traineeId = soas[0].trainee_id;
    const soaNumber = soas[0].soa_number;

    await connection.query(
      'UPDATE statements_of_account SET status = ?, amount_paid = ?, amount_remaining = ? WHERE id = ?',
      [status, paid, remaining, req.params.id]
    );

    // Create notification based on status
    try {
      let notifTitle = '';
      let notifMessage = '';
      
      if (status === 'released') {
        notifTitle = 'Statement of Account Released';
        notifMessage = `Your Statement of Account (${soaNumber}) has been released and is ready for you to view and download. Total Amount: ₱${totalAmount.toFixed(2)}.`;
      } else if (status === 'paid') {
        notifTitle = 'Statement of Account Fully Paid';
        notifMessage = `Your Statement of Account (${soaNumber}) has been marked as fully paid. Thank you for your payment!`;
      } else if (status === 'partial') {
        notifTitle = 'Statement of Account Partially Paid';
        notifMessage = `Your Statement of Account (${soaNumber}) has been updated. Amount Remaining: ₱${remaining.toFixed(2)}.`;
      }

      if (notifTitle && notifMessage) {
        await pool.query(
          `INSERT INTO notifications (trainee_id, title, message, type, status) VALUES (?, ?, ?, ?, ?)`,
          [traineeId, notifTitle, notifMessage, 'soa_available', 'unread']
        );
      }
    } catch (notifError) {
      console.log('Notification table may not exist, skipping notification:', notifError.message);
    }

    connection.release();

    res.json({ success: true, message: 'SOA updated successfully' });

  } catch (error) {
    console.error('Error updating SOA:', error);
    res.status(500).json({ error: 'Failed to update SOA' });
  }
});

// Record payment for SOA
router.put('/soa/:id/payment', isAuthenticated, isAdmin, async (req, res) => {
  let connection = null;
  try {
    const { payment_amount, payment_note } = req.body;
    const parsedAmount = parseFloat(payment_amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero' });
    }

    connection = await pool.getConnection();
    const [soas] = await connection.query(
      'SELECT total_amount, amount_paid, trainee_id FROM statements_of_account WHERE id = ?',
      [req.params.id]
    );

    if (soas.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'SOA not found' });
    }

    const totalAmount = parseFloat(soas[0].total_amount) || 0;
    const currentPaid = parseFloat(soas[0].amount_paid) || 0;
    const newPaid = currentPaid + parsedAmount;
    const remaining = Math.max(totalAmount - newPaid, 0);
    let status = 'partial';

    if (newPaid >= totalAmount) {
      status = 'paid';
    } else if (newPaid <= 0) {
      status = 'draft';
    }

    await connection.query(
      'UPDATE statements_of_account SET amount_paid = ?, amount_remaining = ?, status = ? WHERE id = ?',
      [newPaid, remaining, status, req.params.id]
    );

    const traineeId = soas[0].trainee_id;
    await connection.query(
      'INSERT INTO transactions (trainee_id, soa_id, transaction_type, amount, description, payment_method, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [traineeId, req.params.id, 'payment', parsedAmount, payment_note || null, 'cash', req.session.userId]
    );

    await connection.query(
      'INSERT INTO activity_logs (user_id, user_type, action, description) VALUES (?, ?, ?, ?)',
      [req.session.userId, 'admin', 'RECORD_PAYMENT', `Recorded payment of ₱${parsedAmount.toFixed(2)} for SOA ID ${req.params.id}`]
    );

    // Create notification for trainee about payment recording
    try {
      let notifTitle = '';
      let notifMessage = '';
      
      if (status === 'paid') {
        notifTitle = 'Payment Recorded - Account Settled';
        notifMessage = `Your payment of ₱${parsedAmount.toFixed(2)} has been recorded and processed. Your account is now fully paid!`;
      } else if (status === 'partial') {
        notifTitle = 'Payment Received';
        notifMessage = `Your payment of ₱${parsedAmount.toFixed(2)} has been recorded. Amount Remaining: ₱${remaining.toFixed(2)}.`;
      }

      if (notifTitle && notifMessage) {
        await pool.query(
          `INSERT INTO notifications (trainee_id, title, message, type, status) VALUES (?, ?, ?, ?, ?)`,
          [traineeId, notifTitle, notifMessage, 'soa_available', 'unread']
        );
      }
    } catch (notifError) {
      console.log('Notification table may not exist, skipping notification:', notifError.message);
    }

    connection.release();

    res.json({ success: true, message: 'Payment recorded successfully', amount_paid: newPaid, amount_remaining: remaining, status });
  } catch (error) {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Error releasing connection:', releaseError);
      }
    }
    console.error('Error recording SOA payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

router.get('/soa/:id/payments', isAuthenticated, isAdmin, async (req, res) => {
  let connection = null;
  try {
    connection = await pool.getConnection();
    const [payments] = await connection.query(
      `SELECT t.id, t.amount, t.description, t.payment_method, t.created_at,
        IFNULL(u.full_name, 'Admin') AS recorded_by
       FROM transactions t
       LEFT JOIN admin_users u ON t.created_by = u.id
       WHERE t.soa_id = ? AND t.transaction_type = ?
       ORDER BY t.created_at DESC`,
      [req.params.id, 'payment']
    );

    if (payments.length === 0) {
      const [soas] = await connection.query(
        'SELECT amount_paid, updated_at, created_at FROM statements_of_account WHERE id = ?',
        [req.params.id]
      );

      if (soas.length > 0 && parseFloat(soas[0].amount_paid) > 0) {
        payments.push({
          id: null,
          amount: parseFloat(soas[0].amount_paid),
          description: 'Existing payment total from SOA record',
          payment_method: null,
          created_at: soas[0].updated_at || soas[0].created_at,
          recorded_by: 'System'
        });
      }
    }

    connection.release();
    res.json(payments);
  } catch (error) {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Error releasing connection:', releaseError);
      }
    }
    console.error('Error fetching SOA payment history:', error);
    res.status(500).json({ error: 'Failed to load payment history' });
  }
});

// Delete SOA
router.delete('/soa/:id', isAuthenticated, isAdmin, async (req, res) => {
  let connection = null;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [soas] = await connection.query('SELECT id FROM statements_of_account WHERE id = ?', [req.params.id]);
    if (soas.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'SOA not found' });
    }

    await connection.query('DELETE FROM soa_line_items WHERE soa_id = ?', [req.params.id]);
    await connection.query('DELETE FROM transactions WHERE soa_id = ?', [req.params.id]);
    await connection.query('DELETE FROM statements_of_account WHERE id = ?', [req.params.id]);

    await connection.query(
      'INSERT INTO activity_logs (user_id, user_type, action, description) VALUES (?, ?, ?, ?)',
      [req.session.userId, 'admin', 'DELETE_SOA', `Deleted SOA ID ${req.params.id}`]
    );

    await connection.commit();
    connection.release();

    res.json({ success: true, message: 'SOA deleted successfully' });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back SOA delete transaction:', rollbackError);
      }
      connection.release();
    }
    console.error('Error deleting SOA:', error);
    res.status(500).json({ error: 'Failed to delete SOA' });
  }
});

// ========================
// SOA PDF GENERATION
// ========================

router.get('/soa/:id/pdf', isAuthenticated, async (req, res) => {
  try {
    const [soas] = await pool.query(
      'SELECT soa.*, t.system_id, t.first_name, t.last_name, t.course, t.schedule FROM statements_of_account soa JOIN trainees t ON soa.trainee_id = t.id WHERE soa.id = ?',
      [req.params.id]
    );

    if (soas.length === 0) {
      return res.status(404).json({ error: 'SOA not found' });
    }

    const [items] = await pool.query(
      'SELECT * FROM soa_line_items WHERE soa_id = ? ORDER BY order_position',
      [req.params.id]
    );

    const soa = soas[0];

    // Create PDF
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SOA-${soa.soa_number}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('STATEMENT OF ACCOUNT', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('CHPCEBU Training Center', { align: 'center' });
    doc.moveDown(0.5);

    // Trainee Info
    doc.fontSize(10).text(`SOA #: ${soa.soa_number}`, { underline: true });
    doc.text(`Issue Date: ${new Date(soa.issue_date).toLocaleDateString()}`);
    doc.moveDown(0.5);

    // Trainee Details
    doc.text(`Trainee: ${soa.first_name} ${soa.last_name}`, { font: 'Helvetica-Bold' });
    doc.text(`System ID: ${soa.system_id}`);
    doc.text(`Course: ${soa.course}`);
    doc.text(`Schedule: ${soa.schedule}`);
    doc.moveDown(1);

    // Items Table
    const startX = 40;
    const width = 500;
    doc.fontSize(10);

    // Table Header
    doc.rect(startX, doc.y, width, 25).stroke();
    doc.text('Description', startX + 5, doc.y + 7, { width: 300 });
    doc.text('Amount', startX + 310, doc.y - 18, { width: 180, align: 'right' });

    let yPos = doc.y + 25;

    items.forEach((item, index) => {
      doc.rect(startX, yPos, width, 20).stroke();
      
      if (item.item_type === 'total') {
        doc.font('Helvetica-Bold');
      }
      
      doc.text(item.item_name, startX + 5, yPos + 5, { width: 300 });
      doc.text(`₱ ${parseFloat(item.amount).toFixed(2)}`, startX + 310, yPos + 5, { width: 180, align: 'right' });
      
      doc.font('Helvetica');
      yPos += 20;
    });

    doc.moveDown(2);

    // Summary
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`Total Amount: ₱ ${soa.total_amount.toFixed(2)}`);
    doc.text(`Amount Paid: ₱ ${soa.amount_paid.toFixed(2)}`);
    doc.text(`Balance: ₱ ${soa.amount_remaining.toFixed(2)}`);
    doc.moveDown(1);

    doc.font('Helvetica').fontSize(8);
    doc.text('This document is confidential and intended only for the specified trainee. Reproduction or sharing without consent is prohibited.', { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// ========================
// REQUESTS MANAGEMENT
// ========================

// Get all requests
router.get('/requests', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = 'SELECT r.id, r.request_number, r.trainee_id, r.request_type, r.request_details, r.status, r.priority, r.assigned_to, r.due_date, r.created_at, r.updated_at, r.completed_at, t.system_id, t.first_name, t.last_name, COALESCE(u.full_name, "Unassigned") as assigned_to_name FROM requests r JOIN trainees t ON r.trainee_id = t.id LEFT JOIN admin_users u ON r.assigned_to = u.id WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    if (priority) {
      query += ' AND r.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY r.priority DESC, r.created_at DESC LIMIT 100';

    const [requests] = await pool.query(query, params);
    res.json(requests);

  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get request details
router.get('/requests/:id', isAuthenticated, async (req, res) => {
  try {
    const [requests] = await pool.query(
      'SELECT r.id, r.request_number, r.trainee_id, r.request_type, r.request_details, r.status, r.priority, r.assigned_to, r.due_date, r.created_at, r.updated_at, r.completed_at, t.system_id, t.first_name, t.last_name, COALESCE(u.full_name, "Unassigned") as assigned_to_name FROM requests r JOIN trainees t ON r.trainee_id = t.id LEFT JOIN admin_users u ON r.assigned_to = u.id WHERE r.id = ?',
      [req.params.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const [attachments] = await pool.query(
      'SELECT ra.id, ra.request_id, ra.file_name, ra.file_path, ra.file_type, ra.file_size, ra.uploaded_by, ra.uploaded_at, au.full_name as uploaded_by_name FROM request_attachments ra LEFT JOIN admin_users au ON ra.uploaded_by = au.id WHERE ra.request_id = ? ORDER BY ra.uploaded_at DESC',
      [req.params.id]
    );

    const [comments] = await pool.query(
      'SELECT rc.id, rc.request_id, rc.comment_by, rc.comment_text, rc.is_visible_to_trainee, rc.created_at, u.full_name as comment_by_name FROM request_comments rc LEFT JOIN admin_users u ON rc.comment_by = u.id WHERE rc.request_id = ? ORDER BY rc.created_at DESC',
      [req.params.id]
    );

    res.json({
      request: requests[0],
      attachments,
      comments
    });

  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// ========================
// Forgot Password Requests
// ========================

router.get('/forgot-password-requests', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [requests] = await pool.query(
      'SELECT fpr.id, fpr.request_number, fpr.user_type, fpr.identifier, fpr.email, fpr.message, fpr.id_file_name, fpr.id_file_path, fpr.status, fpr.response_message, fpr.responded_by, fpr.created_at, fpr.updated_at, COALESCE(u.full_name, "Not Responded") as responded_by_name FROM forgot_password_requests fpr LEFT JOIN admin_users u ON fpr.responded_by = u.id ORDER BY fpr.created_at DESC LIMIT 200'
    );
    res.json(requests);
  } catch (error) {
    console.error('Error fetching forgot password requests:', error);
    res.status(500).json({ error: 'Failed to fetch forgot password requests' });
  }
});

router.get('/forgot-password-requests/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [requests] = await pool.query(
      'SELECT fpr.id, fpr.request_number, fpr.user_type, fpr.identifier, fpr.email, fpr.message, fpr.id_file_name, fpr.id_file_path, fpr.status, fpr.response_message, fpr.responded_by, fpr.created_at, fpr.updated_at, COALESCE(u.full_name, "Not Responded") as responded_by_name FROM forgot_password_requests fpr LEFT JOIN admin_users u ON fpr.responded_by = u.id WHERE fpr.id = ?',
      [req.params.id]
    );
    if (requests.length === 0) {
      return res.status(404).json({ error: 'Forgot password request not found' });
    }
    res.json(requests[0]);
  } catch (error) {
    console.error('Error fetching forgot password request:', error);
    res.status(500).json({ error: 'Failed to fetch forgot password request' });
  }
});

router.put('/forgot-password-requests/:id', isAuthenticated, isAdmin, async (req, res) => {
  let connection;
  try {
    const { status, response_message } = req.body;
    const allowed = ['accepted', 'rejected'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const requestId = req.params.id;
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT * FROM forgot_password_requests WHERE id = ?', [requestId]);
    if (rows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Forgot password request not found' });
    }

    const request = rows[0];

    // If accepting a trainee password change request, update the trainee's password
    if (status === 'accepted' && request.user_type === 'trainee') {
      let newPassword = '';

      if (request.message && /New Password:/i.test(request.message)) {
        const passwordMatch = request.message.match(/New Password:\s*([^\r\n]+)/i);
        if (passwordMatch && passwordMatch[1]) {
          newPassword = passwordMatch[1].trim();
          console.log(`[Password Reset] Extracted password for ${request.identifier}: "${newPassword}"`);
        }
      }

      if (!newPassword) {
        throw new Error('No valid new password found in the request message.');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      console.log(`[Password Reset] Hashed password, attempting to update trainee: ${request.identifier}`);

      const [trainees] = await connection.query(
        'SELECT id FROM trainees WHERE system_id = ?',
        [request.identifier]
      );

      if (trainees.length === 0) {
        throw new Error(`Trainee not found for system_id: ${request.identifier}`);
      }

      const traineeId = trainees[0].id;
      await connection.query(
        'UPDATE trainees SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, traineeId]
      );
      console.log(`[Password Reset] ✅ Password updated for trainee ${request.identifier} (ID: ${traineeId})`);

      // Create notification for trainee that password was changed
      if (status === 'accepted') {
        try {
          await connection.query(
            `INSERT INTO notifications (trainee_id, title, message, type, status) VALUES (?, ?, ?, ?, ?)`,
            [
              traineeId,
              'Password Change Request Accepted',
              `Your password change request (${request.request_number}) has been accepted and your password has been successfully updated. You can now login with your new password.`,
              'system',
              'unread'
            ]
          );
        } catch (notifError) {
          console.log('Notification table may not exist, skipping notification:', notifError.message);
        }
      }
    }

    await connection.query(
      'UPDATE forgot_password_requests SET status = ?, response_message = ?, responded_by = ? WHERE id = ?',
      [status, response_message || null, req.session.userId, requestId]
    );

    await connection.commit();
    connection.release();

    res.json({ success: true, message: `Request ${status}` });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
      connection.release();
    }
    console.error('Error updating forgot password request:', error);
    res.status(500).json({ error: error.message || 'Failed to update forgot password request' });
  }
});

// ========================
// CHPay (Online Payments) MANAGEMENT
// ========================

// List all CHPay submissions
router.get('/chpay', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT op.*, t.system_id, t.first_name, t.last_name, CONCAT(t.first_name, ' ', t.last_name) as trainee_name
       FROM online_payments op
       JOIN trainees t ON op.trainee_id = t.id
       ORDER BY op.created_at DESC`
    );
    // Normalize file paths
    const normalized = rows.map(r => ({ ...r, file_path: r.file_path ? (r.file_path.startsWith('/') ? r.file_path : '/' + r.file_path) : null }));
    res.json(normalized);
  } catch (error) {
    console.error('Error fetching CHPay submissions:', error);
    res.status(500).json({ error: 'Failed to fetch CHPay submissions' });
  }
});

// Update CHPay status (approve / verifying / reject)
router.put('/chpay/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['verifying', 'approved', 'rejected'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM online_payments WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'CHPay submission not found' });
    }

    const updates = [];
    const params = [];
    updates.push('status = ?'); params.push(status);
    if (status === 'approved') {
      updates.push('admin_id = ?'); params.push(req.session.userId);
      updates.push('verified_at = NOW()');
    } else {
      updates.push('admin_id = ?'); params.push(req.session.userId);
      updates.push('verified_at = NULL');
    }

    params.push(req.params.id);
    await connection.query(`UPDATE online_payments SET ${updates.join(', ')} WHERE id = ?`, params);

    // Get payment details for notification
    const [payment_details] = await connection.query('SELECT trainee_id, reference_number, amount_sent FROM online_payments WHERE id = ?', [req.params.id]);
    const paymentData = payment_details[0];

    // Create notification based on status
    let notifTitle = '';
    let notifMessage = '';
    let notifType = '';
    
    if (status === 'verifying') {
      notifTitle = 'CHPay Payment Being Verified';
      notifMessage = `Your CHPay payment submission with reference number ${paymentData.reference_number} (Amount: ₱${paymentData.amount_sent.toFixed(2)}) is currently being verified by the administrator.`;
      notifType = 'payment_approved';
    } else if (status === 'approved') {
      notifTitle = 'CHPay Payment Approved';
      notifMessage = `Your CHPay payment submission with reference number ${paymentData.reference_number} (Amount: ₱${paymentData.amount_sent.toFixed(2)}) has been successfully approved and verified!`;
      notifType = 'payment_approved';
    }

    if (notifTitle && notifMessage) {
      try {
        await connection.query(
          `INSERT INTO notifications (trainee_id, title, message, type, status) VALUES (?, ?, ?, ?, ?)`,
          [paymentData.trainee_id, notifTitle, notifMessage, notifType, 'unread']
        );
      } catch (notifError) {
        console.log('Notification table may not exist, skipping notification:', notifError.message);
      }
    }

    await connection.query('INSERT INTO activity_logs (user_id, user_type, action, description) VALUES (?, ?, ?, ?)',
      [req.session.userId, 'admin', 'CHPAY_STATUS_CHANGE', `CHPay ID ${req.params.id} status set to ${status}`]
    );

    connection.release();
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Error releasing connection:', releaseError);
      }
    }
    console.error('Error updating CHPay status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Reject CHPay payment - Delete record and notify trainee
router.post('/chpay/:id/reject', isAuthenticated, isAdmin, async (req, res) => {
  let connection = null;
  try {
    connection = await pool.getConnection();
    
    // Get the payment details before deleting
    const [payments] = await connection.query('SELECT * FROM online_payments WHERE id = ?', [req.params.id]);
    if (payments.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'CHPay submission not found' });
    }
    
    const payment = payments[0];
    
    // Log the rejection action
    await connection.query(
      'INSERT INTO activity_logs (user_id, user_type, action, description) VALUES (?, ?, ?, ?)',
      [req.session.userId, 'admin', 'CHPAY_REJECTED', `CHPay ID ${req.params.id} (Ref: ${payment.reference_number}, Amount: ₱${payment.amount_sent}) rejected and deleted`]
    );
    
    // Create a notification for the trainee about the rejection
    try {
      await connection.query(
        `INSERT INTO notifications (trainee_id, title, message, type, status) VALUES (?, ?, ?, ?, ?)`,
        [
          payment.trainee_id,
          'Payment Submission Rejected',
          `Your CHPay payment submission with reference number ${payment.reference_number} (Amount: ₱${payment.amount_sent}) has been rejected. Please contact administration for more details or resubmit your payment.`,
          'payment_rejected',
          'unread'
        ]
      );
    } catch (notifError) {
      console.log('Notification table may not exist, skipping notification:', notifError.message);
    }
    
    // Delete the payment record
    await connection.query('DELETE FROM online_payments WHERE id = ?', [req.params.id]);
    
    connection.release();
    
    res.json({ success: true, message: 'Payment rejected and trainee notified' });
  } catch (error) {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Error releasing connection:', releaseError);
      }
    }
    console.error('Error rejecting CHPay payment:', error);
    res.status(500).json({ error: 'Failed to reject payment: ' + error.message });
  }
});

// Create request
router.post('/requests', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { trainee_id, request_type, request_details, priority, due_date, assigned_to } = req.body;

    if (!trainee_id || !request_type || !request_details) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const request_number = `REQ-${Date.now()}`;

    const [result] = await pool.query(
      'INSERT INTO requests (trainee_id, request_type, request_details, priority, due_date, assigned_to, request_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [trainee_id, request_type, request_details, priority || 'medium', due_date || null, assigned_to || req.session.userId, request_number]
    );

    res.status(201).json({
      success: true,
      message: 'Request created successfully',
      id: result.insertId,
      request_number
    });

  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// Update request status
router.put('/requests/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { status, priority, assigned_to, due_date } = req.body;

    let updates = [];
    let params = [];

    if (status) { updates.push('status = ?'); params.push(status); }
    if (priority) { updates.push('priority = ?'); params.push(priority); }
    if (assigned_to) { updates.push('assigned_to = ?'); params.push(assigned_to); }
    if (due_date) { updates.push('due_date = ?'); params.push(due_date); }

    if (status === 'released') {
      updates.push('completed_at = NOW()');
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);

    // Get request details and trainee_id before updating
    const [requestDetails] = await pool.query('SELECT trainee_id, request_number, request_type FROM requests WHERE id = ?', [req.params.id]);
    const request = requestDetails[0];

    await pool.query(`UPDATE requests SET ${updates.join(', ')} WHERE id = ?`, params);

    // Create notification when request status changes
    if (status) {
      let notifTitle = '';
      let notifMessage = '';
      
      if (status === 'in_progress') {
        notifTitle = 'Request Update - In Progress';
        notifMessage = `Your ${request.request_type} request (${request.request_number}) is now being processed.`;
      } else if (status === 'completed') {
        notifTitle = 'Request Update - Completed';
        notifMessage = `Your ${request.request_type} request (${request.request_number}) has been completed. Please check your account for the results.`;
      } else if (status === 'released') {
        notifTitle = 'Request Update - Released';
        notifMessage = `Your ${request.request_type} request (${request.request_number}) has been released and is ready for you to retrieve.`;
      }

      if (notifTitle && notifMessage) {
        try {
          await pool.query(
            `INSERT INTO notifications (trainee_id, title, message, type, status) VALUES (?, ?, ?, ?, ?)`,
            [request.trainee_id, notifTitle, notifMessage, 'request_update', 'unread']
          );
        } catch (notifError) {
          console.log('Notification table may not exist, skipping notification:', notifError.message);
        }
      }
    }

    res.json({ success: true, message: 'Request updated successfully' });

  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// Upload request attachment
router.post('/requests/:id/upload', isAuthenticated, isAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const webFilePath = `/uploads/${req.file.filename}`;
    const [result] = await pool.query(
      'INSERT INTO request_attachments (request_id, file_name, file_path, file_type, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, req.file.originalname, webFilePath, req.file.mimetype, req.file.size, req.session.userId]
    );

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      attachment: {
        id: result.insertId,
        file_name: req.file.originalname,
        file_path: webFilePath
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Add comment to request
router.post('/requests/:id/comments', isAuthenticated, async (req, res) => {
  try {
    const { comment_text, is_visible_to_trainee } = req.body;

    if (!comment_text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO request_comments (request_id, comment_by, comment_text, is_visible_to_trainee) VALUES (?, ?, ?, ?)',
      [req.params.id, req.session.userId, comment_text, is_visible_to_trainee ? 1 : 0]
    );

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      id: result.insertId
    });

  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Payment Report Endpoint
router.get('/payment-report', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { type, month, year, export: exportFormat } = req.query;

    if (!type || (type === 'monthly' && !month) || (type === 'yearly' && !year)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    let query = `
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total
      FROM transactions
      WHERE transaction_type = 'payment'
    `;

    let params = [];

    if (type === 'monthly') {
      // Monthly report - filter by month and year
      const [yearVal, monthNum] = month.split('-');
      query += ` AND MONTH(created_at) = ? AND YEAR(created_at) = ?`;
      params.push(parseInt(monthNum), parseInt(yearVal));
    } else if (type === 'yearly') {
      // Yearly report - filter by year
      query += ` AND YEAR(created_at) = ?`;
      params.push(parseInt(year));
    }

    query += ` GROUP BY payment_method ORDER BY total DESC`;

    const [results] = await pool.query(query, params);

    if (exportFormat === 'excel') {
      // Export to Excel
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Payment Report');

      const period = type === 'monthly' 
        ? new Date(month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })
        : year;

      // Add title
      worksheet.mergeCells('A1:D1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Payment Report - ${period}`;
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center' };

      // Add headers
      worksheet.addRow(['Payment Method', 'Count', 'Total Amount', 'Average Amount']);
      const headerRow = worksheet.lastRow;
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

      // Add data
      let grandTotal = 0;
      let totalCount = 0;

      if (Array.isArray(results) && results.length > 0) {
        results.forEach(item => {
          const average = item.count > 0 ? (item.total / item.count).toFixed(2) : 0;
          grandTotal += item.total;
          totalCount += item.count;

          worksheet.addRow([
            item.payment_method || 'Unknown',
            item.count,
            item.total,
            average
          ]);
        });
      }

      // Add totals row
      const avgAmount = totalCount > 0 ? (grandTotal / totalCount).toFixed(2) : 0;
      const totalsRow = worksheet.addRow(['Total', totalCount, grandTotal, avgAmount]);
      totalsRow.font = { bold: true };
      totalsRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

      // Format columns
      worksheet.columns = [
        { width: 20 },
        { width: 15, numFmt: '0' },
        { width: 18, numFmt: '#,##0.00' },
        { width: 18, numFmt: '#,##0.00' }
      ];

      // Send file
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="payment-report-${period}.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();
    } else {
      // Return JSON for display
      res.json({
        success: true,
        type: type,
        period: type === 'monthly' ? month : year,
        summary: Array.isArray(results) ? results : []
      });
    }

  } catch (error) {
    console.error('Error generating payment report:', error);
    res.status(500).json({ error: 'Failed to generate payment report: ' + error.message });
  }
});

// ========================
// ANNOUNCEMENTS
// ========================

// Get all announcements
router.get('/announcements', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const [announcements] = await pool.query(
      'SELECT a.id, a.title, a.content, a.created_by, a.is_active, a.target_audience, a.target_course, a.target_schedule, a.priority, a.created_at, a.updated_at, au.full_name as created_by_name FROM announcements a LEFT JOIN admin_users au ON a.created_by = au.id ORDER BY a.created_at DESC'
    );
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Create announcement
router.post('/announcements', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { title, content, target_audience, target_course, target_schedule, priority } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO announcements (title, content, created_by, target_audience, target_course, target_schedule, priority) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, content, req.session.userId, target_audience || 'all', target_course || null, target_schedule || null, priority || 'medium']
    );

    res.json({ 
      success: true, 
      message: 'Announcement created successfully',
      id: result.insertId 
    });

  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Update announcement
router.put('/announcements/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { title, content, target_audience, target_course, target_schedule, priority, is_active } = req.body;

    await pool.query(
      'UPDATE announcements SET title = ?, content = ?, target_audience = ?, target_course = ?, target_schedule = ?, priority = ?, is_active = ? WHERE id = ?',
      [title, content, target_audience || 'all', target_course || null, target_schedule || null, priority || 'medium', is_active, req.params.id]
    );

    res.json({ success: true, message: 'Announcement updated successfully' });

  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Delete announcement
router.delete('/announcements/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

module.exports = router;
