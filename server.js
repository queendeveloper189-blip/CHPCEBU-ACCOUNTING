const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow same-origin requests and localhost for development
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// View Engine Setup
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// API Routes
const adminRoutes = require('./routes/admin');
const traineeRoutes = require('./routes/trainee');
const authRoutes = require('./routes/auth');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trainee', traineeRoutes);

// Serve PWA manifest and service worker
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/manifest.json'));
});

app.get('/service-worker.js', (req, res) => {
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(__dirname, 'public/service-worker.js'));
});

// Main page redirect
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server only when run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || 'localhost';

  app.listen(PORT, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Trainees Accounting System Server                              ║
║  Running on: http://${HOST}:${PORT}                             ║
║  Environment: ${process.env.NODE_ENV || 'development'}                      ║
║  Database: ${process.env.DB_NAME || 'trainees_accounting_system'}    ║
╚════════════════════════════════════════════════════════════════╝
  `);
  });
}

module.exports = app;
