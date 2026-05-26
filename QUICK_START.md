# ⚡ QUICK START GUIDE (5 Minutes)

**Get the system running immediately**

---

## 1️⃣ Open Terminal/Command Prompt

```bash
cd "C:\xampp\htdocs\Accounting & Registrar System"
```

## 2️⃣ Install Dependencies

```bash
npm install
```

## 3️⃣ Create Database

**Option A (Recommended):**
```bash
mysql -u root -p trainees_accounting_system < database/schema.sql
```

**Option B:**
```bash
mysql -u root -p
# Enter password (default: empty, just press Enter)

CREATE DATABASE IF NOT EXISTS trainees_accounting_system;
USE trainees_accounting_system;
SOURCE C:/xampp/htdocs/Accounting\ &\ Registrar\ System/database/schema.sql;
EXIT;
```

## 4️⃣ Configure Settings

```bash
# Copy configuration file
cp .env.example .env

# Edit .env (optional, defaults work)
# Update DB_HOST, DB_USER, etc. if needed
```

## 5️⃣ Start Server

```bash
npm start
```

You should see:
```
✓ Database connection successful
╔════════════════════════════════════════╗
║  Trainees Accounting System Server    ║
║  Running on: http://localhost:3000    ║
║  Environment: development             ║
║  Database: trainees_accounting_system ║
╚════════════════════════════════════════╝
```

## 6️⃣ Open in Browser

```
http://localhost:3000
```

## 7️⃣ Login

**Admin:**
- Username: `admin`
- Password: `admin123`

**Trainee:**
- Username: `2024-001` (System ID)
- Password: `2024-001`

---

## ✅ You're Done!

The system is now running. Explore the features:

- **Admin:** Add students, create SOAs, manage requests
- **Trainee:** View SOAs, download as PDF, submit requests

---

## 📱 Mobile Access

On any device on the same network:

1. Get your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Open: `http://YOUR_IP:3000`
3. Tap menu → "Install app" → Add to home screen

---

## 🆘 Having Issues?

1. **Database won't connect:** Start MySQL service
2. **Port already in use:** Change PORT in .env to 3001
3. **npm install fails:** Try `npm cache clean --force`
4. **More help:** See INSTALLATION.md or README.md

---

**Enjoy your new system!** 🎉
