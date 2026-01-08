# Deployment Guide (Railway)

## Architecture on Railway

This project runs as a single Railway project with three separate services:
- Backend API (FastAPI) -> folder `fastapi/`
- Frontend Staff (Next.js) -> folder `nextjs/`
- Frontend Mobile (Next.js) -> folder `mobile/`

Each service has its own build, deploy, and public URL. There is no single shared server by default.

## What This Means in Practice

- Each service gets its own Railway domain (for example `https://<service>.up.railway.app`).
- The frontends call the backend via its public URL.
- CORS must be configured on the backend to allow the frontend domains.
- If you want a single domain, you must add a reverse proxy or custom domain routing yourself (not included in this repo).

## Deploy Steps

### 1) Create the Railway Project
1. Go to https://railway.app
2. New Project -> Deploy from GitHub repo
3. Select the `CactarioCasaMolle` repository

### 2) Create 3 Services in the Same Project
Create one service per folder:
- Backend: `fastapi/`
- Frontend Staff: `nextjs/`
- Frontend Mobile: `mobile/`

Railway will detect Node.js and Python automatically.

### 3) Configure Variables per Service

Backend (FastAPI) service:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`
- `R2_SIGNED_URL_TTL`
- `DATABASE_URL`
- `ENVIRONMENT=production` (or `ENV=production`)
- `CORS_ORIGINS` with the staff and mobile domains

Frontend Staff service:
- `NODE_ENV=production`
- `NEXT_PUBLIC_API_URL` -> backend public URL

Frontend Mobile service:
- `NODE_ENV=production`
- `NEXT_PUBLIC_API_URL` -> backend public URL

### 4) Domains / URLs
Each service will have its own URL, for example:
- Frontend Staff: `https://<frontend-staff>.up.railway.app`
- Frontend Mobile: `https://<frontend-mobile>.up.railway.app`
- Backend API: `https://<backend>.up.railway.app`

### 5) Deploy
Every push to GitHub triggers a deploy for each service configured with auto-deploy.

## CORS Notes

Because the frontends and backend are on different domains by default, the backend must allow those origins. Update the backend `CORS_ORIGINS` variable with the exact frontend URLs.

If you use a reverse proxy or custom domain to present a single domain, configure it outside this repo and adjust CORS accordingly.

## RLS (Supabase) Reminder

Before production, apply Row-Level Security policies:
- Script: `fastapi/app/core/rls_policies_secure.sql`
- Verification: `fastapi/verify_rls.sql`
- More details: `fastapi/RLS_README.md`

## Verification

- Backend: `GET /health` should return 200
- Frontends: open each public URL and confirm they load
- Auth: verify OTP flow and protected routes
