# 📚 Trainees Accounting & Registrar Management System

**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** 2026

---

## 🎯 Overview

A complete, professional web and mobile application for managing student accounts, statements of accounts (SOA), and document requests. Built with Node.js/Express backend, MySQL database, and Bootstrap UI. Works as a Progressive Web App (PWA) for seamless iPhone and Android installation.

## ✨ Key Features

### For Administrators
- ✅ Complete student management (Add, Edit, Delete, Search)
- ✅ Create and manage SOA templates per course
- ✅ Generate individual SOAs with customizable line items
- ✅ Print/download SOAs as professional PDF
- ✅ Track payment status and outstanding balances
- ✅ Manage student requests with file uploads
- ✅ Add comments and updates to requests (visible to trainees)
- ✅ Dashboard with real-time statistics
- ✅ Activity logging and audit trails

### For Trainees
- ✅ View all issued Statements of Account
- ✅ Download SOA as PDF for printing
- ✅ Submit requests (Document, Papers, SOA, Other)
- ✅ Track request status in real-time
- ✅ View admin comments and attachments
- ✅ View account summary (Billings, Payments, Balance)
- ✅ Responsive mobile-friendly interface
- ✅ Offline access to downloaded SOAs

## 🛠️ Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Frontend** | HTML5, CSS3, Bootstrap | 5.3+ |
| **Backend** | Node.js, Express | 4.18+ |
| **Database** | MySQL | 5.7+ |
| **PDF Generation** | PDFKit | 0.13+ |
| **File Upload** | Multer | 1.4+ |
| **Authentication** | bcryptjs, Sessions | - |
| **Mobile** | PWA, Service Worker | - |

## 📋 System Requirements

- **Server:** Node.js 14+ and npm 6+
- **Database:** MySQL 5.7+ with root/admin access
- **Storage:** 100MB minimum for system + uploads
- **Network:** HTTPS recommended for production
- **Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 🚀 Quick Start (5 Minutes)

### 1. Setup Database

```bash
# Open MySQL client
mysql -u root -p

# Create database
CREATE DATABASE trainees_accounting_system;
USE trainees_accounting_system;

# Import schema
SOURCE /path/to/database/schema.sql;
```

### 2. Install Dependencies

```bash
cd "Accounting & Registrar System"
npm install
```

### 3. Configure Environment

```bash
# Copy example to .env
cp .env.example .env

# Edit .env with your database credentials
# Default admin: admin / admin123
```

### 4. Start Server

```bash
npm start
# Server runs on http://localhost:3000
```

### 5. Access System

- **Web:** http://localhost:3000
- **Admin Login:** admin / admin123
- **Trainee Login:** Use System ID (e.g., 2024-001)

## 📱 Mobile Installation

### For Android (APK)

**Method 1: PWA Installation (No APK Required)**
1. Open system in Chrome: `http://your-server:3000`
2. Tap menu (⋮) → "Install app"
3. App installs like native Android app
4. Can be accessed from home screen

**Method 2: Build APK (Advanced)**
```bash
# Install Cordova
npm install -g cordova

# Create project
cordova create tas-app
cd tas-app

# Add Android platform
cordova platform add android

# Build APK
cordova build android

# APK location: platforms/android/build/outputs/apk/...
```

### For iOS

**Method 1: PWA Installation (Recommended)**
1. Open system in Safari: `http://your-server:3000`
2. Tap Share → "Add to Home Screen"
3. Name it "Trainees Accounting"
4. Tap "Add"
5. Opens like native iOS app

**Method 2: Build with Capacitor (Advanced)**
```bash
# Install Capacitor
npm install -g @capacitor/cli

# Initialize
npx cap init

# Add iOS
npx cap add ios

# Build web
npm run build

# Open Xcode
npx cap open ios

# Build in Xcode (Product → Archive)
```

## 📂 Project Structure

```
Accounting & Registrar System/
├── server.js                 # Main Express server
├── package.json             # Dependencies
├── .env.example             # Configuration template
│
├── config/
│   └── database.js          # MySQL connection pool
│
├── routes/
│   ├── auth.js              # Authentication (login/logout)
│   ├── admin.js             # Admin API endpoints
│   └── trainee.js           # Trainee API endpoints
│
├── public/                  # Frontend assets
│   ├── index.html           # Login page
│   ├── manifest.json        # PWA manifest
│   ├── service-worker.js    # Offline support
│   ├── admin/
│   │   └── dashboard.html   # Admin dashboard
│   ├── trainee/
│   │   └── dashboard.html   # Trainee portal
│   ├── js/
│   │   ├── admin-dashboard.js
│   │   └── trainee-dashboard.js
│   └── images/              # Icons & logos
│
├── database/
│   ├── schema.sql           # Database creation
│   └── sample_data.sql      # Sample data (optional)
│
└── uploads/                 # User uploaded files
    └── (auto-generated)
```

## 🔐 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Trainee | 2024-001 | 2024-001 |

⚠️ **IMPORTANT:** Change admin password after first login in production!

## 📊 Database Schema

### Main Tables
- **admin_users** - System administrators
- **trainees** - Student/trainee records
- **soa_templates** - SOA template definitions
- **soa_template_items** - Template line items
- **statements_of_account** - Generated SOAs
- **soa_line_items** - SOA line details
- **requests** - Student requests
- **request_attachments** - File uploads
- **request_comments** - Admin responses
- **transactions** - Payment records
- **activity_logs** - User activity tracking
- **audit_trails** - Data change history

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/login              - User login
POST   /api/auth/logout             - User logout
GET    /api/auth/session            - Get session info
POST   /api/auth/change-password    - Change password
```

### Admin Operations
```
GET    /api/admin/trainees          - List students
POST   /api/admin/trainees          - Create student
PUT    /api/admin/trainees/:id      - Update student
DELETE /api/admin/trainees/:id      - Delete student

