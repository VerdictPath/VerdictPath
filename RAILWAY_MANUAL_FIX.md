# 🔧 Railway Manual Fix - Step-by-Step

**Status:** Config files pushed to GitHub, but Railway hasn't redeployed  
**Action:** Manual Railway dashboard configuration required

---

## 🚨 Current Situation

✅ **Configuration files created and pushed to GitHub:**
- `railway.json`
- `nixpacks.toml`
- `Procfile`
- `.railwayignore`

❌ **Railway is STILL serving the Expo frontend:**
```bash
curl https://verdictpath.up.railway.app/
# Returns: Expo HTML with <style id="expo-reset">
```

❌ **API endpoints still return 404:**
```bash
curl https://verdictpath.up.railway.app/api/diagnostic/daily-claim-check
# Returns: "Cannot GET /api/diagnostic/daily-claim-check"
```

**Railway hasn't picked up the config files automatically.**

---

## ✅ SOLUTION: Manual Railway Configuration

Follow these exact steps to fix Railway:

---

### **Step 1: Open Railway Dashboard**

1. Go to: https://railway.app
2. Log in with your account
3. Click on your **`verdictpath`** project

---

### **Step 2: Find Your Service**

You should see a service/deployment card. Click on it.

*(If you see multiple services, click on the one that's currently deployed)*

---

### **Step 3: Check Settings Tab**

1. Click the **"Settings"** tab at the top
2. Scroll down to find these sections:
   - **Source** (GitHub connection)
   - **Build** settings
   - **Deploy** settings

---

### **Step 4: Configure Build Settings**

Scroll to the **"Build"** section:

**Option A: Set Build Command**
- Click **"Custom Build Command"** or find the build command field
- Enter exactly:
  ```
  cd backend && npm install
  ```
- Click **Save** or press Enter

**Option B: Set Root Directory (if available)**
- Look for "Root Directory" field
- Enter:
  ```
  backend
  ```
- If this works, you can use just `npm install` as build command

---

### **Step 5: Configure Start Command** ⭐ MOST IMPORTANT

Scroll to the **"Deploy"** section:

**Find the Start Command field** (might be labeled "Custom Start Command" or just "Start Command")

**Enter exactly:**
```
cd backend && node server.js
```

**OR if you set Root Directory to `backend`:**
```
node server.js
```

**Click Save**

---

### **Step 6: Trigger Redeploy**

Now force Railway to redeploy:

**Method A: Use "Redeploy" Button**
1. Go back to the **"Deployments"** tab
2. Find the latest deployment
3. Click the **three dots (...)** menu
4. Click **"Redeploy"**

**Method B: Disconnect & Reconnect GitHub**
1. Go to **"Settings"** tab
2. Scroll to **"Source"** section
3. Click **"Disconnect"**
4. Click **"Connect Repo"**
5. Select your repository
6. Railway will immediately start deploying

---

### **Step 7: Monitor Deployment**

1. Stay on the **"Deployments"** tab
2. Watch the build logs in real-time
3. Look for these success indicators:
   ```
   ✓ Building...
   ✓ cd backend && npm install
   ✓ Deploying...
   ✓ Starting: cd backend && node server.js
   ✓ VerdictPath Backend Server running on port 5000
   ```

4. Wait for **"Success"** or **"Active"** status

---

### **Step 8: Verify It Worked**

After Railway shows "Success", test immediately:

**Test 1: Diagnostic Endpoint**
```bash
curl https://verdictpath.up.railway.app/api/diagnostic/daily-claim-check
```

✅ **SUCCESS if you see:**
```json
{"hasColumn":true,"message":"Daily claim protection is active"}
```

❌ **STILL BROKEN if you see:**
```html
<pre>Cannot GET /api/diagnostic/daily-claim-check</pre>
```

**Test 2: Root Endpoint**
```bash
curl https://verdictpath.up.railway.app/ | grep -i expo
```

✅ **SUCCESS if:** No "expo" text appears  
❌ **STILL BROKEN if:** You see "expo-reset" or Expo-related HTML

---

## 🔧 Alternative: Environment Variables

If the above doesn't work, try setting environment variables:

1. Go to **"Variables"** tab in Railway
2. Add this variable:
   - **Name:** `RAILWAY_RUN_COMMAND`
   - **Value:** `cd backend && node server.js`
3. Click **"Add"**
4. Railway will auto-redeploy

---

## 🔍 Troubleshooting

### Problem: Build fails
**Check build logs for errors:**
- Missing `backend/package.json`? (Should be there)
- npm install errors? (Check dependencies)

**Solution:** Make sure your GitHub repo has the `backend/` directory with `package.json`

---

### Problem: Deployment succeeds but still shows Expo
**Possible causes:**
1. Railway cached old build
2. Start command not applied
3. Multiple services deployed

**Solution:**
1. Try "Redeploy" again
2. Check **"Deployments"** tab - is there more than one active deployment?
3. If multiple, stop/delete the old one serving Expo

---

### Problem: API works but returns wrong data
**This means backend is running but with old code**

**Solution:**
1. Make sure your latest GitHub commit includes subscription changes
2. Check Railway is deploying from `main` branch
3. Verify Railway pulled latest commit (check deployment SHA)

---

## 📋 Quick Checklist

Before you start:
- [ ] Logged into Railway dashboard
- [ ] Found your `verdictpath` project
- [ ] Have the project open

During configuration:
- [ ] Set build command: `cd backend && npm install`
- [ ] Set start command: `cd backend && node server.js`
- [ ] Triggered redeploy (disconnected/reconnected or clicked redeploy)
- [ ] Watched deployment logs

After deployment:
- [ ] Tested diagnostic endpoint (returns JSON)
- [ ] Tested root endpoint (no Expo HTML)
- [ ] Verified subscription changes appear in frontend

---

## 🎯 What Should Happen

**Correct Railway Deployment:**

1. Railway pulls latest code from GitHub
2. Railway reads `railway.json` OR uses your manual settings
3. Railway runs: `cd backend && npm install`
4. Railway starts: `cd backend && node server.js`
5. Backend server starts on port from `process.env.PORT`
6. API endpoints become available at `/api/*`
7. Your frontend can now connect to the backend

---

## 📞 If Nothing Works

### Last Resort: Create New Railway Service

1. In Railway dashboard, create **"New Service"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository
4. **IMMEDIATELY configure before first deploy:**
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && node server.js`
5. Deploy
6. Once working, delete the old service
7. Update your frontend API URL if domain changed

---

## 📊 Expected Results

After successful deployment:

| Endpoint | Before (Wrong) | After (Correct) |
|----------|---------------|-----------------|
| `/` | Expo HTML | Expo app served by Express |
| `/api/auth/check` | 404 Error | JSON response |
| `/api/diagnostic/...` | 404 Error | JSON with data |
| `/portal` | 404 Error | Law firm login page |

---

## 🚀 Next Steps After Fix

Once Railway is running the backend correctly:

1. ✅ Test all API endpoints
2. ✅ Open your mobile app and try logging in
3. ✅ Verify subscription changes appear
4. ✅ Test registration with new name fields
5. ✅ Verify medical provider patient counts display correctly

---

**Ready? Go to Railway dashboard and follow Step 1!** 🎯

https://railway.app
