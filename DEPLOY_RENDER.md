# 🚀 Deploying to Render

This full-stack application (React 19 + Express API + MongoDB/In-Memory Store) is completely configured and ready for 1-click or manual deployment on [Render](https://render.com).

---

## ⚡ Option 1: Automatic Blueprint Deploy (Recommended)

1. Push your repository to **GitHub** or **GitLab**.
2. Go to your [Render Dashboard](https://dashboard.render.com).
3. Click **"New +"** in the top navigation and select **"Blueprint"**.
4. Connect your Git repository.
5. Render will detect the included `render.yaml` file automatically:
   - **Service Name**: `finepath-rider-wallet`
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
   - **Auto-generated Secrets**: `JWT_SECRET` and `JWT_REFRESH_SECRET`
6. Click **"Apply"** and your web service will build and go live!

---

## 🛠️ Option 2: Manual Web Service Setup

If you prefer setting up the Web Service manually on Render:

1. Click **"New +"** → **"Web Service"**.
2. Connect your Git repository.
3. Configure the settings:
   - **Name**: `rider-wallet` (or your chosen name)
   - **Region**: Singapore, Oregon, or Frankfurt (closest to your users)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install --legacy-peer-deps && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Under **"Advanced"** → **"Health Check Path"**, enter:
   ```text
   /api/health
   ```
5. Under **"Environment Variables"**, add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production static bundle serving |
   | `NPM_CONFIG_LEGACY_PEER_DEPS` | `true` | Ensures clean npm package resolution |
   | `PORT` | `10000` | (Render sets this automatically, but standard is 10000) |
   | `JWT_SECRET` | *(Random 32+ character string)* | Used to sign access tokens |
   | `JWT_REFRESH_SECRET` | *(Random 32+ character string)* | Used to sign refresh tokens |
   | `MONGODB_URI` | *(Optional MongoDB connection string)* | e.g., `mongodb+srv://...` (Atlas). If left empty, the high-performance local store will automatically activate! |

6. Click **"Create Web Service"**.

---

## 📦 What the Build & Start Commands Do

- **`npm run build`**:
  1. Compiles the modern React 19 frontend into optimized production assets (`dist/`).
  2. Bundles the TypeScript Express server into a standalone, high-performance Node file (`dist/server.js`).
- **`npm start`**:
  - Launches `node dist/server.js`.
  - Binds to `0.0.0.0:$PORT` (as required by Render).
  - Serves both `/api/*` REST endpoints and client-side SPA navigation routes.
  - Automatically handles graceful shutdowns (`SIGTERM`) during rolling updates.
