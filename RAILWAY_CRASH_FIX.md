# 🚨 Railway Crash - Emergency Fix

**Status:** Railway deployment crashed and is completely offline  
**Cause:** Start command ran before dependencies were installed

---

## 🔍 What Happened

When you set the start command to `cd backend && node server.js`, Railway tried to run it immediately but:

❌ **The `backend/node_modules` folder doesn't exist on Railway**  
❌ **Railway never ran `npm install` in the backend directory**  
❌ **Server crashed because it can't find `express`, `pg`, etc.**  

Result: Railway deployment failed completely and the site is offline.

---

## ✅ The Correct Fix

Railway needs **TWO commands**, not one:

1. **Build Command** (runs first): Install dependencies
2. **Start Command** (runs second): Start server

Here's how to fix it:

---

### **Step 1: Go to Railway Dashboard**

1. Visit: https://railway.app
2. Open your `verdictpath` project
3. Click on your service

---

### **Step 2: Clear Start Command (Important!)**

1. Go to **"Settings"** tab
2. Find **"Start Command"** field
3. **DELETE** what you entered before
4. Leave it **EMPTY** for now
5. Click Save

---

### **Step 3: Set Root Directory** ⭐ BEST APPROACH

1. Still in **"Settings"** tab
2. Look for **"Root Directory"** field
3. Enter: `backend`
4. Click Save

**This tells Railway:** "Everything is in the `backend/` folder"

Now Railway will automatically:
- Find `backend/package.json`
- Run `npm install` 
- Run `npm start` (which is `node server.js`)

---

### **Step 4: Redeploy**

1. Go to **"Deployments"** tab
2. Click **"..."** menu on latest deployment
3. Click **"Redeploy"**

OR

1. Settings tab → Source section
2. Click **"Disconnect"**
3. Click **"Connect Repo"**
4. Select your repository
5. Railway immediately starts fresh deployment

---

### **Step 5: Monitor Deployment Logs**

Watch the build logs for:

✅ **Success indicators:**
```
✓ Installing dependencies...
✓ npm install
✓ added 50 packages
✓ Starting application...
✓ node server.js
✓ VerdictPath Backend Server running on port 5000
```

❌ **Failure indicators:**
```
✗ Error: Cannot find module 'express'
✗ npm ERR! missing script: start
✗ Application crashed
```

---

## 🔧 Alternative Fix (If Root Directory Doesn't Work)

If Railway doesn't have a "Root Directory" option:

### **Set Build Command:**
```
cd backend && npm install
```

### **Set Start Command:**
```
cd backend && npm start
```

**Important:** Set BOTH commands, not just start command!

---

## 🎯 Why This Works

**Correct Order:**

```
1. Railway clones your code from GitHub
2. Railway runs BUILD command: cd backend && npm install
   ↓ This creates backend/node_modules/
3. Railway runs START command: cd backend && npm start
   ↓ This runs: node server.js
4. Server finds all dependencies in node_modules/
5. Server starts successfully! ✅
```

**What Went Wrong Before:**

```
1. Railway clones your code
2. Railway skips build step (no dependencies installed)
3. Railway runs: cd backend && node server.js
4. Node tries to load 'express'
5. Error: Cannot find module 'express' ❌
6. Server crashes
```

---

## 📋 Railway Configuration Cheat Sheet

### **Option 1: Root Directory (Recommended)**
```
Root Directory: backend
Build Command: (leave empty, Railway auto-detects)
Start Command: (leave empty, uses package.json "start" script)
```

### **Option 2: Manual Commands**
```
Root Directory: (leave empty)
Build Command: cd backend && npm install
Start Command: cd backend && npm start
```

### **Option 3: Using railway.json** (Already in your repo)
Railway should auto-detect this file. If not working:
1. Make sure `railway.json` is in root directory ✅ (it is)
2. Delete any manual commands in dashboard
3. Railway will use config from `railway.json`

---

## ✅ After Railway Starts Successfully

Test immediately:

```bash
# Should return JSON (not timeout)
curl https://verdictpath.up.railway.app/api/diagnostic/daily-claim-check
```

✅ **Working:** JSON response  
❌ **Still broken:** Timeout or HTML error

---

## 🔍 If Still Crashing

Check Railway deployment logs for the exact error message:

### Common Errors:

**"Cannot find module 'express'"**
- Fix: Make sure build command runs `npm install`

**"Error: listen EADDRINUSE"**
- Fix: Server trying to use wrong port
- Check: Does `backend/server.js` read `process.env.PORT`?

**"npm ERR! missing script: start"**
- Fix: Check `backend/package.json` has `"start": "node server.js"`

**"DATABASE_URL is not defined"**
- Fix: Add database environment variable in Railway "Variables" tab

---

## 🚀 Expected Railway Environment

When working correctly, Railway should:

1. ✅ Clone code from GitHub `main` branch
2. ✅ Detect `backend/package.json` 
3. ✅ Run `npm install` in backend directory
4. ✅ Install all dependencies (express, pg, jsonwebtoken, etc.)
5. ✅ Run `npm start` which executes `node server.js`
6. ✅ Server binds to `process.env.PORT` (Railway provides this)
7. ✅ Server starts successfully
8. ✅ API endpoints become available

---

## 📊 Backend Package.json (Current)

Your `backend/package.json` already has the correct setup:

```json
{
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.13.1",
    ...
  }
}
```

✅ This is correct - Railway just needs to install these dependencies first!

---

## ⚡ Quick Recovery Steps

1. **Railway Dashboard** → Settings tab
2. **Set Root Directory:** `backend`
3. **Clear any manual commands** (let Railway auto-detect)
4. **Redeploy**
5. **Wait 2-3 minutes**
6. **Test:** `curl https://verdictpath.up.railway.app/api/diagnostic/daily-claim-check`

---

**Go to Railway now and set Root Directory to `backend`!** 🚀

This is the simplest fix and will get your site back online quickly.
