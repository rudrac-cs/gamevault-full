# Complete Deployment Guide: GameVault

This guide walks you through deploying the **backend on Render** and the **frontend on Vercel**.

---

## Part 1: Backend Deployment on Render

### Step 1: Prepare Your Backend

1. **Make sure your backend code is committed to Git**
   ```bash
   cd backend
   git status  # Check for uncommitted changes
   git add .
   git commit -m "Prepare backend for Render deployment"
   git push origin main
   ```

### Step 2: Get IGDB/Twitch API Credentials

1. Go to [Twitch Developer Console](https://dev.twitch.com/console/apps)
2. Sign in with your Twitch account
3. Click **"Register Your Application"**
4. Fill in:
   - **Name**: GameVault (or any name)
   - **OAuth Redirect URLs**: `http://localhost`
   - **Category**: Choose "Web"
5. Click **"Create"**
6. Copy your **Client ID** (shown on the app page)
7. Click **"New Secret"** to generate a Client Secret (copy this too)
8. **Get an Access Token**:
   - Go to [Twitch Token Generator](https://twitchtokengenerator.com/) OR
   - Use this command (replace YOUR_CLIENT_ID and YOUR_CLIENT_SECRET):
     ```bash
     curl -X POST https://id.twitch.tv/oauth2/token \
       -H "Content-Type: application/x-www-form-urlencoded" \
       -d "client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&grant_type=client_credentials"
     ```
   - Copy the `access_token` from the response

**Note**: Twitch tokens expire after 60 days. You'll need to regenerate them or set up auto-refresh.

### Step 3: Deploy Backend to Render

1. **Sign up/Login to Render**
   - Go to [render.com](https://render.com)
   - Sign up or log in (free account works)

2. **Create a New Web Service**
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub/GitLab account if prompted
   - Select your `gamevault-full` repository

3. **Configure the Service**
   - **Name**: `gamevault-api` (or any name)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free tier (512 MB RAM)

4. **Add Environment Variables**
   Click **"Advanced"** → **"Add Environment Variable"** and add:
   - `TWITCH_CLIENT_ID`: Your Twitch Client ID
   - `TWITCH_APP_ACCESS_TOKEN`: Your Twitch Access Token
   - `ALLOW_ORIGINS`: `http://localhost:5173,http://127.0.0.1:5173` (we'll update this after frontend deployment)
   - `PYTHON_VERSION`: `3.11` (or latest stable)

5. **Deploy**
   - Click **"Create Web Service"**
   - Wait for deployment (usually 3-5 minutes)
   - You'll get a URL like: `https://gamevault-api-xxxx.onrender.com`

6. **Test Your Backend**
   - Visit: `https://your-api-url.onrender.com/health`
   - Should see: `{"ok": true}`
   - Visit: `https://your-api-url.onrender.com/api/games/featured`
   - Should see JSON with game data

**Note**: Free tier services on Render spin down after 15 minutes of inactivity. The first request after spin-down takes ~30 seconds. Consider upgrading to a paid plan for production.

### Step 4: Update Backend CORS (After Frontend Deployment)

After deploying the frontend (Part 2), come back here:
1. Go to your Render service dashboard
2. Click **"Environment"** tab
3. Edit `ALLOW_ORIGINS` to include your Vercel URL:
   ```
   https://your-project.vercel.app,http://localhost:5173,http://127.0.0.1:5173
   ```
4. Click **"Save Changes"**
5. The service will automatically restart

---

## Part 2: Frontend Deployment on Vercel

### Step 1: Prepare Your Frontend

1. **Make sure your code is committed**
   ```bash
   git status
   git add .
   git commit -m "Prepare frontend for Vercel deployment"
   git push origin main
   ```

2. **Test build locally** (optional but recommended)
   ```bash
   cd frontend/case
   npm install
   npm run build
   npm run preview  # Test the build
   ```

### Step 2: Update vercel.json with Your Backend URL

1. **Edit `frontend/case/vercel.json`**
   - Replace `https://gamevault-api-9tvn.onrender.com` with your actual Render backend URL
   - Get this from Part 1, Step 3 (your Render service URL)

### Step 3: Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. **Sign up/Login to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up or log in (GitHub/GitLab/Bitbucket OAuth works best)

2. **Import Your Project**
   - Click **"Add New..."** → **"Project"**
   - Import your `gamevault-full` repository
   - Click **"Import"**

3. **Configure Project Settings**
   - **Project Name**: `gamevault` (or your preferred name)
   - **Framework Preset**: Should auto-detect as **Vite**
   - **Root Directory**: Click **"Edit"** → Set to `frontend/case`
     - **This is critical!** The frontend is in a subdirectory
   - **Build Command**: `npm run build` (should auto-fill)
   - **Output Directory**: `dist` (should auto-fill)
   - **Install Command**: `npm install` (should auto-fill)

4. **Environment Variables** (Optional)
   - Usually not needed since `vercel.json` handles API proxying
   - If you want to override, add:
     - Key: `VITE_API_BASE_URL`
     - Value: Leave empty (uses `/api` proxy) or your backend URL

5. **Deploy**
   - Click **"Deploy"**
   - Wait 1-2 minutes for build to complete
   - Your site will be live at: `https://your-project.vercel.app`

#### Option B: Using Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Navigate to frontend directory**
   ```bash
   cd frontend/case
   ```

4. **Deploy**
   ```bash
   vercel
   ```
   - Follow prompts:
     - Set up and deploy? **Y**
     - Link to existing project? **N** (first time)
     - Project name? `gamevault`
     - Directory? `./`
   
5. **Deploy to production**
   ```bash
   vercel --prod
   ```

### Step 4: Test Your Deployment

1. **Visit your Vercel URL**: `https://your-project.vercel.app`
2. **Test features**:
   - ✅ Homepage loads
   - ✅ Navigation works
   - ✅ Catalog page loads
   - ✅ Search works
   - ✅ Game details modal opens

3. **Check browser console** (F12):
   - Should see no CORS errors
   - API calls should succeed

---

## Part 3: Connect Frontend and Backend

### Step 1: Update Backend CORS

1. Go to your **Render** dashboard
2. Select your backend service
3. Click **"Environment"** tab
4. Edit `ALLOW_ORIGINS`:
   ```
   https://your-project.vercel.app,https://www.yourdomain.com,http://localhost:5173,http://127.0.0.1:5173
   ```
   - Replace `your-project.vercel.app` with your actual Vercel URL
   - Add your custom domain if you have one
5. Click **"Save Changes"**
6. Service will auto-restart (takes ~30 seconds)

### Step 2: Verify API Proxying

1. In Vercel, check your `vercel.json` has the correct backend URL
2. Test the API proxy:
   - Visit: `https://your-project.vercel.app/api/health`
   - Should return: `{"ok": true}`

### Step 3: Test End-to-End

1. Visit your Vercel site
2. Open browser DevTools (F12) → Network tab
3. Test:
   - Homepage loads featured games
   - Catalog search works
   - Game details load
   - Check that requests go to `/api/...` (not directly to Render)

---

## Troubleshooting

### Backend Issues

**Problem**: Backend returns 502/503 errors
- **Solution**: Check Render logs. Free tier services spin down after 15 min idle
- First request after spin-down takes ~30 seconds

**Problem**: IGDB API returns 401/403
- **Solution**: Your Twitch token expired (valid for 60 days)
- Regenerate token and update `TWITCH_APP_ACCESS_TOKEN` in Render

**Problem**: CORS errors in browser
- **Solution**: Make sure `ALLOW_ORIGINS` in Render includes your Vercel URL
- Restart the Render service after updating

### Frontend Issues

**Problem**: 404 on page refresh
- **Solution**: Verify `vercel.json` has the SPA rewrite rule:
  ```json
  {
    "source": "/(.*)",
    "destination": "/index.html"
  }
  ```

**Problem**: Build fails on Vercel
- **Solution**: 
  - Check Root Directory is set to `frontend/case`
  - Check build logs in Vercel dashboard
  - Verify Node.js version (Vercel uses 18.x by default)

**Problem**: API requests fail
- **Solution**:
  - Check `vercel.json` has correct backend URL
  - Verify backend is running (test `/health` endpoint)
  - Check browser console for errors

---

## Quick Reference

### Backend URLs
- Render Dashboard: [render.com](https://dashboard.render.com)
- Health Check: `https://your-api.onrender.com/health`
- API Base: `https://your-api.onrender.com/api`

### Frontend URLs
- Vercel Dashboard: [vercel.com](https://vercel.com/dashboard)
- Your Site: `https://your-project.vercel.app`

### Environment Variables

**Backend (Render)**:
- `TWITCH_CLIENT_ID`
- `TWITCH_APP_ACCESS_TOKEN`
- `ALLOW_ORIGINS`
- `PYTHON_VERSION`

**Frontend (Vercel)**:
- `VITE_API_BASE_URL` (optional, uses `/api` by default)

---

## Next Steps

1. ✅ Set up custom domain (optional)
2. ✅ Configure automatic deployments (already enabled by default)
3. ✅ Set up error monitoring (e.g., Sentry)
4. ✅ Consider upgrading Render to paid plan (no spin-down)
5. ✅ Set up CI/CD for testing before deployment

---

## Support Resources

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Twitch API Documentation](https://dev.twitch.tv/docs/api/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Vite Documentation](https://vitejs.dev/)

---

**You're all set!** Your GameVault app should now be live and working. 🎮

