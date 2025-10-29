# Manual Railway Fix Instructions

## The Problem
Railway is running old backend code even though the database column exists.

## Quick Fix: Force Railway to Get Latest Code

### Method 1: Reconnect GitHub (EASIEST - 2 minutes)

1. **Railway Dashboard** → Your **Backend Service** (NOT PostgreSQL)
2. **Settings** tab (left sidebar)
3. Find **"Source"** or **"GitHub Connection"** section
4. Click **"Disconnect"** or **"Remove GitHub Connection"**
5. Confirm disconnection
6. Click **"Connect GitHub"** or **"Add Repository"**
7. Select: **VerdictPath/VerdictPath**
8. Branch: **main**
9. Click **"Deploy"**

Railway will pull fresh code from GitHub and redeploy (2-3 minutes).

---

### Method 2: Check Deployment Settings

1. **Railway Dashboard** → **Backend Service**
2. **Deployments** tab
3. Look at the **latest deployment**
4. Check the **"Commit SHA"** or **"Git Commit"**
5. Compare it with your latest commit: `f64dd20`
6. If they DON'T match → Railway needs to redeploy from latest commit

**Force new deployment:**
- Click **"..."** menu on deployment
- Select **"Redeploy from latest commit"**

---

### Method 3: Environment Variable Trigger

Sometimes changing an env var forces a rebuild:

1. **Settings** → **Variables**
2. Add a new variable: `FORCE_REBUILD=true`
3. Click **"Deploy"**
4. After deployment succeeds, you can remove this variable

---

### Method 4: Railway CLI (If installed locally)

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Force deployment
railway up --detach
```

---

## After Any Method: Test the Fix

1. Wait 2-3 minutes for deployment to complete
2. Go to: https://verdictpath.up.railway.app
3. Login with: `test@test.com`
4. Click "Claim Daily Bonus" → Should give coins ✅
5. Click AGAIN immediately → Should say **"Already Claimed"** ❌
6. Coins should NOT increase on second click ✅

---

## If STILL Not Working

Check that Railway is deploying the correct commit:

1. Latest commit hash should be: **f64dd20**
2. Commit message: **"Add missing database column to prevent daily reward farming"**

If Railway shows an older commit, the GitHub connection isn't working properly. Use Method 1 (Reconnect GitHub).
