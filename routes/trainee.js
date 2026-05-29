const express = require('express');
const fs = require('fs');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// File upload for trainee CHPay submissions
const chpayUploadDir = './uploads/chpay';
if (!fs.existsSync(chpayUploadDir)) {
  fs.mkdirSync(chpayUploadDir, { recursive: true });
}

const chpayStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, chpayUploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`)
});

const chpayUpload = multer({
  storage: chpayStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) cb(null, true); else cb(new Error('Invalid file type'));
  }
});

// Middleware
const isAuthenticated = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const isTrainee = (req, res, next) => {
  if (!req.session.userId || req.session.userType !== 'trainee') {
    return res.status(403).json({ error: 'Trainee access required' });
  }
  next();
};

// ========================
// TRAINEE DASHBOARD
// ========================

router.get('/dashboard', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const traineeId = req.session.userId;

    // Get trainee info
    const [trainees] = await pool.query('SELECT * FROM trainees WHERE id = ?', [traineeId]);

    if (trainees.length === 0) {
      return res.status(404).json({ error: 'Trainee not found' });
    }

    const trainee = trainees[0];

    // Get SOA summary
    const [soaStats] = await pool.query(
      'SELECT COUNT(*) as total_soas, COALESCE(SUM(total_amount), 0) as total_billings, COALESCE(SUM(amount_paid), 0) as total_paid, COALESCE(SUM(amount_remaining), 0) as total_balance FROM statements_of_account WHERE trainee_id = ?',
      [traineeId]
    );

    // Get latest SOAs
    const [latestSoas] = await pool.query(
      'SELECT id, soa_number, issue_date, total_amount, amount_paid, amount_remaining, status FROM statements_of_account WHERE trainee_id = ? ORDER BY created_at DESC LIMIT 5',
      [traineeId]
    );

    // Get pending requests
    const [pendingRequests] = await pool.query(
      'SELECT id, request_number, request_type, status, created_at FROM requests WHERE trainee_id = ? AND status != "released" ORDER BY created_at DESC LIMIT 5',
      [traineeId]
    );

    res.json({
      trainee: {
        id: trainee.id,
        system_id: trainee.system_id,
        first_name: trainee.first_name,
        last_name: trainee.last_name,
        course: trainee.course,
        schedule: trainee.schedule
      },
      stats: soaStats[0],
      latest_soas: latestSoas,
      pending_requests: pendingRequests
    });

  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// ========================
// PASSWORD CHANGE REQUESTS
// ========================

// Get password change requests for trainee
router.get('/password-requests', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const systemId = req.session.systemId;
    
    const [requests] = await pool.query(
      `SELECT id, request_number, status, message, response_message, created_at, updated_at 
       FROM forgot_password_requests 
       WHERE user_type = 'trainee' AND identifier = ? 
       ORDER BY created_at DESC`,
      [systemId]
    );

    // Process requests to extract password if exists
    const processedRequests = requests.map(req => {
      let hasNewPassword = false;
      if (req.message && req.message.includes('New Password:')) {
        hasNewPassword = true;
      }
      return {
        ...req,
        hasNewPassword
      };
    });

    res.json(processedRequests);

  } catch (error) {
    console.error('Error fetching password requests:', error);
    res.status(500).json({ error: 'Failed to fetch password requests' });
  }
});

// ========================
// STATEMENTS OF ACCOUNT
// ========================

// Get all SOAs for trainee
router.get('/soa', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const traineeId = req.session.userId;

    const [soas] = await pool.query(
      'SELECT id, soa_number, issue_date, due_date, total_amount, amount_paid, amount_remaining, status FROM statements_of_account WHERE trainee_id = ? ORDER BY created_at DESC',
      [traineeId]
    );

    res.json(soas);

  } catch (error) {
    console.error('Error fetching SOAs:', error);
    res.status(500).json({ error: 'Failed to fetch SOAs' });
  }
});

// Get SOA details
router.get('/soa/:id', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const traineeId = req.session.userId;
    const soaId = req.params.id;

    // Verify trainee owns this SOA and include trainee course and schedule
    const [soas] = await pool.query(
      'SELECT soa.*, t.course AS trainee_course, t.schedule AS trainee_schedule, t.system_id, t.first_name, t.last_name FROM statements_of_account soa JOIN trainees t ON soa.trainee_id = t.id WHERE soa.id = ? AND soa.trainee_id = ?',
      [soaId, traineeId]
    );

    if (soas.length === 0) {
      return res.status(404).json({ error: 'SOA not found' });
    }

    const [items] = await pool.query(
      'SELECT * FROM soa_line_items WHERE soa_id = ? ORDER BY order_position',
      [soaId]
    );

    const soa = {
      ...soas[0],
      course: soas[0].trainee_course,
      schedule: soas[0].trainee_schedule,
    };

    res.json({
      soa,
      items,
      trainee: {
        course: soas[0].trainee_course,
        schedule: soas[0].trainee_schedule,
        system_id: soas[0].system_id,
        first_name: soas[0].first_name,
        last_name: soas[0].last_name
      }
    });

  } catch (error) {
    console.error('Error fetching SOA:', error);
    res.status(500).json({ error: 'Failed to fetch SOA' });
  }
});

router.get('/soa/:id/payments', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const traineeId = req.session.userId;
    const soaId = req.params.id;

    const [soas] = await pool.query(
      'SELECT id, amount_paid FROM statements_of_account WHERE id = ? AND trainee_id = ?',
      [soaId, traineeId]
    );

    if (soas.length === 0) {
      return res.status(404).json({ error: 'SOA not found' });
    }

    const [payments] = await pool.query(
      `SELECT t.id, t.amount, t.description, t.payment_method, t.created_at,
        IFNULL(u.full_name, 'Admin') AS recorded_by
       FROM transactions t
       LEFT JOIN admin_users u ON t.created_by = u.id
       WHERE t.soa_id = ? AND t.transaction_type = ?
       ORDER BY t.created_at DESC`,
      [soaId, 'payment']
    );

    if (payments.length === 0 && parseFloat(soas[0].amount_paid) > 0) {
      payments.push({
        id: null,
        amount: parseFloat(soas[0].amount_paid),
        description: 'Existing payment total from SOA record',
        payment_method: null,
        created_at: null,
        recorded_by: 'System'
      });
    }

    res.json(payments);
  } catch (error) {
    console.error('Error fetching SOA payment history:', error);
    res.status(500).json({ error: 'Failed to load payment history' });
  }
});

// ========================
// REQUESTS
// ========================

// Get all requests for trainee
router.get('/requests', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const traineeId = req.session.userId;
    const { status } = req.query;

    let query = 'SELECT id, request_number, request_type, request_details, status, priority, created_at, updated_at FROM requests WHERE trainee_id = ?';
    const params = [traineeId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const [requests] = await pool.query(query, params);
    res.json(requests);

  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get request details with comments
router.get('/requests/:id', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const traineeId = req.session.userId;
    const requestId = req.params.id;

    // Verify trainee owns this request
    const [requests] = await pool.query(
      'SELECT r.id, r.request_number, r.trainee_id, r.request_type, r.request_details, r.status, r.priority, r.assigned_to, r.due_date, r.created_at, r.updated_at, r.completed_at, COALESCE(u.full_name, "Unassigned") as assigned_to_name FROM requests r LEFT JOIN admin_users u ON r.assigned_to = u.id WHERE r.id = ? AND r.trainee_id = ?',
      [requestId, traineeId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Get attachments
    const [attachments] = await pool.query(
      'SELECT id, file_name, file_path, file_size, uploaded_at FROM request_attachments WHERE request_id = ? ORDER BY uploaded_at DESC',
      [requestId]
    );

    // Get visible comments
    const [comments] = await pool.query(
      'SELECT rc.*, u.full_name as comment_by_name FROM request_comments rc LEFT JOIN admin_users u ON rc.comment_by = u.id WHERE rc.request_id = ? AND rc.is_visible_to_trainee = 1 ORDER BY rc.created_at DESC',
      [requestId]
    );

    const normalizedAttachments = attachments.map(att => ({
      ...att,
      file_path: att.file_path.replace(/\\/g, '/').replace(/^uploads\/?/, '/uploads/')
    }));

    res.json({
      request: requests[0],
      attachments: normalizedAttachments,
      comments
    });

  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// Create new request
router.post('/requests', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const traineeId = req.session.userId;
    const { request_type, request_details } = req.body;

    if (!request_type || !request_details) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate request type
    const validTypes = ['document', 'paper', 'soa', 'other'];
    if (!validTypes.includes(request_type)) {
      return res.status(400).json({ error: 'Invalid request type' });
    }

    const request_number = `REQ-${Date.now()}`;

    const [result] = await pool.query(
      'INSERT INTO requests (trainee_id, request_type, request_details, request_number, status) VALUES (?, ?, ?, ?, ?)',
      [traineeId, request_type, request_details, request_number, 'pending']
    );

    // Create notification for trainee
    try {
      await pool.query(
        `INSERT INTO notifications (trainee_id, title, message, type, status) VALUES (?, ?, ?, ?, ?)`,
        [
          traineeId,
          'Request Submitted Successfully',
          `Your ${request_type} request (${request_number}) has been submitted and is pending review. You will be notified when there are updates.`,
          'request_update',
          'unread'
        ]
      );
    } catch (notifError) {
      console.log('Notification table may not exist, skipping notification:', notifError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Request submitted successfully',
      id: result.insertId,
      request_number
    });

  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// CHPay Online submission (trainee) with multer error handling
router.post('/chpay', isAuthenticated, isTrainee, (req, res) => {
  chpayUpload.single('transaction_file')(req, res, async function (err) {
    if (err) {
      console.error('Upload error:', err);
      // Multer errors may include message and code
      return res.status(400).json({ error: err.message || 'File upload error' });
    }

    try {
      const traineeId = req.session.userId;
      const { name_of_sender, reference_number, details, amount_sent } = req.body;

      if (!name_of_sender || !reference_number || !amount_sent) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const amount = parseFloat(amount_sent);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount_sent' });
      }

      const fileName = req.file ? req.file.filename : null;
      const filePath = req.file ? path.join('uploads', 'chpay', req.file.filename).replace(/\\/g, '/') : null;

      try {
        const [result] = await pool.query(
          'INSERT INTO online_payments (trainee_id, name_of_sender, reference_number, details, amount_sent, file_name, file_path) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [traineeId, name_of_sender, reference_number, details || null, amount, fileName, filePath]
        );

        // Create notification for trainee
        try {
          await pool.query(
            `INSERT INTO notifications (trainee_id, title, message, type, status) VALUES (?, ?, ?, ?, ?)`,
            [
              traineeId,
              'CHPay Payment Submitted',
              `Your CHPay payment submission with reference number ${reference_number} (Amount: ₱${amount.toFixed(2)}) has been received and is being verified. You will be notified once it's been reviewed.`,
              'payment_approved',
              'unread'
            ]
          );
        } catch (notifError) {
          console.log('Notification table may not exist, skipping notification:', notifError.message);
        }

        return res.status(201).json({ success: true, id: result.insertId });
      } catch (dbErr) {
        console.error('DB error inserting CHPay:', dbErr);
        return res.status(500).json({ error: 'Database error saving CHPay submission' });
      }
    } catch (error) {
      console.error('Error processing CHPay submission:', error);
      return res.status(500).json({ error: 'Failed to submit CHPay' });
    }
  });
});

