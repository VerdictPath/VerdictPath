# Verdict Path - Railway Deployment Guide

## 🏗️ Project Architecture

Verdict Path is a **monorepo** with two main components:

```
verdict-path/
├── backend/               # Node.js/Express API (DEPLOY THIS)
│   ├── server.js         # Main server file
│   ├── routes/           # API routes
│   ├── public/app/       # Pre-built Expo frontend (static files)
│   ├── views/            # EJS templates for web portal
│   └── package.json      # Backend dependencies
├── src/                  # React Native source (NOT deployed)
├── App.js                # React Native entry point (NOT deployed)
├── package.json          # Root package.json (Expo dependencies)
└── railway.toml          # Railway configuration
```

## 📦 What Gets Deployed to Railway

**✅ Backend Only** (`/backend` directory):
- Node.js/Express API server
- Pre-built Expo web app (static files in `backend/public/app/`)
- PostgreSQL database connection
- EJS web portal for law firms

**❌ NOT Deployed**:
- Root-level React Native source code
- Expo development files
- node_modules at root level

---

## 🚀 Railway Deployment Steps

### Step 1: Prepare Your Repository

1. **Build the frontend** (if not already built):
   ```bash
   npx expo export --platform web --output-dir backend/public/app
   ```

2. **Verify the build exists**:
   ```bash
   ls backend/public/app/
   # Should show: index.html, _expo/, assets/, metadata.json
   ```

3. **Commit everything to Git**:
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

### Step 2: Create Railway Project

1. Go to [Railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `verdict-path` repository
5. Railway will create a service

### Step 3: Configure Root Directory

**CRITICAL**: Railway must know to deploy ONLY the backend directory.

1. Click on your service
2. Go to **Settings**
3. Find **"Root Directory"** setting
4. Set it to: `backend`
5. Click **"Save"**

### Step 4: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will automatically:
   - Create a database
   - Set `DATABASE_URL` environment variable
   - Link it to your service

### Step 5: Set Environment Variables

Your service needs these environment variables (Railway auto-sets most):

**Auto-set by Railway**:
- ✅ `PORT` - Railway sets this automatically
- ✅ `DATABASE_URL` - Set when you add PostgreSQL
- ✅ `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` - From PostgreSQL addon

**You must add manually**:
1. Go to your service **Variables** tab
2. Add `ENCRYPTION_KEY`:
   ```
   ENCRYPTION_KEY=your-32-character-encryption-key-here
   ```
   *(Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)

### Step 6: Deploy!

Railway will automatically deploy when you:
- Push to GitHub
- Change environment variables
- Manually click **"Deploy"**

**First deployment**:
1. Click **"Deployments"** tab
2. Click **"Deploy"** button
3. Watch the build logs

### Step 7: Initialize Database

After first successful deployment:

1. Get your deployment URL (e.g., `https://your-app.railway.app`)
2. The database tables will be created automatically on first API request
3. Test the API: `https://your-app.railway.app/api/auth/register`

---

## 🔍 Verifying Deployment

### Check 1: Service is Running
```bash
curl https://your-app.railway.app/
# Should return the Expo web app HTML
```

### Check 2: API Works
```bash
curl https://your-app.railway.app/api/diagnostic/health
# Should return: {"status":"healthy"}
```

### Check 3: Database Connected
```bash
curl https://your-app.railway.app/api/diagnostic/test-db
# Should return database connection status
```

### Check 4: Frontend Loads
Open `https://your-app.railway.app/` in browser
- Should show Verdict Path onboarding slides
- Check browser console for errors

---

## 📁 Important Files Explained

### `railway.toml`
Tells Railway how to build and deploy:
```toml
[build]
builder = "NIXPACKS"  # Use Nixpacks (handles Node.js automatically)

[deploy]
startCommand = "node server.js"  # Start the backend server
```

### `nixpacks.toml`
Tells Nixpacks how to install and start:
```toml
[phases.install]
cmds = ["npm ci --prefix backend"]  # Install in backend/ directory

[start]
cmd = "npm start --prefix backend"  # Start from backend/ directory
```

### `Procfile`
Alternative start command (Railway reads this too):
```
web: npm start --prefix backend
```

---

## 🐛 Troubleshooting

### Issue: "Application failed to respond"
**Solution**: Check that `backend/server.js` uses `process.env.PORT`:
```javascript
const PORT = process.env.PORT || 5000;
```

### Issue: "Cannot find module"
**Solution**: Make sure `backend/package.json` has all dependencies:
```bash
cd backend
npm install
```

### Issue: "Database connection failed"
**Solution**: 
1. Verify PostgreSQL addon is added to project
2. Check `DATABASE_URL` is set in Variables
3. Check server logs for connection errors

### Issue: "Frontend shows blank page"
**Solution**:
1. Verify `backend/public/app/` exists and has files
2. Rebuild frontend: `npx expo export --platform web --output-dir backend/public/app`
3. Commit and push the built files

### Issue: "Root directory not working"
**Solution**:
1. Go to Service Settings
2. Set **Root Directory** to `backend`
3. Redeploy

---

## 🔄 Updating Your Deployment

### Update Backend Code
```bash
# Make changes to backend files
git add backend/
git commit -m "Update backend"
git push origin main
# Railway auto-deploys
```

### Update Frontend
```bash
# Make changes to React Native source (src/, App.js, etc.)
npx expo export --platform web --output-dir backend/public/app
git add backend/public/app/
git commit -m "Update frontend"
git push origin main
# Railway auto-deploys
```

### Update Environment Variables
1. Go to Railway project
2. Click service → Variables
3. Add/edit variables
4. Railway auto-redeploys

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] `ENCRYPTION_KEY` is set (32+ characters)
- [ ] `DATABASE_URL` is using Railway PostgreSQL (not local)
- [ ] No `.env` files are committed to Git
- [ ] `backend/uploads/` is in `.gitignore` (PHI data)
- [ ] CORS is configured for your domain
- [ ] HIPAA compliance measures are active

