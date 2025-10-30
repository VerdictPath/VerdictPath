# 🚂 Railway Deployment Guide for Verdict Path Backend

## ✅ Pre-Deployment Checklist

All Railway deployment issues have been fixed! Here's what was corrected:

### Fixed Issues:
1. ✅ **Railway config files updated** - All three config files now use correct backend directory paths
2. ✅ **Database connection optimized** - Connection pooling configured for Railway
3. ✅ **CORS properly configured** - Supports Railway domains and mobile apps
4. ✅ **Localhost references removed** - Server uses dynamic BASE_URL for self-references
5. ✅ **Backend package.json exists** - Proper start scripts configured
6. ✅ **Server listens on 0.0.0.0** - Required for Railway networking
7. ✅ **.railwayignore created** - Excludes unnecessary files from deployment

---

## 🚀 Deployment Steps

### 1. **Create Railway Account & Project**
- Go to [railway.app](https://railway.app)
- Sign up with GitHub (free trial available)
- Create a new project

### 2. **Deploy from GitHub**
- Click "Deploy from GitHub repo"
- Select your Verdict Path repository
- Railway will auto-detect Node.js and use the configured nixpacks.toml

### 3. **Add PostgreSQL Database**
- In your Railway project, click "+ New"
- Select "Database" → "Add PostgreSQL"
- Railway automatically creates a `DATABASE_URL` variable

### 4. **Configure Environment Variables**

In Railway Dashboard → Your Service → Variables tab, add:

#### Required Variables:
```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
ENCRYPTION_KEY=<your-32-character-random-key>
```

#### Optional Variables (if using JWT auth):
```
JWT_SECRET=<your-secret-key>
```

**🔐 Generate Secure Keys:**
```bash
# Generate ENCRYPTION_KEY (32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 5. **Generate Public Domain**
- Go to Service Settings → Networking
- Click "Generate Domain"
- Your API will be live at `https://your-app.up.railway.app`

### 6. **Verify Deployment**

Test your API endpoints:
```bash
# Health check
curl https://your-app.up.railway.app/api/diagnostic/health

# Check database connection
curl https://your-app.up.railway.app/api/diagnostic/db-status
```

---

## 📱 Connect Mobile App to Railway Backend

Update your Expo app's API configuration:

```javascript
// Create or update: src/config/api.js
const API_URL = __DEV__ 
  ? 'http://localhost:5000'  // Local development
  : 'https://your-app.up.railway.app';  // Railway production

export default API_URL;
```

Then use it in your API calls:
```javascript
import API_URL from '../config/api';

const response = await fetch(`${API_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

---

## 🔍 Monitoring & Debugging

### View Deployment Logs
1. Click on your service in Railway
2. Go to "Deployments" tab
3. Click on the latest deployment
4. View real-time logs

### Common Log Checks:
```
✅ "VerdictPath Backend Server running on port XXXX" - Server started
✅ "API endpoints available at..." - Routes loaded
❌ "ECONNREFUSED" - Database connection issue
❌ "MODULE_NOT_FOUND" - Missing dependencies
```

### Test Database Connection
```bash
# In Railway CLI (optional)
railway run npm run db:push
```

---

## 🐛 Troubleshooting

### Issue: "ECONNREFUSED" or Database Connection Errors
**Solution:**
- Ensure DATABASE_URL is set to `${{Postgres.DATABASE_URL}}`
- Verify PostgreSQL and Node.js service are in the **same Railway project**
- Check that database is fully provisioned (green status)

### Issue: "Port already in use"
**Solution:**
- Railway sets PORT automatically - your app reads `process.env.PORT`
- No action needed, this is handled automatically

### Issue: "Build Failed - Nixpacks unable to generate plan"
**Solution:**
- Verify `backend/package.json` exists with proper start script
- Check that `nixpacks.toml` is in the root directory
- Railway should detect Node.js automatically

### Issue: App crashes on startup
**Solution:**
- Check logs for specific error messages
- Verify all required environment variables are set
- Ensure ENCRYPTION_KEY is exactly 32 characters

### Issue: CORS errors from mobile app
**Solution:**
- Already fixed! Server now accepts requests from Railway domains
- Update your mobile app to use Railway URL (not localhost)

---

## 💰 Cost Estimate

| Resource | Free Tier | Paid |
|----------|-----------|------|
| Railway | $5 free credits/month | ~$5-10/month after trial |
| PostgreSQL | Included | Included |
| Bandwidth | 100GB/month free | $0.10/GB after |

**Estimated Cost:** $5-10/month for backend + database

---

## 📊 Database Migrations on Railway

The app uses Drizzle ORM with automatic schema push:

### Run Migrations:
```bash
# Option 1: Railway CLI (locally)
railway run npm run db:push --prefix backend

# Option 2: Add to package.json and redeploy
# Railway will run migrations automatically if configured
```

### Schema Changes Workflow:
1. Update `shared/schema.ts` or `server/storage.ts`
2. Commit and push to GitHub
3. Railway auto-deploys
4. Manually run `npm run db:push` via Railway CLI or add to build command

---

## 🔒 Security Checklist

✅ **SSL/HTTPS** - Railway provides automatic HTTPS  
✅ **Environment Variables** - Never commit secrets to Git  
✅ **Database SSL** - Enabled automatically in production  
✅ **CORS** - Configured to allow only trusted origins  
✅ **HIPAA Compliance** - Encryption key stored securely in Railway  

---

## 📚 Additional Resources

- **Railway Docs:** [docs.railway.com](https://docs.railway.com)
- **Railway CLI:** `npm i -g @railway/cli`
- **Railway Support:** [railway.com/discord](https://railway.com/discord)
- **PostgreSQL Guide:** [docs.railway.com/guides/postgresql](https://docs.railway.com/guides/postgresql)

---

## 🎉 Deployment Complete!

Your Verdict Path backend is now production-ready on Railway with:
- ✅ Auto-scaling Node.js server
- ✅ Managed PostgreSQL database
- ✅ HTTPS/SSL encryption
- ✅ Automatic deployments from GitHub
- ✅ Zero-downtime restarts
- ✅ HIPAA-compliant security

**Next Steps:**
1. Update mobile app to use Railway URL
2. Test all API endpoints
3. Set up custom domain (optional)
4. Configure automatic backups in PostgreSQL settings
