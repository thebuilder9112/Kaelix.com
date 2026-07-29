# Kaelix AI - GitHub Pages Deployment Guide

This project is configured for automated deployment to **GitHub Pages** using GitHub Actions.

---

## 🚀 Step-by-Step Deployment Guide

### 1. Push Your Code to GitHub
Create a new repository on [GitHub](https://github.com/new) and push your code:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

---

### 2. Add your `VITE_API_KEY` Secret on GitHub
1. In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**.
2. Click **New repository secret**.
3. Set **Name** to `VITE_API_KEY`.
4. Set **Value** to your Gemini API Key.
5. Click **Add secret**.

---

### 3. Enable GitHub Pages Source
1. In your repository, go to **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.

---

### 4. Automatic Build & Live Site Link
- Every time you push to `main` (or run the workflow manually under the **Actions** tab), GitHub Actions will build and publish your site.
- Your live URL will be:
  ```
  https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
  ```

---

## 🛠 Features included for SPA Routing
- **`.nojekyll`** prevents GitHub Pages from ignoring bundled assets.
- **`404.html`** handles client-side route redirection to avoid 404 errors on refresh.
- **`vite.config.ts` (`base: './'`)** ensures relative paths for assets.
