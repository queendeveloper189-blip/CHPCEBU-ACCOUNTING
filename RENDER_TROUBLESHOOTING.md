# Render Deployment Troubleshooting Guide

## Current Issue: Database Connection Refused

Your web service is running, but it can't connect to the database because **environment variables aren't being injected**.

## Problem Analysis

From the logs:
```
DB_HOST: localhost  ← Should be a Render hostname
DB_USER: root       ← Should be 'admin'
DB_PASSWORD: <not set>  ← Should have a password
```

**Root Cause:** Render's database service isn't properly linked to the web service.

## Solution: Manual Database Configuration

Follow these steps to manually configure your database on Render:

### Step 1: Check Your Database Service

1. Go to **Render Dashboard** → **Your Account** → **Services**
2. Look for service named `trainees_db` (MySQL database)
3. **If it doesn't exist:**
   - Go to your web service `trainees-accounting-system`
   - Click **"Settings"**
   - Scroll down to **"Database"** section
   - Click **"Add Database"**
   - Choose **MySQL**, name it `trainees_db`, Free Plan

4. **If it exists:**
   - Click on the `trainees_db` service
   - Copy the connection information:
     - **Host:** (e.g., `mysql-srv-xxxxx.render.com`)
     - **Port:** `3306`
     - **Username:** (e.g., `admin`)
     - **Password:** (long random string)
     - **Database:** `trainees_accounting_system`

### Step 2: Manually Set Environment Variables

1. Go to your web service: `trainees-accounting-system`
2. Click **"Settings"**
3. Scroll to **"Environment"** section
4. Click **"Add Environment Variable"** and enter:

```
DB_HOST = <your-host-from-step-1>
DB_PORT = 3306
DB_USER = <your-username-from-step-1>
DB_PASSWORD = <your-password-from-step-1>
DB_NAME = trainees_accounting_system
SESSION_SECRET = <generate-a-random-string>
NODE_ENV = production
```

5. Click **"Save Changes"**

### Step 3: Redeploy

1. Go back to your web service
2. Click **"Deploy latest commit"** or wait for auto-deploy
3. Monitor the logs for:
   ```
   ✓ Database connection successful
   ✓ Database schema initialized
   ```

### Step 4: Verify Connection

Once deployed, visit: `https://chpcebu-accounting-2.onrender.com/api/health`

Should show:
```json
{
  "status": "ok",
  "database": {
    "status": "connected"
  }
}
```

## If Still Not Working

### Check Logs

1. Render Dashboard → Your Service → **Logs**
2. Look for diagnostic output:
   ```
   DATABASE CONNECTION DIAGNOSTICS
   Environment Variables:
   - NODE_ENV: production
   - DB_HOST: [should show your database host]
   - DB_USER: [should show username]
   - DB_PASSWORD: [should show 'provided']
   ```

### Common Issues

| Error | Solution |
|-------|----------|
| `DB_HOST: localhost` | Environment variables not set. Follow **Step 2** above. |
| `ECONNREFUSED` | Database service not running. Check it's in "Running" state. |
| `ER_ACCESS_DENIED_ERROR` | Wrong username/password. Verify credentials from database service. |
| `ER_BAD_DB_ERROR` | Database name mismatch. Should be `trainees_accounting_system`. |

### Database Service Status

1. Render Dashboard → Services
2. Find `trainees_db` (MySQL service)
3. Check it shows **"Running"** (green status)
4. If not running, click it and check the Logs for errors

## Alternative: Use DATABASE_URL

If you have a connection string, you can set a single variable:

1. In Render Dashboard → Environment Variables
2. Add: `DATABASE_URL = mysql://user:password@host:3306/trainees_accounting_system`
3. The app will automatically parse this

## Need More Help?

1. Share the output from `/api/health` endpoint
2. Share the "Database Connection Diagnostics" section from logs
3. Verify the database service exists and is running

---

**Reference:** This guide addresses the issue where environment variables from Render's database service aren't automatically injected. Manual configuration is the workaround.
