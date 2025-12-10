# 🚀 Quick Start - Deploy to Git in 5 Minutes

## Step 1: Security Check (30 seconds)

Make sure these files are in your `.gitignore`:

```bash
# Quick check - these should NOT appear in git status
service-account.json
.env
node_modules/
```

## Step 2: Initialize Git (1 minute)

```bash
# Navigate to project directory
cd "c:\Users\lenovo\OneDrive\Documents\VNIT_GIRL'S_SAFETY"

# Initialize git
git init

# Add all files
git add .

# Check what's being added (IMPORTANT!)
git status

# If service-account.json appears, STOP and check .gitignore
```

## Step 3: Create GitHub Repository (1 minute)

1. Go to https://github.com/new
2. Repository name: `vnit-girls-safety`
3. Description: "Safety application for VNIT students"
4. Choose Public or Private
5. **DO NOT** initialize with README
6. Click "Create repository"

## Step 4: Connect and Push (2 minutes)

Replace `YOUR_USERNAME` with your GitHub username:

```bash
# First commit
git commit -m "Initial commit: VNIT Girl's Safety App"

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/vnit-girls-safety.git

# Push to GitHub
git push -u origin main
```

**If you get "main" doesn't exist error:**
```bash
git branch -M main
git push -u origin main
```

## Step 5: Verify (30 seconds)

1. Visit: `https://github.com/YOUR_USERNAME/vnit-girls-safety`
2. **CRITICAL CHECK**: Verify `service-account.json` is NOT visible
3. Check that `.env` files are NOT visible
4. Confirm all source code is there

## ✅ Done!

Your project is now on GitHub! 🎉

### Next Steps:

- **Add a description** to your repository
- **Add topics** like: `react`, `typescript`, `firebase`, `safety-app`, `pwa`
- **Invite collaborators** (Settings → Collaborators)
- **Set up Firebase Hosting**: `firebase deploy`

### Making Changes Later:

```bash
# After editing files
git add .
git commit -m "Describe your changes here"
git push
```

---

**Need detailed help?** See [GIT_DEPLOYMENT_GUIDE.md](./GIT_DEPLOYMENT_GUIDE.md)

**Pre-deployment checklist:** See [PRE_DEPLOYMENT_CHECKLIST.md](./PRE_DEPLOYMENT_CHECKLIST.md)