---

## 📊 Monitoring

### View Logs
1. Go to Railway project
2. Click service
3. Click **"Logs"** tab
4. Real-time logs appear here

### Metrics
1. Click **"Metrics"** tab
2. See CPU, Memory, Network usage

### Database
1. Click PostgreSQL service
2. Click **"Data"** tab to browse tables
3. Or connect with PostgreSQL client using provided credentials

---

## 🎯 Production Checklist

Before going live:

- [ ] All features tested on Railway staging deployment
- [ ] Database migrations completed successfully
- [ ] Environment variables set correctly
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (Railway provides this)
- [ ] Monitoring and alerts configured
- [ ] Backup strategy in place
- [ ] HIPAA compliance verified

---

## 📞 Need Help?

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Project Issues**: Check your service logs first

---

## 🔧 Railway Dashboard Quick Settings

**Critical Settings to Verify**:

1. **Root Directory**: `backend`
2. **Start Command**: Auto-detected from `railway.toml`
3. **Build Command**: Auto-detected (npm install)
4. **Environment**: Production
5. **Region**: Choose closest to your users

**Railway automatically handles**:
- Port binding (via `PORT` env var)
- SSL certificates
- Load balancing
- Auto-restarts on crashes
- Zero-downtime deploys

---

## 📝 Summary

```bash
# Quick Deploy Commands
npx expo export --platform web --output-dir backend/public/app  # Build frontend
git add .                                                        # Stage changes
git commit -m "Deploy to Railway"                                # Commit
git push origin main                                             # Push to Git
# Railway auto-deploys!
```

**Remember**: 
- Railway deploys the `backend/` directory only
- Set Root Directory to `backend` in Railway settings
- Frontend is pre-built and served as static files from `backend/public/app/`
- Database is managed by Railway PostgreSQL addon
