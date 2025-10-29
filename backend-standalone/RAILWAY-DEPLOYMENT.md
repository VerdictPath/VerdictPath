# 🚂 Deploy Verdict Path Backend to Railway

Complete guide to deploying your backend API to Railway production environment.

---

## Prerequisites

- ✅ GitHub repository with backend code
- ✅ Railway account (sign up at https://railway.app)
- ✅ PostgreSQL database (Railway provides this)
- ✅ Environment secrets ready (DATABASE_URL, ENCRYPTION_KEY)

---

## Quick Start (5 Minutes)

### Step 1: Push Backend to GitHub

First, create your standalone backend repository following **SETUP-INSTRUCTIONS.md**, then push to GitHub.

### Step 2: Deploy on Railway

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your **verdict-path-backend** repository
5. Railway auto-detects Node.js and deploys! ✅

### Step 3: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database" → "Add PostgreSQL"**
3. Railway creates database and adds `DATABASE_URL` automatically

### Step 4: Set Environment Variables

Click on your service → **"Variables"** tab:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | Auto-filled by Railway | ✅ Yes |
| `ENCRYPTION_KEY` | Generate with command below | ✅ Yes |
| `JWT_SECRET` | Your JWT secret | Optional (defaults to ENCRYPTION_KEY) |
| `NODE_ENV` | `production` | ✅ Yes |
| `ALLOWED_ORIGINS` | Your frontend URL(s) | Optional |
| `BASE_URL` | Your Railway domain | Auto-set |

**Generate ENCRYPTION_KEY:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and paste into Railway Variables.

### Step 5: Generate Public Domain

1. Click on your service → **"Settings"** tab
2. Scroll to **"Networking"**
3. Click **"Generate Domain"**
4. You'll get: `https://your-app.up.railway.app`

### Step 6: Test Your API

```bash
# Health check
curl https://your-app.up.railway.app/health

# Should return:
{
  "status": "ok",
  "timestamp": "2025-10-29T...",
  "environment": "production"
}
```

✅ **Your backend is live!**

---

## Detailed Configuration

### Environment Variables Reference

#### Required Variables

```env
# Database (auto-set by Railway PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:port/database

# Security
ENCRYPTION_KEY=your-32-byte-base64-key
NODE_ENV=production

# Optional but Recommended
JWT_SECRET=your-jwt-secret-key
ALLOWED_ORIGINS=https://your-frontend.com,https://app.yoursite.com
BASE_URL=https://your-app.up.railway.app
```

#### CORS Configuration

For production, set `ALLOWED_ORIGINS` to your frontend domains:

```env
# Single origin
ALLOWED_ORIGINS=https://app.verdictpath.com

# Multiple origins (comma-separated)
ALLOWED_ORIGINS=https://app.verdictpath.com,https://www.verdictpath.com
```

If not set, server allows all origins (`*`) - **not recommended for production!**

### Database Setup

#### Option 1: Railway PostgreSQL (Recommended)

Railway automatically:
- Creates PostgreSQL database
- Sets `DATABASE_URL` environment variable
- Handles backups and scaling

After database is added:
```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Login
railway login

# Run migrations
railway run npm run db:push
```

#### Option 2: External Database (Neon, Supabase, etc.)

1. Create database on external provider
2. Copy connection string
3. Add to Railway Variables as `DATABASE_URL`

### Build & Start Commands

Railway automatically detects from `package.json`:

**Build Command:** (runs once during deployment)
```json
// None needed - npm install runs automatically
```

**Start Command:** (runs to keep server alive)
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

Railway runs: `npm install` → `npm start`

---

## Railway CLI Deployment

If you prefer command-line deployment:

### Install Railway CLI

```bash
npm install -g @railway/cli
```

### Login

```bash
railway login
```

This opens browser for authentication.

### Initialize Project

```bash
cd verdict-path-backend
railway init
```

Select: **"Create new project"**

### Link to Service

```bash
railway link
```

Select your project and service.

### Add Database

```bash
railway add
```

Select **"PostgreSQL"**

### Set Variables

```bash
railway variables set ENCRYPTION_KEY="your-key-here"
railway variables set NODE_ENV="production"
```

### Deploy

```bash
railway up
```

### View Logs

```bash
railway logs
```

### Open in Browser

```bash
railway open
```

---

## Custom Domain Setup

### Add Custom Domain

1. Go to Railway project → **Settings** → **Networking**
2. Click **"Custom Domain"**
3. Enter your domain: `api.verdictpath.com`
4. Add CNAME record to your DNS:
   ```
   CNAME api.verdictpath.com → your-app.up.railway.app
   ```
5. Railway auto-provisions SSL certificate ✅

---

## Monitoring & Logs

### View Logs in Dashboard

1. Click your service in Railway
2. Go to **"Deployments"** tab
3. Click on active deployment
4. View real-time logs

### View Logs with CLI

```bash
# Tail logs
railway logs --follow

# Last 100 lines
railway logs --tail 100
```

### Health Check Endpoint

Your backend includes `/health` endpoint:

```bash
curl https://your-app.up.railway.app/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2025-10-29T12:34:56.789Z",
  "environment": "production"
}
```

---

## Troubleshooting

### Issue: Build Fails

**Solution:**
- Check Railway logs for error messages
- Verify `package.json` has `"start"` script
- Ensure all dependencies are in `dependencies` (not `devDependencies`)

### Issue: Server Won't Start

**Solution:**
- Verify `PORT` environment variable is used:
  ```javascript
  const PORT = process.env.PORT || 5000;
  ```
- Check Railway logs for startup errors
- Ensure server binds to `0.0.0.0`:
  ```javascript
  app.listen(PORT, '0.0.0.0', () => {...});
  ```

### Issue: Database Connection Fails

**Solution:**
- Verify `DATABASE_URL` is set in Railway Variables
- Check database is running in Railway
- Test connection locally:
  ```bash
  railway run node -e "console.log(process.env.DATABASE_URL)"
  ```

### Issue: CORS Errors

**Solution:**
- Add frontend URL to `ALLOWED_ORIGINS`:
  ```bash
  railway variables set ALLOWED_ORIGINS="https://your-frontend.com"
  ```
- Check CORS middleware in `server.js`

### Issue: 502 Bad Gateway

**Solution:**
- Server crashed - check logs
- Increase memory in Railway settings
- Check for uncaught exceptions

---

## Cost Optimization

### Railway Pricing (2025)

- **Pay-as-you-go:** No monthly fee, pay for usage
- **Starter Plan:** $5/month credit
- **Developer Plan:** $20/month credit

### Optimize Costs

1. **Use Autoscaling:**
   - Railway scales to zero when idle
   - Only pay for active usage

2. **Optimize Queries:**
   - Add database indexes
   - Cache frequent queries
   - Use connection pooling

3. **Monitor Usage:**
   - Check Railway dashboard for metrics
   - Set up usage alerts

---

## Production Checklist

Before going live:

### Security
- ✅ Set `NODE_ENV=production`
- ✅ Use strong `ENCRYPTION_KEY` (32+ bytes)
- ✅ Configure `ALLOWED_ORIGINS` (no `*` in production)
- ✅ Enable secure cookies (`secure: true`)
- ✅ Use HTTPS only (Railway provides free SSL)

### Database
- ✅ Run database migrations (`npm run db:push`)
- ✅ Set up automated backups (Railway provides this)
- ✅ Use connection pooling for performance

### Monitoring
- ✅ Set up error tracking (Sentry, Rollbar, etc.)
- ✅ Monitor Railway logs regularly
- ✅ Test `/health` endpoint
- ✅ Set up uptime monitoring (UptimeRobot, Pingdom)

### Performance
- ✅ Enable compression middleware
- ✅ Add rate limiting for API endpoints
- ✅ Optimize database queries
- ✅ Use CDN for static assets

### Testing
- ✅ Test all API endpoints in production
- ✅ Verify law firm portal works
- ✅ Test medical provider portal
- ✅ Verify CORS works with frontend
- ✅ Test file uploads (when enabled)

---

## CI/CD with GitHub Actions (Optional)

Automate deployments on every push:

### .github/workflows/deploy.yml

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests (if you have them)
        run: npm test
      
      - name: Deploy to Railway
        run: |
          npm i -g @railway/cli
          railway link ${{ secrets.RAILWAY_PROJECT_ID }}
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**Setup:**
1. Get Railway token: `railway whoami --token`
2. Add to GitHub Secrets:
   - `RAILWAY_TOKEN` - Your Railway token
   - `RAILWAY_PROJECT_ID` - Your project ID

---

## Next Steps

After deployment:

1. ✅ **Update Frontend:**
   - Change API_URL to your Railway domain
   - Test frontend integration

2. ✅ **Set Up Monitoring:**
   - Add error tracking
   - Set up uptime checks
   - Configure alerts

3. ✅ **Performance Testing:**
   - Load test with Artillery or K6
   - Monitor response times
   - Optimize slow endpoints

4. ✅ **Documentation:**
   - Update API documentation
   - Document deployment process
   - Create runbooks for common issues

---

## Support

- **Railway Docs:** https://docs.railway.com
- **Railway Discord:** https://discord.gg/railway
- **Railway Status:** https://status.railway.app

---

**Your backend is now deployed to production! 🚂🎉**
