# 🚨 Railway Deployment Fix - Follow These Steps NOW

## The Problem
Railway can't find `/app/backend/package.json` because it's looking in the wrong directory.

## ✅ The Solution (3 Steps)

### Step 1: Set Root Directory in Railway

1. Go to [Railway Dashboard](https://railway.app)
2. Open your **VerdictPath** project
3. Click on your **Backend** service (the one that's crashing)
4. Click the **"Settings"** tab at the top
5. Scroll down to find **"Root Directory"** field
6. **Enter exactly:** `backend`
7. Click **"Save"**

### Step 2: Clear Build/Start Commands (Important!)

While still in Settings:

1. Find **"Build Command"** field
2. **DELETE everything** - leave it **EMPTY**
3. Find **"Start Command"** field  
4. **DELETE everything** - leave it **EMPTY**
5. Click **"Save"**

**Why?** The config files (`nixpacks.toml`, `railway.json`) will handle this automatically.

### Step 3: Redeploy

**Option A: Quick Redeploy**
1. Go to **"Deployments"** tab
2. Find the latest deployment
3. Click the **"..."** menu (three dots)
4. Click **"Redeploy"**

**Option B: Force Fresh Deploy**
1. Go to **Settings** tab
2. Scroll to **"Source"** section
3. Click **"Disconnect"**
4. Click **"Connect Repo"**
5. Select your repository
6. Railway will start deploying automatically

---

## ✅ What Should Happen

After redeploying, you should see in the logs:

```
✓ Installing dependencies...
✓ npm ci
✓ added X packages
✓ Starting application...
✓ npm start
✓ VerdictPath Backend Server running on port XXXX
```

---

## 🧪 Test Your Deployment

Once deployment shows "Success":

```bash
curl https://verdictpath.up.railway.app/api/diagnostic/health
```

You should get a JSON response like:
```json
{"status":"ok","message":"Server is running"}
```

---

## 📝 What I Fixed

I've updated these configuration files to work with Root Directory = `backend`:

- ✅ `nixpacks.toml` - Now uses `npm ci` and `npm start` (no `--prefix`)
- ✅ `railway.json` - Now uses `npm start` (no `--prefix`)
- ✅ `railway.toml` - Now uses `npm start` (no `--prefix`)
- ✅ `Procfile` - Now uses `npm start` (no `--prefix`)

All these files now assume Railway's Root Directory is set to `backend`, so they run commands directly without needing `--prefix backend`.

---

## ❌ If It Still Doesn't Work

Check the Railway logs and look for:

**"Cannot find module 'express'"**
- Root Directory might not be saved correctly
- Solution: Go back to Settings, verify Root Directory = `backend`, save again

**"No such file or directory"**
- Root Directory is not set
- Solution: Set Root Directory to `backend` in Settings

**"Error: listen EADDRINUSE"**
- Port conflict (rare)
- Solution: Check that `backend/server.js` uses `process.env.PORT`

---

## 🎯 Why This Works

**Before (Broken):**
```
Railway root: /
├── package.json (Expo - wrong!)
├── backend/
│   └── package.json (Express - correct!)
└── Railway looks for: /app/backend/package.json ❌
```

**After (Fixed):**
```
Railway root: /backend (set in Settings)
├── package.json (Express - correct!)
└── server.js
Railway looks for: /app/package.json ✅
```

---

**Next Steps:** After deployment succeeds, commit these config file changes to Git so they're saved for future deployments.