// List trainee's CHPay submissions
router.get('/chpay', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const traineeId = req.session.userId;
    const [rows] = await pool.query('SELECT id, name_of_sender, reference_number, details, amount_sent, file_path, status, created_at FROM online_payments WHERE trainee_id = ? ORDER BY created_at DESC', [traineeId]);
    // Normalize file path for serving
    const normalized = rows.map(r => ({ ...r, file_path: r.file_path ? (r.file_path.startsWith('/') ? r.file_path : '/' + r.file_path) : null }));
    res.json(normalized);
  } catch (error) {
    console.error('Error fetching CHPay submissions:', error);
    res.status(500).json({ error: 'Failed to fetch CHPay submissions' });
  }
});

// Download SOA as PDF
router.get('/soa/:id/download', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const traineeId = req.session.userId;
    const soaId = req.params.id;

    // Verify trainee owns this SOA
    const [soas] = await pool.query(
      'SELECT soa.*, t.system_id, t.first_name, t.last_name, t.course, t.schedule FROM statements_of_account soa JOIN trainees t ON soa.trainee_id = t.id WHERE soa.id = ? AND soa.trainee_id = ?',
      [soaId, traineeId]
    );

    if (soas.length === 0) {
      return res.status(404).json({ error: 'SOA not found' });
    }

    const [items] = await pool.query(
      'SELECT * FROM soa_line_items WHERE soa_id = ? ORDER BY order_position',
      [soaId]
    );

    // Get transaction history
    const [transactions] = await pool.query(
      'SELECT * FROM transactions WHERE trainee_id = ? ORDER BY created_at DESC LIMIT 10',
      [traineeId]
    );

    const PDFDocument = require('pdfkit');
    const soa = soas[0];

    const amountValue = (value) => {
      const cleaned = String(value).replace(/[^0-9.-]+/g, '');
      const parsed = parseFloat(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const fontPath = fs.existsSync('C:\\Windows\\Fonts\\arial.ttf')
      ? 'C:\\Windows\\Fonts\\arial.ttf'
      : null;
    const boldFontPath = fs.existsSync('C:\\Windows\\Fonts\\arialbd.ttf')
      ? 'C:\\Windows\\Fonts\\arialbd.ttf'
      : null;

    const normalFont = fontPath || 'Helvetica';
    const boldFont = boldFontPath || 'Helvetica-Bold';
    const currencyLabel = '₱';

    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SOA-${soa.soa_number}.pdf"`);

    doc.pipe(res);

    // ===== PROFESSIONAL HEADER =====
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    doc.rect(0, 0, pageWidth, 90).fill('#4f46e5');
    doc.font(boldFont).fontSize(26).fillColor('white')
      .text('STATEMENT OF ACCOUNT', 50, 25, { align: 'center', width: pageWidth - 100 });
    doc.font(normalFont).fontSize(11).fillColor('#dbeafe')
      .text('CHPCEBU Training Center', 50, 55, { align: 'center', width: pageWidth - 100 });

    doc.fillColor('black');
    doc.moveDown(4);

    // ===== DOCUMENT INFO =====
    const headerTop = doc.y;
    doc.font(boldFont).fontSize(10).fillColor('#111827');
    doc.text('Document Number:', 50, headerTop);
    doc.font(normalFont).fontSize(9).text(soa.soa_number, 150, headerTop);

    doc.font(boldFont).fontSize(10).text('Issue Date:', 50, headerTop + 18);
    doc.font(normalFont).fontSize(9).text(new Date(soa.issue_date).toLocaleDateString(), 150, headerTop + 18);

    doc.font(boldFont).fontSize(10).text('Due Date:', 360, headerTop);
    doc.font(normalFont).fontSize(9).text(soa.due_date ? new Date(soa.due_date).toLocaleDateString() : 'N/A', 430, headerTop);

    doc.font(boldFont).fontSize(10).text('Status:', 360, headerTop + 18);
    doc.font(normalFont).fontSize(9).fillColor(soa.status === 'PARTIAL' ? '#d97706' : soa.status === 'PAID' ? '#047857' : '#b91c1c')
      .text(soa.status.toUpperCase(), 430, headerTop + 18);
    doc.fillColor('black');

    doc.y = headerTop + 42;
    doc.moveDown(0.5);

    // ===== STUDENT INFORMATION =====
    const infoSectionTop = doc.y;
    doc.font(boldFont).fontSize(10).text('STUDENT INFORMATION', 50, infoSectionTop);
    doc.strokeColor('#d1d5db').lineWidth(1).rect(50, infoSectionTop + 16, pageWidth - 100, 80).stroke();

    doc.font(boldFont).fontSize(9).text('Name:', 60, infoSectionTop + 24);
    doc.font(normalFont).fontSize(9).text(`${soa.first_name} ${soa.last_name}`, 110, infoSectionTop + 24);
    doc.font(boldFont).fontSize(9).text('Student ID:', 60, infoSectionTop + 42);
    doc.font(normalFont).fontSize(9).text(soa.system_id, 110, infoSectionTop + 42);
    doc.font(boldFont).fontSize(9).text('Course:', 60, infoSectionTop + 60);
    doc.font(normalFont).fontSize(9).text(soa.course, 110, infoSectionTop + 60);

    doc.font(boldFont).fontSize(9).text('Schedule:', 360, infoSectionTop + 24);
    doc.font(normalFont).fontSize(9).text(soa.schedule, 420, infoSectionTop + 24);

    doc.y = infoSectionTop + 108;
    doc.moveDown(0.5);

    const tableStartX = 40;
    const tableWidth = pageWidth - 80;

    doc.fillColor('#111827');

    // ===== ACCOUNT SUMMARY =====
    doc.font(boldFont).fontSize(10).text('ACCOUNT SUMMARY', 50, doc.y);
    doc.moveDown(0.4);
    const summaryBoxX = 50;
    doc.rect(summaryBoxX, doc.y, tableWidth, 72).fill('#f8fafc').stroke('#e5e7eb');

    const summaryY = doc.y + 10;
    doc.font(boldFont).fontSize(10).fillColor('#111827');
    doc.text('Total Amount Billed:', summaryBoxX + 15, summaryY);
    doc.text('Amount Paid:', summaryBoxX + 15, summaryY + 24);
    doc.text('Remaining Balance:', summaryBoxX + 15, summaryY + 44);

    const summaryRight = summaryBoxX + tableWidth - 15;
    const summaryValueX = summaryRight - 120;
    doc.font(boldFont).fontSize(10).fillColor('#4f46e5');
    doc.text(`${currencyLabel} ${amountValue(soa.total_amount).toFixed(2)}`, summaryValueX, summaryY, { align: 'right', width: 120 });
    doc.fillColor('#047857');
    doc.text(`${currencyLabel} ${amountValue(soa.amount_paid).toFixed(2)}`, summaryValueX, summaryY + 24, { align: 'right', width: 120 });
    doc.fillColor('#b91c1c');
    doc.text(`${currencyLabel} ${amountValue(soa.amount_remaining).toFixed(2)}`, summaryValueX, summaryY + 44, { align: 'right', width: 120 });

    doc.y = summaryY + 72 + 20;
    doc.moveDown(0.5);

    // ===== TRANSACTION HISTORY =====
    doc.font(boldFont).fontSize(10).fillColor('#111827').text('RECENT TRANSACTIONS', tableStartX, doc.y);
    doc.y += 22;

    const historyHeaderY = doc.y;
    doc.rect(tableStartX, historyHeaderY, tableWidth, 24).fill('#eef2ff');
    doc.fillColor('#111827').font(boldFont).fontSize(8);
    doc.text('Date', tableStartX + 10, historyHeaderY + 7, { width: 70, align: 'left' });
    doc.text('Description', tableStartX + 90, historyHeaderY + 7, { width: 220, align: 'left' });
    doc.text('Type', tableStartX + 320, historyHeaderY + 7, { width: 70, align: 'left' });
    doc.text('Amount', tableStartX + 395, historyHeaderY + 7, { width: 80, align: 'right' });

    yPos = historyHeaderY + 24;

    if (transactions.length === 0) {
      doc.font(normalFont).fontSize(9).fillColor('#6b7280').text('No recent transactions available.', tableStartX + 10, yPos + 5);
      yPos += 24;
    } else {
      transactions.slice(0, 8).forEach((trans, index) => {
        const rowHeight = 18;
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(tableStartX, yPos, tableWidth, rowHeight).fill(bgColor);
        doc.fillColor('#111827').font(normalFont).fontSize(8);
        doc.text(new Date(trans.created_at).toLocaleDateString(), tableStartX + 10, yPos + 5, { width: 70, align: 'left' });
        doc.text(trans.description || 'N/A', tableStartX + 90, yPos + 5, { width: 220, align: 'left' });
        doc.fillColor(trans.transaction_type === 'payment' ? '#047857' : '#4f46e5');
        doc.text(trans.transaction_type.toUpperCase(), tableStartX + 320, yPos + 5, { width: 70, align: 'left' });
        doc.fillColor('#111827');
        doc.text(`${currencyLabel} ${amountValue(trans.amount).toFixed(2)}`, tableStartX + 395, yPos + 5, { width: 80, align: 'right' });
        doc.strokeColor('#e5e7eb').lineWidth(0.5).rect(tableStartX, yPos, tableWidth, rowHeight).stroke();
        yPos += rowHeight;
      });
    }

    doc.y = yPos + 20;

    // ===== FOOTER =====
    const footerY = doc.page.height - 70;
    doc.strokeColor('#d1d5db').lineWidth(0.5).moveTo(50, footerY).lineTo(pageWidth - 50, footerY).stroke();
    doc.font(normalFont).fontSize(8).fillColor('#6b7280').text(
      'This document is confidential and for your personal record only. Please contact the registrar if you have any questions about this statement.',
      50, footerY + 12, { align: 'center', width: pageWidth - 100 }
    );
    doc.font(normalFont).fontSize(7).text(
      `Generated on ${new Date().toLocaleDateString()} | Document #${soa.soa_number}`,
      50, footerY + 28, { align: 'center', width: pageWidth - 100 }
    );

    doc.end();

  } catch (error) {
    console.error('Error downloading SOA:', error);
    res.status(500).json({ error: 'Failed to download SOA' });
  }
});

