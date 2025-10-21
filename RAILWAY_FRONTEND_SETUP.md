# 🚀 Railway Frontend Configuration Guide

## ⚠️ CRITICAL: Root Directory Configuration

Railway needs to know which directory contains your Next.js app in the monorepo.

### 📋 Required Settings in Railway Dashboard

1. **Go to your Frontend Service** in Railway
2. **Click on "Settings"**
3. **Scroll to "Build & Deploy"**
4. **Configure the following:**

#### ✅ Root Directory
```
nextjs
```
**⚠️ IMPORTANT:** This must be set to `nextjs` (the folder where `package.json` is located)

#### ✅ Build Command
```
npm install && npm run build
```
**Should match:** `railway.json` → `build.buildCommand`

#### ✅ Start Command
```
node start-server.js
```
**Should match:** `railway.json` → `deploy.startCommand`

#### ✅ Watch Paths (Optional but recommended)
```
nextjs/**
```
This ensures Railway only redeploys when frontend files change.

---

## 🔍 Environment Variables Required

Make sure these are set in Railway → Settings → Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `PORT` | *(Auto-set by Railway)* | ✅ Auto |
| `NEXT_PUBLIC_API_URL` | `https://cactario-backend-production.up.railway.app` | ✅ Yes |
| `NODE_ENV` | `production` | ✅ Yes |

---

## 🏗️ Build & Deploy Flow

### What Railway Should Do:

1. **Detect monorepo** structure
2. **Navigate to** `nextjs/` directory
3. **Run:** `npm install && npm run build`
4. **Generate:** `.next/standalone/nextjs/server.js`
5. **Start:** `node start-server.js`
6. **Listen on:** Port from `$PORT` variable
7. **Healthcheck:** `GET /` should return 200

---

## 📊 Expected Logs

When deployment is successful, you should see:

```
🔍 Railway Frontend Deployment
================================
📍 Current directory: /app/nextjs
🌐 Server will listen on: 0.0.0.0:3000
🔐 PORT from Railway: 3000

🔍 Searching for standalone server.js...
   Checking: /app/nextjs/.next/standalone/nextjs/server.js
   ✅ Found: /app/nextjs/.next/standalone/nextjs/server.js

🚀 Starting Next.js standalone server...
   Server file: /app/nextjs/.next/standalone/nextjs/server.js
   Listening on: http://0.0.0.0:3000

▲ Next.js 15.5.5
- Local:        http://0.0.0.0:3000
✓ Ready in XXXms
```

---

## ❌ Common Errors & Fixes

### Error: "Application failed to respond"

**Possible Causes:**

1. **Root Directory not set**
   - Fix: Set to `nextjs` in Railway Settings

2. **PORT not configured**
   - Fix: Railway should auto-set this, check Variables tab

3. **Build failed**
   - Fix: Check build logs for errors

4. **Healthcheck timeout**
   - Fix: Already configured to 100s in `railway.json`

### Error: "Cannot find module server.js"

**Possible Causes:**

1. **Build didn't complete**
   - Fix: Check if `npm run build` succeeded in logs

2. **Wrong standalone path**
   - Fix: `start-server.js` should auto-detect, check logs

---

## 🔄 Manual Redeploy

If needed, trigger manual redeploy:

```bash
# Force push to trigger Railway deployment
git commit --allow-empty -m "Trigger Railway redeploy"
git push
```

Or use Railway CLI:
```bash
railway up
```

---

## ✅ Verification Checklist

- [ ] Root Directory set to `nextjs`
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `node start-server.js`
- [ ] `NEXT_PUBLIC_API_URL` environment variable set
- [ ] Deployment logs show "✅ Found: .../server.js"
- [ ] Deployment logs show "✓ Ready in..."
- [ ] Healthcheck passes (shown as "Healthy" in Railway)
- [ ] Opening the URL doesn't show "Application failed to respond"

---

## 🆘 Troubleshooting

### Check Railway Logs:

1. Go to Railway Dashboard
2. Select Frontend Service
3. Click "Deployments"
4. Click on the latest deployment
5. Check "Build Logs" and "Deploy Logs"

### Look for:

- ✅ `🔍 Railway Frontend Deployment` (script started)
- ✅ `✅ Found: /app/nextjs/.next/standalone/nextjs/server.js`
- ✅ `🚀 Starting Next.js standalone server...`
- ✅ `▲ Next.js 15.5.5`
- ✅ `✓ Ready in XXXms`

### If you see errors:

1. **"Cannot find module"** → Build didn't complete, check build logs
2. **"Port already in use"** → Railway should auto-assign, check settings
3. **"Application failed to respond"** → Check if server is listening on correct PORT
4. **No logs after "Starting..."** → Server crashed, check for errors

---

## 📞 Need Help?

If issues persist:

1. **Check Railway Status:** https://status.railway.app/
2. **Railway Docs:** https://docs.railway.app/
3. **Community Help:** https://discord.gg/railway

---

**Last Updated:** After implementing `start-server.js` with PORT configuration

