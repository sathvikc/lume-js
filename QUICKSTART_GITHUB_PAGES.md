# Quick Start: GitHub Pages Deployment

## ✅ Setup Complete!

Your GitHub Pages setup is ready. Here's what was added:

### Files Created/Modified:
- `.github/workflows/deploy.yml` - Auto-deploy to GitHub Pages on push
- `vite.config.build.js` - Production build configuration
- `scripts/generate-examples-list.js` - Generates examples index
- `examples/index.html` - Updated to work in dev and production
- `.nojekyll` - Tells GitHub not to use Jekyll processing
- `GITHUB_PAGES_SETUP.md` - Comprehensive documentation

## 🚀 Quick Commands

### Local Development
```bash
npm run dev
```
Opens dev server at `http://localhost:5173/examples/`

### Build for Production
```bash
npm run build:examples
```
Creates static build in `dist/` folder

### Preview Production Build Locally
```bash
npm run preview
```
Test the production build before deploying

## 📋 Next Steps

### 1. Update Base Path (IMPORTANT!)
Edit `vite.config.build.js` and change the base path to match your repo:

```javascript
base: '/lume-js/', // Change to your repo name
```

If your GitHub username is `johndoe` and repo is `awesome-project`:
```javascript
base: '/awesome-project/',
```

### 2. Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**

### 3. Deploy!
```bash
git add .
git commit -m "Add GitHub Pages setup"
git push
```

The GitHub Action will automatically build and deploy your examples!

### 4. Access Your Examples
After deployment (takes ~1-2 minutes), visit:
```
https://<username>.github.io/<repo-name>/examples/
```

## 🎯 Your Examples Will Be Available At:

- **Main page**: `https://<username>.github.io/<repo-name>/examples/`
- **Todo app**: `https://<username>.github.io/<repo-name>/examples/todo/`
- **Tic-tac-toe**: `https://<username>.github.io/<repo-name>/examples/tic-tac-toe/`
- **Form demo**: `https://<username>.github.io/<repo-name>/examples/form-heavy/`
- **Comprehensive**: `https://<username>.github.io/<repo-name>/examples/comprehensive/`

## 🔧 Troubleshooting

**Node.js version warning**: Your Node.js is 20.11.1, but Vite 7 needs 20.19+. Options:
- Upgrade Node.js: `brew upgrade node` (or use nvm)
- Or downgrade Vite in package.json if upgrading Node isn't possible

**Build fails**: Make sure you updated the `base` path in `vite.config.build.js`

**404 on GitHub Pages**: Check that GitHub Pages is enabled and set to "GitHub Actions"

## 📝 Development Workflow

1. Make changes to examples
2. Test locally: `npm run dev`
3. Build and preview: `npm run build:examples && npm run preview`
4. Commit and push (auto-deploys via GitHub Actions)

---

For complete documentation, see `GITHUB_PAGES_SETUP.md`
