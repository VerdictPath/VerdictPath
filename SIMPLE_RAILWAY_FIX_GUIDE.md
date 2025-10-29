# Simple Guide: Fix Daily Rewards on Railway

## ✅ EASIEST METHOD: Railway Dashboard Database View

### Step-by-Step Instructions:

1. **Go to Railway Dashboard**
   - Open https://railway.app in your browser
   - Login to your account

2. **Find Your Database**
   - Click on your "Verdict Path" project
   - Click on the **PostgreSQL** service/database (looks like an elephant icon)

3. **Open the Data Tab**
   - In your PostgreSQL service, look for tabs at the top
   - Click the **"Data"** tab
   - This opens Railway's built-in database viewer

4. **Find the Users Table**
   - You should see a list of your tables on the left
   - Click on the **"users"** table

5. **Check for the Column**
   - Look at the column headers
   - Check if you see a column called `last_daily_claim_at`
   - **If you SEE it:** The fix is already applied! ✅
   - **If you DON'T see it:** Continue to next step

6. **Add the Missing Column**
   - Look for a button or option to **"Run Query"** or **"SQL Editor"**
   - Paste this SQL:
   ```sql
   ALTER TABLE users ADD COLUMN last_daily_claim_at TIMESTAMP;
   ```
   - Click **"Run"** or **"Execute"**

7. **Verify It Worked**
   - Refresh the users table view
   - You should now see the `last_daily_claim_at` column
   - Done! 🎉

---

## 🔧 ALTERNATIVE METHOD: Railway CLI (If You Have It Installed)

### Prerequisites:
- Railway CLI must be installed on your computer
- If not installed, download from: https://docs.railway.app/develop/cli

### Steps:

1. **Open Terminal/Command Prompt**

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Link to Your Project**
   ```bash
   railway link
   ```
   - Select your "Verdict Path" project

4. **Connect to Database**
   ```bash
   railway connect
   ```
   - This opens an interactive PostgreSQL shell

5. **Run the SQL**
   - Paste this command:
   ```sql
   ALTER TABLE users ADD COLUMN last_daily_claim_at TIMESTAMP;
   ```
   - Press Enter

6. **Check It Worked**
   ```sql
   \d users
   ```
   - You should see `last_daily_claim_at` in the column list

7. **Exit**
   ```sql
   \q
   ```

---

## 🌐 EASIEST ALTERNATIVE: Deploy a Database UI Tool

If the above don't work, you can deploy a free database management tool:

### Option A: Deploy Adminer (Recommended)

1. **Go to Railway Template**
   - Visit: https://railway.app/template/Pcgkm8

2. **Click "Deploy"**
   - Login with your Railway account
   - Select your existing project (Verdict Path)

3. **Configure the Connection**
   - Railway will ask for `DATABASE_URL`
   - Copy your PostgreSQL's `DATABASE_URL` from your database service's Variables tab
   - Paste it when prompted

4. **Access Adminer**
   - Railway will generate a URL (like `adminer-production.up.railway.app`)
   - Click it to open Adminer

5. **Run the SQL**
   - In Adminer, click "SQL command"
   - Paste:
   ```sql
   ALTER TABLE users ADD COLUMN last_daily_claim_at TIMESTAMP;
   ```
   - Click "Execute"

---

## 🧪 After Applying the Fix - Test It!

1. **Login to Your App**
   - Go to https://verdictpath.up.railway.app
   - Login as any user

2. **First Click: Claim Daily Bonus**
   - Should succeed and give you coins ✅

3. **Second Click: Claim Daily Bonus Again**
   - Should show: **"Already Claimed - You have already claimed your daily reward today"**
   - Coin balance should NOT increase ✅

4. **Security Fixed!** 🎉

---

## ❓ Need Help?

If you're stuck at any step, tell me:
- Which method you're trying (Dashboard, CLI, or Adminer)
- What step you're on
- What you're seeing on your screen

I'll walk you through it!
