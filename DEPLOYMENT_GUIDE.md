# 🚀 Deployment Guide - Render.com

## Step 1: Prepare Your Repository

### 1.1 Create a `.gitignore` file (if not exists)
Make sure these are ignored:
```
node_modules/
.env
uploads/
.DS_Store
```

### 1.2 Ensure your `package.json` has the correct start script
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

## Step 2: Push to GitHub

1. Create a GitHub repository
2. Initialize git in your project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/your-repo.git
   git push -u origin main
   ```

## Step 3: Deploy to Render.com

### 3.1 Go to Render.com
- Visit https://render.com
- Sign up with GitHub account
- Click "Dashboard"

### 3.2 Create a New Web Service
1. Click **"New +"** button
2. Select **"Web Service"**
3. Connect your GitHub repository
4. Authorize Render to access GitHub

### 3.3 Configure the Web Service
- **Name**: `trainees-accounting-system`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free (or Starter if free depletes)

### 3.4 Add Environment Variables
Click **"Advanced"** and add these variables:

```
NODE_ENV = production
SESSION_SECRET = [generate a random string or let Render generate]
DB_HOST = [will be provided by Render MySQL]
DB_USER = [will be set up with database]
DB_PASSWORD = [will be set up with database]
DB_NAME = trainees_accounting_system
DB_PORT = 3306
PORT = 3000
```

### 3.5 Create MySQL Database
1. In Render Dashboard, click **"New +"** → **"MySQL Database"**
2. Set database name: `trainees_db`
3. Copy the connection details into your environment variables
4. Note the external database URL

### 3.6 Run Database Schema
After MySQL is created:
1. Connect to your database using the provided URL
2. Run the SQL from `database/schema.sql`
3. Or run the migration scripts

### 3.7 Deploy
- Click **"Create Web Service"**
- Render will automatically deploy your app
- Your app will be available at: `https://trainees-accounting-system.onrender.com`

## Step 4: After Deployment

### 4.1 Your Live URLs
- **Admin Access**: `https://trainees-accounting-system.onrender.com/` → Login as admin
- **Trainee Access**: `https://trainees-accounting-system.onrender.com/` → Login as trainee
- **API Endpoints**: `https://trainees-accounting-system.onrender.com/api/`

### 4.2 Test the System
1. Open the deployed URL
2. Login with admin credentials: `admin` / `admin123`
3. Create an announcement
4. Logout and login as trainee to test

### 4.3 Enable Auto-Deploy
- Go to **Settings** → **Auto-Deploy**
- Select **"Yes"** for auto-deploy on Git push
- Now every time you push to GitHub, it auto-deploys!

## Step 5: Custom Domain (Optional)

If you have a custom domain:
1. Go to **Settings** → **Custom Domains**
2. Add your domain
3. Follow DNS setup instructions

## 📌 Important Notes

- **Free Tier Limits**: 
  - Spins down after 15 minutes of inactivity (startup takes ~30s)
  - 0.5 GB RAM
  - Perfect for development/testing
  
- **Upgrade When Needed**:
  - Use **Starter Plan** ($10/month) for always-on service
  
- **Database Backups**:
  - Set up backups in MySQL database settings
  
- **File Uploads**:
  - Render doesn't persist files between deploys
  - Consider using cloud storage (AWS S3, Cloudinary) for uploads

## 🔐 Security Checklist

- [ ] Change `SESSION_SECRET` to a strong random value
- [ ] Use HTTPS (automatic on Render)
- [ ] Set strong database passwords
- [ ] Don't commit `.env` file
- [ ] Review database credentials regularly

## ⚠️ Troubleshooting

### Build Failed?
- Check logs: Dashboard → Web Service → Logs
- Ensure `npm install` works locally first
- Check for missing dependencies in `package.json`

### Database Connection Error?
- Verify all DB credentials in environment variables
- Check if MySQL database is running
- Verify schema was created

### Slow Performance?
- Free tier may be slower - consider upgrade
- Check server logs for errors
- Review database queries

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Node.js Hosting**: https://render.com/docs/deploy-node-express-app
- **MySQL on Render**: https://render.com/docs/mysql

---

**Your deployment link will be**: `https://trainees-accounting-system.onrender.com` (or custom URL if configured)
