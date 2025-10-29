# ⚡ Railway Quick Fix - 2 Minutes

**Problem:** Railway serving Expo frontend instead of Express backend  
**Solution:** Manually set start command in Railway dashboard

---

## 🎯 The Fix (30 seconds)

1. **Go to:** https://railway.app
2. **Open:** Your `verdictpath` project
3. **Click:** Your service/deployment
4. **Click:** "Settings" tab
5. **Find:** "Deploy" section → "Start Command" field
6. **Enter:** `cd backend && node server.js`
7. **Click:** Save

---

## 🔄 Redeploy (30 seconds)

**Option A:**
- Click "Deployments" tab
- Click "..." on latest deployment
- Click "Redeploy"

**Option B:**
- Settings tab → "Source" section
- Click "Disconnect"
- Click "Connect Repo" → Select your repo
- Railway auto-deploys

---

## ✅ Test (10 seconds)

```bash
curl https://verdictpath.up.railway.app/api/diagnostic/daily-claim-check
```

**Good:** JSON response  
**Bad:** HTML error

---

## 📋 Settings to Configure

| Setting | Value |
|---------|-------|
| **Build Command** | `cd backend && npm install` |
| **Start Command** | `cd backend && node server.js` |
| **Root Directory** | `backend` (optional) |

---

## 🔍 Still Not Working?

See `RAILWAY_MANUAL_FIX.md` for detailed troubleshooting.

---

**That's it! Railway will now run your backend correctly.** 🚀
