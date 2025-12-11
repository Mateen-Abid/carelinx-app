# Vercel Deployment Guide

This guide will help you deploy your CareLinix application to Vercel so your team lead and client can test it.

## Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free tier is sufficient)

## Step-by-Step Deployment

### Method 1: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Push Your Code to GitHub

If your code is not already on GitHub:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Ready for deployment"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

#### Step 2: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub repository
5. Click **"Import"**

#### Step 3: Configure Build Settings

Vercel should auto-detect your Vite project, but verify these settings:

- **Framework Preset:** Vite
- **Root Directory:** `./` (leave as default)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

#### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (usually 2-3 minutes)
3. Once deployed, you'll get a URL like: `https://your-project-name.vercel.app`

#### Step 5: Test Your Deployment

1. Visit the deployment URL
2. Test all major features:
   - User authentication
   - Super Admin dashboard
   - Clinic Admin dashboard
   - Public user pages
   - Database connections

### Method 2: Deploy via Vercel CLI

#### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

#### Step 3: Deploy

```bash
# From your project root directory
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (Select your account)
# - Link to existing project? No (for first deployment)
# - Project name? (Enter a name or press Enter for default)
# - Directory? (Press Enter for current directory)
```

#### Step 4: Production Deployment

```bash
# Deploy to production
vercel --prod
```

## Important Notes

### ✅ What's Already Configured

- ✅ `vercel.json` - Vercel configuration file created
- ✅ Build command: `npm run build`
- ✅ Output directory: `dist`
- ✅ SPA routing: Configured to redirect all routes to `index.html`

### 🔒 Security Note

Your Supabase credentials are currently hardcoded in `src/integrations/supabase/client.ts`. This is fine for the **anon key** (it's meant to be public), but for better practice in production, consider:

1. Moving to environment variables
2. Using Vercel's environment variables feature

### 📝 Environment Variables (Optional)

If you want to use environment variables instead of hardcoded values:

1. In Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL` = `https://flqignqyqpdgvztpqucd.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

Then update `src/integrations/supabase/client.ts`:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://flqignqyqpdgvztpqucd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

## Post-Deployment Checklist

- [ ] Test user registration/login
- [ ] Test Super Admin dashboard
- [ ] Test Clinic Admin dashboard
- [ ] Test Public User pages
- [ ] Verify database connections work
- [ ] Test all CRUD operations
- [ ] Check mobile responsiveness
- [ ] Verify all routes work (no 404 errors)

## Troubleshooting

### Build Fails

1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify Node.js version (Vercel uses Node 18+ by default)

### 404 Errors on Routes

- The `vercel.json` file includes rewrites to handle SPA routing
- If issues persist, check the build output directory

### Database Connection Issues

- Verify Supabase project is active
- Check if RLS policies allow public access where needed
- Ensure Supabase URL and keys are correct

## Sharing with Team Lead & Client

Once deployed:

1. **Share the Vercel URL** - `https://your-project-name.vercel.app`
2. **Create Test Accounts:**
   - Super Admin account
   - Clinic Admin account
   - Public User account
3. **Provide Access:**
   - Vercel dashboard access (optional)
   - Or just the deployed URL

## Continuous Deployment

Vercel automatically deploys when you push to your main branch:
- Every `git push` triggers a new deployment
- Preview deployments for pull requests
- Production deployments for main branch

## Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

---

**Need Help?** Check Vercel documentation: [vercel.com/docs](https://vercel.com/docs)

