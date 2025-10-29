# 🚀 Deployment Checklist for Railway

## Summary of Recent Changes (Not Yet Deployed)

All these changes are currently **ONLY on local Replit** and need to be deployed to Railway:

### ✅ Changes Made Today:

1. **Registration Fixes (5 bugs fixed)**
   - Added name input fields for all user types
   - Fixed paid tier registration
   - Added invite code validation feedback
   - Files: `App.js`, `src/screens/RegisterScreen.js`

2. **Law Firm Subscription Updates**
   - Changed "Free Trial" → "Free"
   - Removed "30-day trial period"
   - Updated Basic features (added Evidence Locker, Client roadmap access)
   - Updated Premium features (added "COMING SOON" labels)
   - Files: `src/constants/subscriptionPricing.js`, `src/screens/LawFirmSubscriptionScreen.js`

3. **Medical Provider Subscription Updates**
   - Changed "Free Trial" → "Free"
   - Removed "30-day trial period"
   - Updated Basic features (added Evidence Locker, Client Roadmap Access)
   - Updated Premium features (added "COMING SOON" labels)
   - Fixed patient count labels to match organizational size
   - Files: `src/constants/subscriptionPricing.js`, `src/screens/MedicalProviderSubscriptionScreen.js`

4. **Coin Farming Protection**
   - Added database column `last_daily_claim_at`
   - Backend protection against daily reward exploitation
   - Files: `backend/controllers/coinsController.js`, `backend/routes/coins.js`

---

## 🔴 CRITICAL: Changes Not Deployed to Railway

**Status:** Railway is still running code from several commits ago

**Evidence:** 
- Diagnostic endpoint returns 404 on Railway
- Test: `curl https://verdictpath.up.railway.app/api/diagnostic/daily-claim-check`
- Result: "Cannot GET /api/diagnostic/daily-claim-check" (should return JSON)

---

## 📋 Step-by-Step Deployment Process

### Option 1: Push to GitHub (Triggers Auto-Deploy) ⭐ RECOMMENDED

**If Railway is connected to your GitHub repo:**

1. **Commit all changes:**
   ```bash
   # Replit will auto-commit at session end
   # OR manually commit if needed:
   git add .
   git commit -m "Update subscriptions and fix registration bugs"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Monitor Railway Dashboard:**
   - Go to https://railway.app
   - Open your `verdictpath` project
   - Watch the "Deployments" tab
   - You should see a new deployment start automatically
   - Wait for "Success" status (usually 2-3 minutes)

4. **Verify Deployment:**
   ```bash
   # Test the diagnostic endpoint
   curl https://verdictpath.up.railway.app/api/diagnostic/daily-claim-check
   
   # Should return JSON like:
   # {"hasColumn":true,"message":"Daily claim protection is active"}
   ```

---

### Option 2: Reconnect GitHub to Force Update

**If auto-deploy isn't working:**

1. **Go to Railway Dashboard:**
   - Visit https://railway.app
   - Open your `verdictpath` project

2. **Disconnect GitHub:**
   - Click on your service (the backend/API service)
   - Go to **Settings** tab
   - Scroll to **Source** section
   - Click **Disconnect**

3. **Reconnect GitHub:**
   - Click **Connect Repo**
   - Select your GitHub repository
   - Railway will immediately start a fresh deployment

4. **Wait for Deployment:**
   - Monitor the build/deploy logs
   - Look for "Success" status
   - Usually takes 2-3 minutes

5. **Verify:**
   ```bash
   curl https://verdictpath.up.railway.app/api/diagnostic/daily-claim-check
   ```

---

### Option 3: Railway CLI Manual Deploy

**If GitHub isn't connected or you want manual control:**

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```
   - This will open a browser window
   - Authorize the CLI

3. **Link to Project:**
   ```bash
   railway link
   ```
   - Select your `verdictpath` project from the list

4. **Deploy:**
   ```bash
   railway up
   ```
   - This uploads and deploys your current code
   - Wait for completion

5. **Verify:**
   ```bash
   curl https://verdictpath.up.railway.app/api/diagnostic/daily-claim-check
   ```

---

## ✅ Post-Deployment Verification

After Railway deploys, test ALL the changes:

### 1. Test Diagnostic Endpoint
```bash
curl https://verdictpath.up.railway.app/api/diagnostic/daily-claim-check
```
**Expected:** `{"hasColumn":true,"message":"Daily claim protection is active"}`

### 2. Test Registration (in browser)
- Go to your Replit frontend
- Try registering as Individual with first/last names
- Verify names are required
- Verify paid tier registration works

### 3. Test Subscription Labels
- Navigate to Law Firm registration
- Verify Free tier shows "Free" (not "Free Trial")
- Verify Basic features show "Evidence Locker" and "Client roadmap access"
- Verify Premium features show "COMING SOON" labels

### 4. Test Medical Provider
- Navigate to Medical Provider registration
- Verify Free tier shows "Free" (not "Free Trial")
- Verify Basic features show "Evidence Locker" and "Client Roadmap Access"
- Select a practice size and verify patient counts match in Basic/Premium cards

---

## 🔍 Troubleshooting

### Railway Deployment Fails
1. Check Railway dashboard build logs
2. Look for error messages
3. Common issues:
   - Missing dependencies in `package.json`
   - Environment variables not set
   - Port configuration incorrect

### Changes Don't Appear
1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Check Railway deployment status (should be "Success")
3. Verify correct URL (Railway URL, not localhost)
4. Check Railway logs for errors

### Git Push Fails
1. Make sure you're on the right branch: `git branch`
2. Pull latest changes first: `git pull origin main`
3. Resolve any merge conflicts
4. Try push again: `git push origin main`

---

## 📊 Current Status

| Component | Location | Status |
|-----------|----------|--------|
| Source Code | Replit | ✅ All changes ready |
| Git Commits | Local | ⚠️ Will auto-commit |
| GitHub Repo | Remote | ⚠️ Needs push |
| Railway | Production | 🚨 Running old code |
| Database | Railway | ✅ Column added |

---

## 🎯 Quick Action Plan

1. ✅ **Code changes complete** (done)
2. ⏳ **Wait for auto-commit** (happens at session end)
3. 🔄 **Push to GitHub** (manually or wait for auto-push)
4. 🚀 **Railway auto-deploys** (if GitHub connected)
5. ✅ **Test deployment** (verify all changes work)

---

## 📝 Files Modified (Need Deployment)

Core changes in these files:
- `App.js` - Registration logic fixes
- `src/screens/RegisterScreen.js` - Name input fields
- `src/constants/subscriptionPricing.js` - All subscription updates
- `src/screens/LawFirmSubscriptionScreen.js` - Free tier labels
- `src/screens/MedicalProviderSubscriptionScreen.js` - Free tier labels + patient counts
- `backend/controllers/coinsController.js` - Coin farming protection
- `backend/routes/coins.js` - Diagnostic endpoint

Documentation:
- `REGISTRATION_FIXES.md`
- `BACKEND_FRONTEND_STATUS_REPORT.md`
- `RAILWAY_UPDATE_GUIDE.md`
- `DEPLOYMENT_CHECKLIST.md` (this file)

---

## 🔗 Important URLs

- Railway Dashboard: https://railway.app
- Production Backend: https://verdictpath.up.railway.app
- Diagnostic Test: https://verdictpath.up.railway.app/api/diagnostic/daily-claim-check
- GitHub Repo: (your repo URL)

---

**Last Updated:** October 29, 2025  
**Status:** Ready for deployment to Railway
