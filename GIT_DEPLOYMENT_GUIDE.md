# 🚀 Git Deployment Guide

This guide will walk you through deploying your VNIT Girl's Safety project to GitHub.

## 📋 Prerequisites

Before you begin, ensure you have:
- [x] Git installed on your computer
- [x] A GitHub account
- [x] Completed the `.gitignore` setup (service-account.json should be excluded)
- [x] Created `.env.example` with template variables

## ⚠️ IMPORTANT: Security Check

Before pushing to Git, verify that sensitive files are excluded:

```bash
# Check what files will be committed
git status

# Verify service-account.json is NOT listed
# If it appears, make sure .gitignore is configured correctly
```

**Files that should NEVER be committed:**
- ✅ `service-account.json` (excluded)
- ✅ `.env` (excluded)
- ✅ `.env.local` (excluded)
- ✅ `node_modules/` (excluded)
- ✅ `dist/` (excluded)

## 🎯 Step-by-Step Deployment

### Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click the **"+"** icon in the top right corner
3. Select **"New repository"**
4. Fill in the details:
   - **Repository name**: `vnit-girls-safety` (or your preferred name)
   - **Description**: "A comprehensive safety application for VNIT students"
   - **Visibility**: Choose **Public** or **Private**
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

### Step 2: Initialize Git (if not already done)

```bash
# Navigate to your project directory
cd "c:\Users\lenovo\OneDrive\Documents\VNIT_GIRL'S_SAFETY"

# Initialize git repository
git init

# Add all files
git add .

# Create your first commit
git commit -m "Initial commit: VNIT Girl's Safety App"
```

### Step 3: Connect to GitHub Repository

Replace `YOUR_USERNAME` with your actual GitHub username:

```bash
# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/vnit-girls-safety.git

# Verify remote was added
git remote -v
```

### Step 4: Push to GitHub

```bash
# Push to GitHub (first time)
git push -u origin main

# OR if your default branch is 'master'
git push -u origin master
```

**If you get an authentication error**, you'll need to use a Personal Access Token (PAT):

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "VNIT Safety App")
4. Select scopes: `repo` (all)
5. Click "Generate token"
6. Copy the token
7. When prompted for password, paste the token instead

### Step 5: Verify Deployment

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/vnit-girls-safety`
2. Check that all files are present
3. **CRITICAL**: Verify that `service-account.json` is NOT visible in the repository
4. Check that `.env` files are NOT visible

## 🔄 Making Future Updates

After making changes to your code:

```bash
# Check what files have changed
git status

# Add all changed files
git add .

# OR add specific files
git add src/components/MyComponent.tsx

# Commit with a descriptive message
git commit -m "Add feature: SOS alert notification"

# Push to GitHub
git push
```

## 🌿 Working with Branches

### Create a New Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/emergency-contacts

# Make your changes, then commit
git add .
git commit -m "Add emergency contacts feature"

# Push the new branch to GitHub
git push -u origin feature/emergency-contacts
```

### Merge Branch to Main

```bash
# Switch back to main branch
git checkout main

# Merge your feature branch
git merge feature/emergency-contacts

# Push to GitHub
git push
```

## 🚀 Deploy to GitHub Pages (Optional)

If you want to host the app on GitHub Pages:

### 1. Update `vite.config.ts`

Add the base URL:

```typescript
export default defineConfig({
  base: '/vnit-girls-safety/', // Replace with your repo name
  // ... other config
})
```

### 2. Install gh-pages

```bash
npm install --save-dev gh-pages
```

### 3. Add deployment scripts to `package.json`

```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

### 4. Deploy

```bash
npm run deploy
```

### 5. Enable GitHub Pages

1. Go to repository Settings
2. Navigate to "Pages" section
3. Source: Select "gh-pages" branch
4. Click Save
5. Your app will be available at: `https://YOUR_USERNAME.github.io/vnit-girls-safety/`

**Note**: GitHub Pages hosting may not support all Firebase features. Consider using Firebase Hosting for full functionality.

## 🔥 Deploy to Firebase Hosting (Recommended)

For full Firebase integration:

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

Your app will be available at: `https://YOUR_PROJECT_ID.web.app`

## 📝 Git Best Practices

### Commit Message Guidelines

Use clear, descriptive commit messages:

```bash
# Good examples
git commit -m "Add SOS alert drag-to-select feature"
git commit -m "Fix: Location tracking permission issue"
git commit -m "Update: Improve admin dashboard analytics"
git commit -m "Docs: Add mobile setup guide"

# Bad examples
git commit -m "fix bug"
git commit -m "update"
git commit -m "changes"
```

### Commit Message Prefixes

- `Add:` - New feature
- `Fix:` - Bug fix
- `Update:` - Improvements to existing features
- `Remove:` - Removing code/files
- `Docs:` - Documentation changes
- `Style:` - Formatting, missing semicolons, etc.
- `Refactor:` - Code restructuring
- `Test:` - Adding tests
- `Chore:` - Updating build tasks, package manager configs, etc.

## 🆘 Troubleshooting

### Issue: "fatal: remote origin already exists"

```bash
# Remove existing remote
git remote remove origin

# Add the correct remote
git remote add origin https://github.com/YOUR_USERNAME/vnit-girls-safety.git
```

### Issue: Accidentally committed sensitive files

```bash
# Remove file from git but keep it locally
git rm --cached service-account.json

# Commit the removal
git commit -m "Remove sensitive file from git"

# Push to update remote
git push
```

**⚠️ IMPORTANT**: If you've already pushed sensitive files to GitHub, the data is in the commit history. You'll need to:
1. Rotate all credentials (Firebase keys, service account, etc.)
2. Use `git filter-branch` or BFG Repo-Cleaner to remove from history
3. Force push to update remote

### Issue: Merge conflicts

```bash
# Pull latest changes
git pull origin main

# Resolve conflicts in your editor
# Look for <<<<<<, ======, >>>>>> markers

# After resolving, add the files
git add .

# Commit the merge
git commit -m "Resolve merge conflicts"

# Push
git push
```

## 📚 Useful Git Commands

```bash
# View commit history
git log --oneline

# View changes before committing
git diff

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# View remote repository URL
git remote -v

# Create a new branch
git checkout -b branch-name

# Switch to existing branch
git checkout branch-name

# List all branches
git branch -a

# Delete a branch
git branch -d branch-name

# Pull latest changes
git pull origin main

# View file changes
git status
```

## 🎉 Next Steps

After deploying to GitHub:

1. **Add Collaborators**: Settings → Collaborators → Add people
2. **Set up Branch Protection**: Settings → Branches → Add rule
3. **Create Issues**: Use GitHub Issues for bug tracking and features
4. **Set up Projects**: Organize work with GitHub Projects
5. **Add Topics**: Add repository topics for discoverability
6. **Create Releases**: Tag stable versions of your app
7. **Add CI/CD**: Set up GitHub Actions for automated testing/deployment

## 🔐 Security Reminders

- ✅ Never commit `service-account.json`
- ✅ Never commit `.env` files with real credentials
- ✅ Use `.env.example` for templates only
- ✅ Rotate credentials if accidentally exposed
- ✅ Enable 2FA on your GitHub account
- ✅ Use strong personal access tokens
- ✅ Review .gitignore before every commit

---

**Happy Coding! 🚀**

If you need help, refer to [GitHub Documentation](https://docs.github.com) or [Git Documentation](https://git-scm.com/doc).
