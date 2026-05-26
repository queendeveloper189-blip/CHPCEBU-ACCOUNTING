# 🚀 INSTALLATION & SETUP GUIDE

**Complete Step-by-Step Installation Instructions**

---

## ⏱️ Estimated Time: 15 minutes

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] Node.js 14+ installed
- [ ] npm package manager
- [ ] MySQL Server 5.7+
- [ ] Text editor or IDE
- [ ] Internet connection
- [ ] Administrator access to your server

## 🔍 System Check

### Check Node.js Installation
```bash
node --version
# Should show v14.0.0 or higher

npm --version
# Should show 6.0.0 or higher
```

**Not installed?**
- Download from: https://nodejs.org/
- Choose LTS version
- Install and restart terminal

### Check MySQL Installation
```bash
mysql --version
# Should show mysql Ver 5.7+ 

# Start MySQL service
# Windows: Open Services and start MySQL
# Mac: brew services start mysql
# Linux: sudo systemctl start mysql
```

**Not installed?**
- Windows: Download MySQL Installer
- Mac: `brew install mysql`
- Linux: `sudo apt-get install mysql-server`

---

## 📥 Step 1: Download Project Files

```bash
# Navigate to xampp htdocs
cd C:\xampp\htdocs

# OR on Mac/Linux
cd /Applications/XAMPP/htdocs

# Verify files are there
dir "Accounting & Registrar System"
```

---

## 📦 Step 2: Install Node.js Dependencies

```bash
# Navigate to project
cd "Accounting & Registrar System"

# Install all required packages
npm install

# Wait for completion (takes 1-2 minutes)
# You should see: added XXX packages
```

**Troubleshooting npm install:**
```bash
# Clear npm cache if errors
npm cache clean --force

# Install again
npm install

# Or use yarn
npm install -g yarn
yarn install
```

---

## 🗄️ Step 3: Create Database

### Option A: Using MySQL Command Line (Recommended)

```bash
# Open MySQL as root
mysql -u root -p

# Will ask for password (default: empty, just press Enter)
```

```sql
-- Create database
CREATE DATABASE trainees_accounting_system;

-- Use the database
USE trainees_accounting_system;

-- Import the schema
SOURCE C:/xampp/htdocs/Accounting\ &\ Registrar\ System/database/schema.sql;

-- Verify tables created
SHOW TABLES;

-- Exit MySQL
EXIT;
```

### Option B: Using MySQL Workbench

1. Open MySQL Workbench
2. Click "+" to create new connection
3. Connection name: "Local"
4. Test connection
5. Open query editor
6. Open: `database/schema.sql`
7. Execute (Ctrl+Shift+Enter)

### Option C: Using Import File

```bash
cd "Accounting & Registrar System"

# Import schema
mysql -u root -p trainees_accounting_system < database/schema.sql
```

**Verify Database Created:**
```bash
mysql -u root -p -e "SHOW DATABASES;"
# Should list: trainees_accounting_system
```

---

## ⚙️ Step 4: Configure Environment

```bash
cd "Accounting & Registrar System"

# Copy example file
cp .env.example .env

# On Windows
copy .env.example .env
```

**Edit .env file:**

Open with text editor and update:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=             # Leave empty if no password set
DB_NAME=trainees_accounting_system
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=development
HOST=0.0.0.0

# Session Configuration
SESSION_SECRET=my_super_secret_key_12345
ADMIN_DEFAULT_PASSWORD=admin123

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

**For Production:**
```env
NODE_ENV=production
SESSION_SECRET=generate_very_long_random_string_here
ADMIN_DEFAULT_PASSWORD=change_this_immediately
```

---

## 🚀 Step 5: Start the Server

```bash
cd "Accounting & Registrar System"

# Start development server
npm start

# You should see:
# ╔════════════════════════════════════════╗
# ║  Trainees Accounting System Server    ║
# ║  Running on: http://localhost:3000    ║
# ║  Environment: development             ║
# ║  Database: trainees_accounting_system ║
# ╚════════════════════════════════════════╝
```

**Server won't start?**

Check port conflicts:
```bash
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000

# Kill process using port 3000
# Windows: taskkill /PID <PID> /F
# Mac/Linux: kill -9 <PID>
```

---

## 🌐 Step 6: Access the System

### In Browser

Open your web browser and go to:
```
http://localhost:3000
```

You should see the login screen.

---

## 🔓 Step 7: First Login

### Admin Login
```
Username: admin
Password: admin123
```

### Trainee Login
Use System ID from database:
```
Username: 2024-001
Password: 2024-001
```

---

## ✅ Step 8: Verify Installation

### Check functionality:

- [ ] Login page loads
- [ ] Admin login works
- [ ] Admin dashboard shows (with statistics)
- [ ] Can navigate to Students page
- [ ] Can navigate to Statements
- [ ] Can navigate to Requests
- [ ] Logout works

### Add a test student:

1. Go to Admin → Students
2. Click "Add Student"
3. Fill form:
   - System ID: `TEST-001`
   - First Name: `Test`
   - Last Name: `User`
   - Contact: `09171234567`
   - Course: `Healthcare Services NCII`
   - Schedule: `DAY`
   - Date Started: `2024-01-01`
