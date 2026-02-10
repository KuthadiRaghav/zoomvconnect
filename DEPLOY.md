# 🚀 Deploying ZoomVconnect to Production

Step-by-step guide to deploy ZoomVconnect so anyone can access it on the internet.

## Architecture Overview

```
Users → Vercel (Next.js frontend)
           ↓ API calls
        Railway (NestJS API + Signaling Server)
           ↓               ↓
     Neon (PostgreSQL)   Upstash (Redis)
           
        LiveKit Cloud (Video/Audio SFU)
```

---

## Step 1: Set Up Managed Services (15 min)

### 1a. PostgreSQL — Neon (Free)

1. Go to [neon.tech](https://neon.tech) → Sign up
2. Create a new project → name it `zoomvconnect`
3. Copy the **connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this as your `DATABASE_URL`

### 1b. Redis — Upstash (Free)

1. Go to [upstash.com](https://upstash.com) → Sign up
2. Create a new **Redis database** → region closest to you
3. Copy the **Redis URL** from the dashboard — it looks like:
   ```
   rediss://default:xxx@us1-xxx.upstash.io:6379
   ```
4. Save this as your `REDIS_URL`

### 1c. LiveKit Cloud (Free Tier)

1. Go to [cloud.livekit.io](https://cloud.livekit.io) → Sign up
2. Create a new project → name it `zoomvconnect`
3. From Settings → Keys, copy:
   - **API Key** → `LIVEKIT_API_KEY`
   - **API Secret** → `LIVEKIT_API_SECRET`
   - **WebSocket URL** → `LIVEKIT_URL` (looks like `wss://your-project.livekit.cloud`)

---

## Step 2: Push to GitHub (5 min)

```bash
# Make sure you're in the project root
cd /Users/raghavendrakuthadi/Desktop/Raghav-Desktop/ZoomVconnect

# Initialize git (if not already)
git init

# Create a GitHub repo at github.com/new, then:
git remote add origin https://github.com/YOUR_USERNAME/zoomvconnect.git
git add .
git commit -m "feat: add production deployment configuration"
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy Backend to Railway (10 min)

### 3a. Create Railway Project

1. Go to [railway.app](https://railway.app) → Sign up (connect GitHub)
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your `zoomvconnect` repository

### 3b. Create the API Service

1. In your Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select the same repo → name the service `api`
3. In the service settings, set:
   - **Root Directory:** `apps/api`
   - **Build Command:** Leave empty (uses Dockerfile)
4. Go to **Variables** tab and add:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Your Neon connection string |
   | `REDIS_URL` | Your Upstash Redis URL |
   | `JWT_SECRET` | Generate with `openssl rand -hex 32` |
   | `JWT_REFRESH_SECRET` | Generate with `openssl rand -hex 32` |
   | `LIVEKIT_API_KEY` | From LiveKit Cloud |
   | `LIVEKIT_API_SECRET` | From LiveKit Cloud |
   | `LIVEKIT_URL` | `wss://your-project.livekit.cloud` |
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` |
   | `CORS_ORIGIN` | `https://your-app.vercel.app` (update after Vercel deploy) |

5. Click **Deploy** → Wait for the build to finish
6. Railway gives you a public URL like `https://api-production-xxxx.up.railway.app`

### 3c. Create the Signaling Service

1. Click **"+ New"** → **"GitHub Repo"** again
2. Select the same repo → name the service `signaling`
3. Set **Root Directory:** `apps/signaling`
4. Add Variables:

   | Variable | Value |
   |----------|-------|
   | `JWT_SECRET` | Same as API's JWT_SECRET |
   | `REDIS_URL` | Your Upstash Redis URL |
   | `SIGNALING_PORT` | `4001` |

5. Deploy

### 3d. Run Database Migrations

In the Railway project, open the **API service** → open the **shell**:

```bash
cd packages/database && npx prisma migrate deploy
```

Or run from your local machine pointing to the production database:
```bash
DATABASE_URL="your-neon-connection-string" pnpm db:migrate
```

---

## Step 4: Deploy Frontend to Vercel (5 min)

1. Go to [vercel.com](https://vercel.com) → Sign up (connect GitHub)
2. Click **"Add New Project"** → Import your `zoomvconnect` repo
3. Vercel will auto-detect the monorepo. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `cd ../.. && pnpm build --filter @zoomvconnect/web`
   - **Install Command:** `pnpm install`
4. Add **Environment Variables:**

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://api-production-xxxx.up.railway.app` (your Railway API URL) |
   | `NEXT_PUBLIC_LIVEKIT_URL` | `wss://your-project.livekit.cloud` |
   | `NEXT_PUBLIC_SIGNALING_URL` | `wss://signaling-production-xxxx.up.railway.app` |

5. Click **Deploy** → Vercel gives you a URL like `https://zoomvconnect.vercel.app`

### 4b. Update CORS on Railway

Go back to your Railway **API service** → Variables → Update:
```
CORS_ORIGIN=https://zoomvconnect.vercel.app
```

Redeploy the API service.

---

## Step 5: Custom Domain (Optional)

### Vercel (Frontend)
1. In Vercel dashboard → Project Settings → Domains
2. Add your domain (e.g., `zoomvconnect.com`)
3. Add the DNS records Vercel gives you to your domain registrar

### Railway (API)
1. In Railway → API Service → Settings → Custom Domain
2. Add `api.zoomvconnect.com`
3. Add the CNAME record to your DNS

### Railway (Signaling)
1. Same process → add `ws.zoomvconnect.com`

Then update all environment variables to use your custom domains.

---

## Step 6: CI/CD Setup (5 min)

The GitHub Actions workflow (`.github/workflows/deploy.yml`) is already set up. To enable it:

1. **Vercel auto-deploys**: Already works once you connect the GitHub repo
2. **Railway API Token**:
   - Go to Railway → Account Settings → Tokens
   - Create a new token
   - In GitHub → Repo Settings → Secrets → Actions
   - Add secret: `RAILWAY_TOKEN` = your token

Now every push to `main` will auto-deploy everything!

---

## Post-Deployment Checklist

- [ ] Frontend loads at your Vercel URL
- [ ] API responds at `https://your-api.railway.app/api/docs`
- [ ] User registration works
- [ ] User login works
- [ ] Creating a meeting works
- [ ] Video call connects (LiveKit)
- [ ] Chat works in meeting
- [ ] CORS is correctly configured (no browser errors)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **API won't start** | Check Railway logs; ensure DATABASE_URL is correct |
| **CORS errors** | Ensure `CORS_ORIGIN` on Railway matches your Vercel URL exactly |
| **WebSocket won't connect** | Ensure signaling URL uses `wss://` (not `ws://`) |
| **Database errors** | Run `prisma migrate deploy` against production DB |
| **Video not working** | Verify LiveKit API key/secret and URL |
| **Build fails** | Check if `pnpm-lock.yaml` is committed to git |

---

## Monthly Cost Estimate

| Service | Free Tier Limits | Paid Tier |
|---------|-----------------|-----------|
| **Vercel** | 100GB bandwidth | $20/mo |
| **Railway** | $5 credit/mo | $5-20/mo |
| **Neon** | 500MB storage, 190 compute hours | $19/mo |
| **Upstash** | 10K commands/day | $10/mo |
| **LiveKit** | ~50 participant hours | Pay-as-you-go |

**Starting cost: $0–5/mo** for low traffic. Scale from there.
