# Backend-Only Repository File Manifest

This document lists exactly which files to copy when creating your standalone backend repository.

## Configuration Files (From backend-standalone/)

These files are in the `backend-standalone/` folder of your current project:

| File | Copy To | Purpose |
|------|---------|---------|
| `package.json` | Root of new repo | Backend dependencies |
| `.gitignore` | Root of new repo | Git exclusions |
| `.replit` | Root of new repo | Replit configuration |
| `README.md` | Root of new repo | API documentation |

## Backend Source Files (From backend/)

These files are in the `backend/` folder of your current project. Copy **ALL** to root of new repo:

### Core Files
- ✅ `server.js` - Main Express server entry point

### Directories (copy entire folders)
- ✅ `routes/` - All API route definitions
- ✅ `controllers/` - All business logic controllers
- ✅ `services/` - Core services (encryption, audit, permissions)
- ✅ `middleware/` - All middleware (auth, security, RBAC)
- ✅ `config/` - Database config and schema
- ✅ `views/` - EJS templates for web portals
- ✅ `public/` - Static assets

### What NOT to Copy
- ❌ `backend/uploads/` - HIPAA files (excluded by .gitignore)
- ❌ `backend/node_modules/` - Install fresh with npm install
- ❌ `backend/public/app/` - Expo compiled bundle (frontend only)

## Quick Copy Checklist

When creating your new backend-only Replit:

### Step 1: Configuration Files
- [ ] Copy `backend-standalone/package.json` → new repo root
- [ ] Copy `backend-standalone/.gitignore` → new repo root
- [ ] Copy `backend-standalone/.replit` → new repo root
- [ ] Copy `backend-standalone/README.md` → new repo root

### Step 2: Backend Source Code
- [ ] Copy `backend/server.js` → new repo root
- [ ] Copy entire `backend/routes/` folder → new repo root
- [ ] Copy entire `backend/controllers/` folder → new repo root
- [ ] Copy entire `backend/services/` folder → new repo root
- [ ] Copy entire `backend/middleware/` folder → new repo root
- [ ] Copy entire `backend/config/` folder → new repo root
- [ ] Copy entire `backend/views/` folder → new repo root
- [ ] Copy entire `backend/public/` folder → new repo root (but exclude public/app/)

### Step 3: Environment Setup
- [ ] Set `DATABASE_URL` in Secrets
- [ ] Set `ENCRYPTION_KEY` in Secrets
- [ ] Set `JWT_SECRET` in Secrets (optional)

### Step 4: Install & Test
- [ ] Run `npm install`
- [ ] Run `npm start`
- [ ] Verify server starts on port 5000

### Step 5: Push to GitHub
- [ ] Open Git pane (Ctrl/Cmd + K → "Git")
- [ ] Create GitHub repo "verdict-path-backend"
- [ ] Stage all files
- [ ] Commit with message
- [ ] Push to GitHub

---

## File Count Verification

After copying, your new repository should have approximately:

- **Routes:** 6-8 route files
- **Controllers:** 10+ controller files
- **Services:** 3-4 service files (encryption, audit, permissions)
- **Middleware:** 5-6 middleware files
- **Config:** 2-3 config files
- **Views:** Multiple EJS template folders
- **Total files:** ~50-70 source files (excluding node_modules)

## Size Estimate

- **With node_modules:** ~200-250 MB
- **Without node_modules:** ~5-10 MB
- **After .gitignore exclusions:** ~5-10 MB pushed to GitHub

---

**This manifest ensures you copy everything needed for a fully functional backend!**