4. Click Save
5. Refresh Students page - should see new student

---

## 🗂️ File Permissions (Linux/Mac)

If you get permission denied errors:

```bash
# Make uploads directory writable
chmod -R 755 uploads

# Make database directory writable
chmod -R 755 database

# Run as user (not sudo)
npm start
```

---

## 🔐 Security Setup (Production)

### 1. Change Admin Password

```bash
# After first admin login, go to:
# Admin Dashboard → Settings → Change Password

# Old: admin123
# New: Use strong password with:
#   - 12+ characters
#   - Mix of upper/lowercase
#   - Numbers and symbols
```

### 2. Generate Session Secret

```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows
# Use online generator: https://www.uuidgenerator.net/
# Copy output to .env SESSION_SECRET
```

### 3. Setup Database User Password

```bash
# Login to MySQL
mysql -u root -p

# Create database user
CREATE USER 'trainees_user'@'localhost' IDENTIFIED BY 'SecurePassword123!';

# Grant permissions
GRANT ALL PRIVILEGES ON trainees_accounting_system.* TO 'trainees_user'@'localhost';
FLUSH PRIVILEGES;

# Update .env
DB_USER=trainees_user
DB_PASSWORD=SecurePassword123!
```

---

## 📱 Setup for Mobile (PWA)

### Test on Phone

1. Get server IP address:
   ```bash
   # Windows: ipconfig | findstr IPv4
   # Mac/Linux: ifconfig | grep inet
   # Example: 192.168.1.100
   ```

2. On phone, open:
   ```
   http://192.168.1.100:3000
   ```

3. Tap menu → "Install app"
4. Icon appears on home screen
5. Click to launch like native app

### Build APK (Advanced)

```bash
# Install Cordova
npm install -g cordova

# Create app
cordova create trainees-app
cd trainees-app
cordova platform add android

# Copy public folder to www
cp -r ../public/* www/

# Build
cordova build android

# APK file: platforms/android/build/outputs/apk/debug/app-debug.apk
```

### Build for iOS (Advanced)

```bash
# Install Capacitor
npm install -g @capacitor/cli

# Initialize
npx cap init

# Add iOS
npx cap add ios

# Copy public folder
npx cap copy

# Open Xcode
npx cap open ios

# Build in Xcode (Product → Archive → Distribute App)
```

---

## 🐛 Troubleshooting

### "Cannot find module 'express'"
```bash
# Solution: npm not run in correct directory
cd "Accounting & Registrar System"
npm install
```

### "connect ECONNREFUSED 127.0.0.1:3306"
```bash
# Solution: MySQL not running
# Windows: Open Services and start MySQL
# Mac: brew services start mysql
# Linux: sudo systemctl start mysql

# Verify MySQL is running
mysql -u root -p -e "SELECT 1"
```

### "Error: listen EADDRINUSE"
```bash
# Solution: Port already in use
# Change PORT in .env to 3001 or higher
# Or kill process on port 3000
```

### "PROTOCOL_ERROR: Auth switch requested"
```bash
# Solution: MySQL auth plugin mismatch
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
FLUSH PRIVILEGES;
```

### "No tables found"
```bash
# Solution: Database exists but schema not imported
mysql -u root -p trainees_accounting_system
SOURCE database/schema.sql;
SHOW TABLES;
```

### "PDF download not working"
```bash
# Solution: Check uploads directory exists and is writable
mkdir -p uploads
chmod -R 755 uploads

# Restart server
npm start
```

---

## 📊 Sample Data (Optional)

The database schema includes sample students (2024-001, 2024-002, 2024-003).

To add more sample data:
```bash
# Edit and import sample_data.sql (if exists)
mysql -u root -p trainees_accounting_system < database/sample_data.sql

# Or add via admin panel
# Go to Admin → Students → Add Student
```

---

## 🔄 Daily Operations

### Start Server
```bash
cd "Accounting & Registrar System"
npm start
```

### Stop Server
```bash
# Press Ctrl+C in terminal
# Or kill the process:
# Windows: taskkill /F /IM node.exe
# Mac/Linux: pkill node
```

### View Logs
```bash
# Logs appear in terminal where server started
# Or check error logs in database
```

### Backup Database
```bash
mysqldump -u root -p trainees_accounting_system > backup-$(date +%Y%m%d).sql
```

### Restore Database
```bash
mysql -u root -p trainees_accounting_system < backup-20240101.sql
```

---

## 🎓 Next Steps

1. **Read README.md** - Full feature documentation
2. **Set up HTTPS** - Production security
3. **Configure backups** - Automated database backups
4. **Test thoroughly** - Add students, create SOAs, test requests
5. **Train users** - Create user guide for admin and trainees
6. **Deploy to production** - See Production Deployment section in README

---

## ✨ Congratulations!

Your Trainees Accounting System is now installed and running!

**Quick Reference:**
- 🌐 Web: http://localhost:3000
- 👤 Admin: admin / admin123
- 📱 Mobile: Install as PWA
- 📖 Help: See README.md
- 🐛 Issues: Check Troubleshooting section

Need help? Check the README.md file for comprehensive documentation.