GET    /api/admin/soa-templates     - List templates
POST   /api/admin/soa-templates     - Create template

POST   /api/admin/soa               - Create SOA
GET    /api/admin/soa/:id           - Get SOA details
PUT    /api/admin/soa/:id           - Update SOA
GET    /api/admin/soa/:id/pdf       - Download SOA PDF

GET    /api/admin/requests          - List requests
POST   /api/admin/requests          - Create request
PUT    /api/admin/requests/:id      - Update request
POST   /api/admin/requests/:id/upload - Upload file
POST   /api/admin/requests/:id/comments - Add comment
```

### Trainee Operations
```
GET    /api/trainee/dashboard       - Dashboard data
GET    /api/trainee/soa             - List SOAs
GET    /api/trainee/soa/:id         - SOA details
GET    /api/trainee/soa/:id/download - Download PDF

GET    /api/trainee/requests        - List requests
POST   /api/trainee/requests        - Create request
GET    /api/trainee/requests/:id    - Request details
```

## 🔄 User Workflows

### Admin Workflow
1. Login with admin credentials
2. Add students (System ID, Name, Contact, Course, Schedule, Date Started)
3. Create/manage SOA templates with custom line items
4. Generate SOAs for students with specific amounts
5. Monitor requests from trainees
6. Upload files and add comments to requests
7. View dashboard with statistics

### Trainee Workflow
1. Login with System ID as username
2. View all issued SOAs on dashboard
3. Download SOA as PDF for printing
4. Submit requests (documents, papers, SOA copies)
5. Track request status with admin comments
6. Access offline downloads

## 🛡️ Security Features

- ✅ Password hashing with bcryptjs
- ✅ Session-based authentication
- ✅ SQL injection prevention (prepared statements)
- ✅ Admin-only operations with role checking
- ✅ Trainee can only see own data
- ✅ HTTPS ready for production
- ✅ CORS configured for secure origin
- ✅ File upload validation
- ✅ Activity logging for audits
- ✅ Input validation and sanitization

## 📖 Common Tasks

### Create a New Student
1. Go to Admin → Students
2. Click "Add Student"
3. Fill: System ID, Name, Contact, Course, Schedule, Date Started
4. Click "Save Student"

### Generate SOA
1. Go to Admin → Statements
2. Click "Create SOA"
3. Select Student and Template
4. Enter amounts for each line item
5. Set due date
6. Click "Create"

### Process Student Request
1. Go to Admin → Requests
2. Click request to open
3. Change status (Pending → In Review → Ready → Released)
4. Upload necessary files
5. Add comments visible to trainee
6. Trainee receives notification

### Download SOA as Trainee
1. Login as trainee
2. View SOA card
3. Click "PDF" button
4. File automatically downloads

## 🐛 Troubleshooting

### Database Connection Error
```
Solution: Check .env file has correct credentials
mysql -u root -p
SHOW DATABASES;
USE trainees_accounting_system;
```

### Port Already in Use
```
Solution: Change PORT in .env or kill process
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Service Worker Not Updating
```
Solution: Clear cache and reinstall
Chrome DevTools → Application → Clear Storage → Unregister Service Workers
Then refresh page
```

### Can't Download PDF
```
Solution: Check uploads directory permissions
chmod -R 755 uploads/
Ensure PUBLIC_PATH is correct in config
```

## 🚢 Production Deployment

### 1. Prepare Server
```bash
# Install Node.js 14+
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt-get install mysql-server

# Install PM2 (process manager)
npm install -g pm2
```

### 2. Configure System
```bash
# Create database
mysql -u root -p < database/schema.sql

# Update .env with production values
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_secure_password
NODE_ENV=production
SESSION_SECRET=generate_long_random_string
ADMIN_DEFAULT_PASSWORD=change_initial_password
```

### 3. Setup HTTPS
```bash
# Install Certbot for SSL
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update server.js to use HTTPS
```

### 4. Deploy with PM2
```bash
pm2 start server.js --name "trainees-accounting"
pm2 startup
pm2 save
pm2 logs trainees-accounting
```

### 5. Setup Nginx Reverse Proxy
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📌 Best Practices

### Security
- [ ] Change default admin password immediately
- [ ] Use strong, unique SESSION_SECRET
- [ ] Run on HTTPS only in production
- [ ] Regular database backups
- [ ] Monitor access logs
- [ ] Keep Node.js and dependencies updated

### Maintenance
- [ ] Weekly: Check error logs
- [ ] Monthly: Database optimization
- [ ] Quarterly: Review user access and permissions
- [ ] Annual: Security audit and updates

### Performance
- [ ] Enable gzip compression
- [ ] Use CDN for static assets
- [ ] Cache database queries
- [ ] Optimize images
- [ ] Monitor server resources

## 📞 Support & Documentation

- **API Docs:** See API_DOCUMENTATION.md
- **Database:** See schema.sql comments
- **Installation:** See INSTALLATION.md
- **FAQs:** See FAQ.md

## 📄 License

This system is built for CHPCEBU Training Center.

---

## 🎉 What's Included

- ✅ Complete source code (Node.js + Frontend)
- ✅ MySQL database schema
- ✅ Professional Bootstrap UI
- ✅ PDF generation
- ✅ File upload system
- ✅ PWA support (works offline)
- ✅ Service worker (caching)
- ✅ Responsive design (mobile-first)
- ✅ Admin & trainee portals
- ✅ Full API endpoints
- ✅ Activity logging
- ✅ This comprehensive documentation

---

**Ready to use. Production tested. Fully documented.**
