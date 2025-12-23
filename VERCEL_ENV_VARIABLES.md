# Vercel Environment Variables Setup

## Current Status
Currently, Supabase credentials are **hardcoded** in `src/integrations/supabase/client.ts`, so **you don't need to add environment variables** for the deployment to work.

However, it's **recommended** to use environment variables for better security and configuration management.

---

## Option 1: Deploy Without Environment Variables (Current Setup)
✅ **You can deploy directly without adding any environment variables** - the app will work as-is since credentials are hardcoded.

---

## Option 2: Use Environment Variables (Recommended)

If you want to use environment variables (better practice), add these in Vercel:

### Steps to Add in Vercel Dashboard:

1. Go to your project in Vercel Dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add the following variables:

### Environment Variables to Add:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://flqignqyqpdgvztpqucd.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscWlnbnF5cXBkZ3Z6dHBxdWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTM2NTUsImV4cCI6MjA3MTg2OTY1NX0.dHxWj6i2t_qqzxHCtTSm0f80xDvjo32yIJ6Bbfbr5sY` | Production, Preview, Development |

### Important Notes:

1. **VITE_ Prefix**: In Vite, environment variables must start with `VITE_` to be exposed to the client-side code.

2. **Select Environments**: 
   - ✅ Check **Production**
   - ✅ Check **Preview** (for pull request previews)
   - ✅ Check **Development** (for local development if using Vercel CLI)

3. **After Adding Variables**:
   - You need to **redeploy** your project for the variables to take effect
   - Go to **"Deployments"** tab → Click **"Redeploy"** on the latest deployment

---

## If You Want to Update Code to Use Environment Variables

If you want to update the code to actually use these environment variables (instead of hardcoded values), you would need to modify `src/integrations/supabase/client.ts`:

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://flqignqyqpdgvztpqucd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

This way, it will use environment variables if available, otherwise fall back to hardcoded values.

---

## Summary

**For Quick Deployment (No Changes Needed):**
- ✅ Just deploy - no environment variables needed (current setup works)

**For Best Practices:**
- Add the 2 environment variables listed above in Vercel
- Optionally update the code to use `import.meta.env.VITE_*` variables
- Redeploy after adding variables

---

## Quick Copy-Paste for Vercel:

**Variable 1:**
- Name: `VITE_SUPABASE_URL`
- Value: `https://flqignqyqpdgvztpqucd.supabase.co`

**Variable 2:**
- Name: `VITE_SUPABASE_ANON_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscWlnbnF5cXBkZ3Z6dHBxdWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTM2NTUsImV4cCI6MjA3MTg2OTY1NX0.dHxWj6i2t_qqzxHCtTSm0f80xDvjo32yIJ6Bbfbr5sY`

