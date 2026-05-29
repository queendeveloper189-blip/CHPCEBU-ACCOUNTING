const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');

// Create upload directory for ID files
const uploadDir = './uploads/password-reset-ids';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for ID file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const uploadIdFile = multer({ 
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
}).any(); // Use .any() to accept any files (including none)

// Middleware for authentication
const isAuthenticated = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const isAdmin = async (req, res, next) => {
  if (!req.session.userId || req.session.userType !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const isTrainee = async (req, res, next) => {
  if (!req.session.userId || req.session.userType !== 'trainee') {
    return res.status(403).json({ error: 'Trainee access required' });
  }
  next();
};

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password, userType } = req.body;

    if (!username || !password || !userType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (userType === 'admin') {
      let connection;
      try {
        connection = await pool.getConnection();
      } catch (dbErr) {
        console.error('❌ Failed to get database connection:', dbErr.message);
        return res.status(503).json({ error: 'Database connection failed. Please try again.' });
      }

      try {
        const [users] = await connection.query(
          'SELECT id, username, password_hash, full_name, role, status FROM admin_users WHERE username = ?',
          [username]
        );
        connection.release();

        if (users.length === 0) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        if (user.status === 'inactive') {
          return res.status(401).json({ error: 'Account is inactive' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [user.id]);

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.userType = 'admin';
        req.session.fullName = user.full_name;
        req.session.role = user.role;

        res.json({
          success: true,
          message: 'Login successful',
          user: {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role,
            userType: 'admin'
          }
        });
      } catch (queryErr) {
        connection.release();
        console.error('❌ Admin login query error:', queryErr.message);
        return res.status(500).json({ error: 'Database query failed' });
      }

    } else if (userType === 'trainee') {
      // Trainee login using system_id
      let connection;
      try {
        connection = await pool.getConnection();
      } catch (dbErr) {
        console.error('❌ Failed to get database connection:', dbErr.message);
        return res.status(503).json({ error: 'Database connection failed. Please try again.' });
      }

      try {
        const [trainees] = await connection.query(
          'SELECT id, system_id, first_name, last_name, status, password_hash FROM trainees WHERE system_id = ?',
          [username]
        );
        connection.release();

        if (trainees.length === 0) {
          return res.status(401).json({ error: 'Invalid trainee ID' });
        }

        const trainee = trainees[0];
        console.log(`[Login] Trainee ${username} found, has password_hash: ${!!trainee.password_hash}`);

        if (trainee.status === 'inactive') {
          return res.status(401).json({ error: 'Trainee account is inactive' });
        }

        let passwordMatch = false;
        if (trainee.password_hash) {
          console.log(`[Login] Checking password against hash for ${username}`);
          passwordMatch = await bcrypt.compare(password, trainee.password_hash);
          console.log(`[Login] Password comparison result: ${passwordMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        } else {
          passwordMatch = password === trainee.system_id;
          console.log(`[Login] No hash found, comparing with system_id: ${passwordMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        }

        if (!passwordMatch) {
          console.log(`[Login] ❌ Login failed for ${username}: Invalid credentials`);
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.userId = trainee.id;
        req.session.systemId = trainee.system_id;
        req.session.userType = 'trainee';
        req.session.userFullName = `${trainee.first_name} ${trainee.last_name}`;

        console.log(`[Login] ✅ Login successful for ${username}`);

        res.json({
          success: true,
          message: 'Login successful',
          user: {
            id: trainee.id,
            systemId: trainee.system_id,
            fullName: `${trainee.first_name} ${trainee.last_name}`,
            userType: 'trainee'
          }
        });
      } catch (queryErr) {
        connection.release();
        console.error('❌ Trainee login query error:', queryErr.message);
        return res.status(500).json({ error: 'Database query failed' });
      }
    } else {
      res.status(400).json({ error: 'Invalid user type' });
    }

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
});

// Forgot password request (admin or trainee)
router.post('/forgot-password-request', uploadIdFile, async (req, res) => {
  try {
    const { userType, identifier, email, message, newPassword } = req.body;

    if (!userType || !identifier) {
      // Clean up uploaded files if there were errors
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          try { fs.unlinkSync(file.path); } catch (e) {}
        });
      }
      return res.status(400).json({ error: 'Please provide the user type and identifier.' });
    }

    if (!['admin', 'trainee'].includes(userType)) {
      // Clean up uploaded files
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          try { fs.unlinkSync(file.path); } catch (e) {}
        });
      }
      return res.status(400).json({ error: 'Invalid user type.' });
    }

    // For trainees, check if trainee exists
    if (userType === 'trainee') {
      const connection = await pool.getConnection();
      const [trainees] = await connection.query(
        'SELECT id FROM trainees WHERE system_id = ?',
        [identifier]
      );
      connection.release();

      if (trainees.length === 0) {
        // Clean up uploaded files
        if (req.files && req.files.length > 0) {
          req.files.forEach(file => {
            try { fs.unlinkSync(file.path); } catch (e) {}
          });
        }
        return res.status(404).json({ error: 'Trainee is not exist' });
      }
    }

    // For admins, check if admin exists
    if (userType === 'admin') {
      const connection = await pool.getConnection();
      const [admins] = await connection.query(
        'SELECT id FROM admin_users WHERE username = ?',
        [identifier]
      );
      connection.release();

      if (admins.length === 0) {
        // Clean up uploaded files
        if (req.files && req.files.length > 0) {
          req.files.forEach(file => {
            try { fs.unlinkSync(file.path); } catch (e) {}
          });
        }
        return res.status(404).json({ error: 'Admin user is not exist' });
      }
    }

    // For trainees, validate new password
    if (userType === 'trainee' && newPassword) {
      if (newPassword.length < 6) {
        // Clean up uploaded files
        if (req.files && req.files.length > 0) {
          req.files.forEach(file => {
            try { fs.unlinkSync(file.path); } catch (e) {}
          });
        }
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
    }

    // For trainees, check that ID file was uploaded
    if (userType === 'trainee' && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ error: 'Valid ID file is required for trainees.' });
    }

    const request_number = `FP-${Date.now()}`;
    
    // Store new password in message field for trainees
    const requestMessage = userType === 'trainee' && newPassword ? `New Password: ${newPassword}` : (message || null);

    // Prepare file info (get first file if exists)
    let idFileName = null;
    let idFilePath = null;
    if (req.files && req.files.length > 0) {
      idFileName = req.files[0].originalname;
      idFilePath = req.files[0].path;
    }

    await pool.query(
      'INSERT INTO forgot_password_requests (request_number, user_type, identifier, email, message, id_file_name, id_file_path, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [request_number, userType, identifier, email || null, requestMessage, idFileName, idFilePath, 'pending']
    );

    // Create notification for trainee password change request
    if (userType === 'trainee') {
      try {
        const connection = await pool.getConnection();
        const [trainees] = await connection.query(
          'SELECT id FROM trainees WHERE system_id = ?',
          [identifier]
        );
        connection.release();

        if (trainees.length > 0) {
          await pool.query(
            `INSERT INTO notifications (trainee_id, title, message, type, status) VALUES (?, ?, ?, ?, ?)`,
            [
              trainees[0].id,
              'Password Change Request Submitted',
              `Your password change request (${request_number}) has been submitted successfully. An administrator will review your request and notify you of the status.`,
              'system',
              'unread'
            ]
          );
        }
      } catch (notifError) {
        console.log('Notification table may not exist, skipping notification:', notifError.message);
      }
    }

    res.status(201).json({ success: true, message: 'Forgot password request submitted successfully.' });
  } catch (error) {
    console.error('Forgot password request error:', error);
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.error('Error deleting file:', e);
        }
      });
    }
    res.status(500).json({ error: 'Failed to submit forgot password request' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Get current session
router.get('/session', isAuthenticated, (req, res) => {
  res.json({
    userId: req.session.userId,
    username: req.session.username,
    userType: req.session.userType,
    fullName: req.session.fullName || req.session.userFullName,
    systemId: req.session.systemId || null,
    role: req.session.role
  });
});

// Change password (Admin)
router.post('/change-password', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.session.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await pool.getConnection();
    const [users] = await connection.query(
      'SELECT password_hash FROM admin_users WHERE id = ?',
      [adminId]
    );
    connection.release();

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, users[0].password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE admin_users SET password_hash = ? WHERE id = ?',
      [hashedPassword, adminId]
    );

    res.json({ success: true, message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Change password (Trainee)
router.post('/trainee/change-password', isAuthenticated, isTrainee, async (req, res) => {
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

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Trainee change password error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Serve ID file for password reset request (admin only)
router.get('/password-reset-id/:requestId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;

    const connection = await pool.getConnection();
    const [requests] = await connection.query(
      'SELECT id_file_path, id_file_name FROM forgot_password_requests WHERE id = ?',
      [requestId]
    );
    connection.release();

    if (requests.length === 0 || !requests[0].id_file_path) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = requests[0].id_file_path;
    const fileName = requests[0].id_file_name;

    // Security: Ensure file path is within the uploads directory
    if (!filePath.startsWith('./uploads/password-reset-ids/')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate content type
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));

  } catch (error) {
    console.error('Error serving ID file:', error);
    res.status(500).json({ error: 'Failed to retrieve file' });
  }
});

module.exports = router;
