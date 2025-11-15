# Quick Deployment Checklist

## ✅ Backend on Render

- [ ] Get Twitch/IGDB API credentials from [Twitch Developer Console](https://dev.twitch.com/console/apps)
- [ ] Sign up/Login to [Render](https://render.com)
- [ ] Create new Web Service from your GitHub repo
- [ ] Configure:
  - Root Directory: `backend`
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
  - Runtime: Python 3
- [ ] Add environment variables:
  - `TWITCH_CLIENT_ID`
  - `TWITCH_APP_ACCESS_TOKEN`
  - `ALLOW_ORIGINS`: `http://localhost:5173,http://127.0.0.1:5173`
- [ ] Deploy and copy your Render URL (e.g., `https://gamevault-api-xxxx.onrender.com`)

## ✅ Frontend on Vercel

- [ ] Update `frontend/case/vercel.json` with your Render backend URL
- [ ] Commit and push code to GitHub
- [ ] Sign up/Login to [Vercel](https://vercel.com)
- [ ] Import project from GitHub
- [ ] Configure:
  - **Root Directory**: `frontend/case` ← **CRITICAL!**
  - Framework: Vite (auto-detected)
  - Build Command: `npm run build`
  - Output Directory: `dist`
- [ ] Deploy and copy your Vercel URL (e.g., `https://your-project.vercel.app`)

## ✅ Connect Them

- [ ] Update Render `ALLOW_ORIGINS` to include your Vercel URL:
  ```
  https://your-project.vercel.app,http://localhost:5173,http://127.0.0.1:5173
  ```
- [ ] Restart Render service (auto-restarts when you save env vars)
- [ ] Test your Vercel site

## ✅ Verify

- [ ] Backend health check: `https://your-api.onrender.com/health` → `{"ok": true}`
- [ ] Frontend loads: `https://your-project.vercel.app`
- [ ] API proxy works: `https://your-project.vercel.app/api/health` → `{"ok": true}`
- [ ] Featured games load on homepage
- [ ] Search works in catalog
- [ ] No CORS errors in browser console

---

**Need detailed instructions?** See `DEPLOYMENT_GUIDE.md`

