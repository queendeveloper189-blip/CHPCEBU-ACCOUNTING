# ⚡ Quick Deployment to Render.com (5 Steps)

## 🎯 Your Live App Will Be At: 
```
https://trainees-accounting-system.onrender.com
(or your custom domain)
```

## ✅ Step 1: Create GitHub Repository

```bash
# Navigate to your project
cd "c:\xampp\htdocs\Accounting & Registrar System"

# Initialize git
git init
git add .
git commit -m "Initial commit - Trainees Accounting System"
git branch -M main

# Create repo on GitHub.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/trainees-accounting.git
git push -u origin main
```

## ✅ Step 2: Visit Render.com

1. Go to https://render.com
2. Click **Sign up with GitHub**
3. Authorize Render
4. Go to Dashboard

## ✅ Step 3: Create Web Service

1. Click **New +** → **Web Service**
2. Select your GitHub repo: `trainees-accounting`
3. Configure:
   - **Name**: `trainees-accounting-system`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (recommended for testing)

## ✅ Step 4: Create MySQL Database

1. Click **New +** → **MySQL Database**
2. Set:
   - **Name**: `trainees_db`
   - **Plan**: Free
3. Copy these credentials to Web Service environment:
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_PORT`

## ✅ Step 5: Run Database Schema

After MySQL starts:
1. Use MySQL client to connect with provided credentials
2. Run SQL from `database/schema.sql`
3. Or use: `node scripts/create-announcements-table.js`

---

## 🎉 Done!

Your app is live! Visit your deployment URL to test.

### Login Credentials
- **Admin**: `admin` / `admin123`
- **Trainees**: Use their system ID

---

## 📱 For Mobile Access

Your app is PWA-enabled and works on mobile!

1. Open the URL on mobile
2. Add to home screen
3. Works offline!

---

## 🔄 Auto-Deploy Setup

Every time you push to GitHub, it auto-deploys:

```bash
# Make changes
git add .
git commit -m "your message"
git push origin main

# Render will automatically deploy!
```

---

## 💡 Tips

- Free tier spins down after 15 min - first request takes ~30s to wake up
- For production, upgrade to **Starter Plan** ($10/month)
- File uploads persist best with cloud storage (S3, Cloudinary)
- All data syncs live between admin and trainees

---

See `DEPLOYMENT_GUIDE.md` for detailed troubleshooting and advanced options.
