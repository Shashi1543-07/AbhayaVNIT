# ✅ Pre-Deployment Checklist

Complete this checklist before pushing to GitHub to ensure security and proper setup.

## 🔒 Security Checks

- [ ] **Verify .gitignore is working**
  - `service-account.json` should be excluded
  - `.env` files should be excluded
  - `node_modules/` should be excluded
  - Run: `git status` to verify

- [ ] **Remove sensitive data from code**
  - No hardcoded API keys in source files
  - No hardcoded passwords or tokens
  - Firebase config uses environment variables

- [ ] **Create .env.example**
  - ✅ Already created
  - Contains template variables only
  - No real credentials included

## 📋 Repository Setup

- [ ] **Update README.md**
  - ✅ Already updated with comprehensive guide
  - Project description is accurate
  - Setup instructions are clear

- [ ] **Check package.json**
  - Project name is correct
  - Version number is set
  - All scripts are working

- [ ] **Test the application**
  - `npm run dev` works correctly
  - `npm run build` completes without errors
  - `npm run preview` shows working app

## 🌐 GitHub Setup

- [ ] **Create GitHub repository**
  - Choose appropriate name (e.g., vnit-girls-safety)
  - Set visibility (Public/Private)
  - Do NOT initialize with README/gitignore

- [ ] **Configure Git locally**
  - Set username: `git config user.name "Your Name"`
  - Set email: `git config user.email "your.email@example.com"`

## 🚀 Deployment Steps

- [ ] **Initialize Git repository**
  ```bash
  git init
  ```

- [ ] **Add all files**
  ```bash
  git add .
  ```

- [ ] **Verify files to be committed**
  ```bash
  git status
  ```
  - **STOP HERE if you see:** `service-account.json`, `.env`, or other sensitive files

- [ ] **Create initial commit**
  ```bash
  git commit -m "Initial commit: VNIT Girl's Safety App"
  ```

- [ ] **Add remote repository**
  ```bash
  git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
  ```

- [ ] **Push to GitHub**
  ```bash
  git push -u origin main
  ```

## 🔥 Firebase Setup (Post-Deployment)

- [ ] **Update Firebase project settings**
  - Add authorized domains for production
  - Configure OAuth redirect URIs
  - Set up Firebase hosting (if using)

- [ ] **Deploy Firestore rules**
  ```bash
  firebase deploy --only firestore:rules
  ```

- [ ] **Deploy Cloud Functions**
  ```bash
  firebase deploy --only functions
  ```

- [ ] **Deploy to Firebase Hosting**
  ```bash
  firebase deploy --only hosting
  ```

## 📝 Post-Deployment Tasks

- [ ] **Add repository description** on GitHub
- [ ] **Add topics/tags** for discoverability
- [ ] **Enable GitHub Pages** (optional)
- [ ] **Set up branch protection rules**
- [ ] **Add collaborators** (if team project)
- [ ] **Create initial issues** for planned features
- [ ] **Add LICENSE file**
- [ ] **Update repository settings**

## 🛡️ Final Security Verification

After pushing to GitHub:

1. **Visit your GitHub repository**
2. **Check these files are NOT visible:**
   - `service-account.json` ❌
   - `.env` ❌
   - Any file with credentials ❌

3. **If sensitive files are visible:**
   - IMMEDIATELY remove them using `git rm --cached filename`
   - Rotate ALL credentials (service account, API keys, etc.)
   - Update `.gitignore` and recommit

## 🎯 Quick Command Reference

```bash
# Check what will be committed
git status

# See file differences
git diff

# Remove file from staging
git reset HEAD filename

# Remove file completely (CAREFUL!)
git rm --cached filename

# Amend last commit
git commit --amend

# View commit history
git log --oneline
```

## ✨ You're Ready When...

- ✅ All security checks pass
- ✅ No sensitive files in git status
- ✅ Application builds successfully
- ✅ README is comprehensive and accurate
- ✅ .env.example exists with templates only
- ✅ GitHub repository is created
- ✅ You've read the GIT_DEPLOYMENT_GUIDE.md

---

**🚨 REMEMBER**: Once you push to GitHub, assume anything committed is public forever. Always double-check before pushing!

**Need Help?** See [GIT_DEPLOYMENT_GUIDE.md](./GIT_DEPLOYMENT_GUIDE.md) for detailed instructions.
