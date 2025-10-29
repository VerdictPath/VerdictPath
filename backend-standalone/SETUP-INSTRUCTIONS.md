# Backend-Only Repository Setup Instructions

Follow these steps to create and push a standalone backend-only repository to GitHub.

## Method 1: Create New Replit Project (Recommended) 🌟

### Step 1: Create New Replit
1. Go to [Replit](https://replit.com)
2. Click **"Create Repl"**
3. Choose **"Node.js"** template
4. Name it: **"verdict-path-backend"**
5. Click **"Create Repl"**

### Step 2: Copy Configuration Files

From your current project's `backend-standalone/` folder, copy these files to your new Repl:

**Copy to root of new Repl:**
- `package.json`
- `.gitignore`
- `.replit`
- `README.md`

You can download these files from this project and upload to the new Repl.

### Step 3: Copy Backend Source Code

From your current project's `backend/` folder, copy **ALL files and folders** to your new Repl:

```
Copy from backend/ to new Repl root:
├── server.js
├── routes/
├── controllers/
├── services/
├── middleware/
├── config/
├── views/
└── public/
```

### Step 4: Set Up Environment Variables

In your new Repl:
1. Go to **Tools** > **Secrets**
2. Add these secrets:
   - `DATABASE_URL` = Your PostgreSQL connection string
   - `ENCRYPTION_KEY` = Your 32-byte encryption key
   - `JWT_SECRET` = Your JWT secret (optional, defaults to ENCRYPTION_KEY)

### Step 5: Install Dependencies

In the new Repl's Shell:
```bash
npm install
```

### Step 6: Test the Server

Run the server:
```bash
npm start
```

Verify it starts without errors on port 5000.

### Step 7: Push to GitHub

1. Press **`Ctrl + K`** (or `Cmd + K` on Mac)
2. Type **"Git"** and open the Git pane
3. Click **"Create a GitHub repo"**
4. Name it: **"verdict-path-backend"**
5. Set to **Private** (recommended for backend)
6. Click **"Stage all"** to stage all files
7. Commit message: **"Initial commit - Verdict Path backend API"**
8. Click **"Commit & Push"**

✅ **Done!** Your backend is now on GitHub!

---

## Method 2: Manual Git Setup (Advanced)

If you prefer to set up git manually:

### Step 1: Prepare Backend Directory

In your current project, create a clean backend copy:

```bash
# Create a temporary directory
mkdir -p /tmp/verdict-backend
cd /tmp/verdict-backend

# Copy configuration files
cp ~/workspace/backend-standalone/package.json .
cp ~/workspace/backend-standalone/.gitignore .
cp ~/workspace/backend-standalone/.replit .
cp ~/workspace/backend-standalone/README.md .

# Copy all backend source code
cp -r ~/workspace/backend/* .
```

### Step 2: Initialize Git Repository

```bash
cd /tmp/verdict-backend
git init
git add .
git commit -m "Initial commit - Verdict Path backend API"
```

### Step 3: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: **"verdict-path-backend"**
3. Set to **Private**
4. Do NOT initialize with README (you already have one)
5. Click **"Create repository"**

### Step 4: Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/verdict-path-backend.git
git branch -M main
git push -u origin main
```

---

## After Pushing to GitHub

### For Others to Clone and Run:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/verdict-path-backend.git
cd verdict-path-backend

# Install dependencies
npm install

# Set up .env file
echo "DATABASE_URL=your_connection_string" > .env
echo "ENCRYPTION_KEY=your_encryption_key" >> .env

# Run database migrations
npm run db:push

# Start the server
npm start
```

Server will be available at `http://localhost:5000`

---

## Files Structure in New Repository

Your backend-only repository will contain:

```
verdict-path-backend/
├── server.js                    # Main server entry point
├── package.json                 # Dependencies & scripts
├── .gitignore                  # Git exclusions
├── .replit                     # Replit configuration
├── README.md                   # API documentation
├── routes/                     # API endpoints
├── controllers/                # Business logic
├── services/                   # Encryption, audit, permissions
├── middleware/                 # Auth, security, RBAC
├── config/                     # Database config & schema
├── views/                      # EJS templates (law firm/provider portals)
└── public/                     # Static assets

NOT included (excluded by .gitignore):
├── node_modules/               # Install with npm install
├── uploads/                    # HIPAA files (not in git)
├── .env                        # Secrets (set manually)
└── tmp/                        # Temporary files
```

---

## Important Notes

### ⚠️ Security

Your backend repository will be **separate from the frontend**. Make sure to:
- Set repository to **Private** on GitHub
- Never commit `.env` files
- Never commit uploaded HIPAA files
- Use environment variables for all secrets

### 🔗 CORS Configuration

If frontend and backend are in separate repos, update CORS settings in `server.js`:

```javascript
// Update allowed origins
const allowedOrigins = [
  'http://localhost:3000',  // Local frontend dev
  'https://your-frontend-domain.com',  // Production frontend
];
```

### 📦 Dependencies

The backend requires:
- Node.js 18+
- PostgreSQL database
- Environment variables (DATABASE_URL, ENCRYPTION_KEY)

### 🗄️ Database

The backend expects these PostgreSQL tables:
- users
- litigation_progress
- substage_completions
- coins_transactions
- client_connections
- patient_connections
- medical_documents
- audit_logs
- subscriptions

Run `npm run db:push` after setting up DATABASE_URL.

---

## Troubleshooting

**Problem:** `npm install` fails
- **Solution:** Make sure you're using Node.js 18+. Run `node --version`

**Problem:** Server won't start
- **Solution:** Check that DATABASE_URL and ENCRYPTION_KEY are set in environment variables

**Problem:** Database connection errors
- **Solution:** Verify DATABASE_URL is correct and database is accessible

**Problem:** CORS errors when testing with frontend
- **Solution:** Add your frontend URL to allowed origins in server.js

---

## Next Steps

After pushing to GitHub:

1. ✅ Test cloning and running in a fresh environment
2. ✅ Update CORS settings for your frontend domain
3. ✅ Set up CI/CD if needed
4. ✅ Configure deployment (Replit Deploy, Railway, Render, etc.)
5. ✅ Add collaborators to the private repository

---

**Your backend is now a standalone, deployable API! 🚀**