// Change password (Trainee alias)
router.post('/change-password', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const traineeId = req.session.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await pool.getConnection();
    const [trainees] = await connection.query(
      'SELECT system_id, password_hash FROM trainees WHERE id = ?',
      [traineeId]
    );
    connection.release();

    if (trainees.length === 0) {
      return res.status(404).json({ error: 'Trainee not found' });
    }

    const trainee = trainees[0];
    let passwordMatch = false;

    if (trainee.password_hash) {
      passwordMatch = await bcrypt.compare(currentPassword, trainee.password_hash);
    } else {
      passwordMatch = currentPassword === trainee.system_id;
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE trainees SET password_hash = ? WHERE id = ?',
      [hashedPassword, traineeId]
    );

    // Create notification for trainee
    try {
      await pool.query(
        `INSERT INTO notifications (trainee_id, title, message, type, status) VALUES (?, ?, ?, ?, ?)`,
        [
          traineeId,
          'Password Changed Successfully',
          `Your password has been changed successfully. If you did not make this change, please contact an administrator immediately.`,
          'system',
          'unread'
        ]
      );
    } catch (notifError) {
      console.log('Notification table may not exist, skipping notification:', notifError.message);
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Trainee change password error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Get trainee notifications
router.get('/notifications', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const traineeId = req.session.userId;
    const [notifications] = await pool.query(
      `SELECT * FROM notifications 
       WHERE trainee_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [traineeId]
    );
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const traineeId = req.session.userId;
    const notificationId = req.params.id;

    // Verify the notification belongs to this trainee
    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE id = ? AND trainee_id = ?',
      [notificationId, traineeId]
    );

    if (notifications.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await pool.query(
      'UPDATE notifications SET status = ? WHERE id = ?',
      ['read', notificationId]
    );

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Clear all notifications
router.delete('/notifications/clear', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const traineeId = req.session.userId;
    
    await pool.query(
      'DELETE FROM notifications WHERE trainee_id = ?',
      [traineeId]
    );

    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// ========================
// ANNOUNCEMENTS
// ========================

// Get active announcements for trainee
router.get('/announcements', isAuthenticated, isTrainee, async (req, res) => {
  try {
    const traineeId = req.session.userId;

    // Get trainee info to filter announcements by course/schedule
    const [trainees] = await pool.query('SELECT course, schedule FROM trainees WHERE id = ?', [traineeId]);

    if (trainees.length === 0) {
      return res.json([]);
    }

    const trainee = trainees[0];
    const course = trainee.course;
    const schedule = trainee.schedule;

    // Get active announcements that apply to this trainee
    const [announcements] = await pool.query(
      `SELECT id, title, content, priority, created_at 
       FROM announcements 
       WHERE is_active = 1 
       AND (target_audience = 'all' 
            OR (target_audience = 'specific_course' AND target_course = ?) 
            OR (target_audience = 'specific_schedule' AND target_schedule = ?))
       ORDER BY priority DESC, created_at DESC`,
      [course, schedule]
    );

    res.json(announcements);

  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

module.exports = router;
