# 🔒 Security Guide for CareLinx App

## ⚠️ What You're Seeing in DevTools is NORMAL

When you open Chrome DevTools and see Supabase API calls in the Network tab, **this is expected behavior** for serverless applications. Here's why it's actually secure:

---

## 🛡️ How Supabase Security Actually Works

### **The Key Concept:**
Your app uses **Supabase's anon (publishable) key** in the frontend. This is **designed to be public** and is **NOT a security risk** when used correctly.

### **Where the Real Security Happens:**

1. **Row Level Security (RLS) Policies** 
   - Every database table has RLS policies that check user permissions
   - Even if someone tries to manipulate API calls, the database blocks unauthorized access
   - RLS runs at the PostgreSQL level, not in your frontend code

2. **Authentication Tokens**
   - When users log in, Supabase issues a JWT (JSON Web Token)
   - This token is included in every request
   - The token contains user ID and role information
   - RLS policies use this token to determine what data users can access

3. **Service Role Key** (The Dangerous One)
   - This key bypasses ALL security rules
   - It's stored in Edge Functions only (server-side)
   - It's NEVER exposed to the frontend
   - In your app: ✅ Service role key is safe in `supabase/functions/`

---

## 📊 Current Security Status

### ✅ **What's Already Protected:**

1. **RLS Policies Enabled** on all tables:
   - ✅ Bookings: Users can only see their own + role-based access
   - ✅ Profiles: Users can only see their own profile
   - ✅ Clinics: Clinic admins see only their clinic
   - ✅ Doctors: Proper role-based access control
   - ✅ User Roles: Protected role assignment system

2. **Authentication**:
   - ✅ Email/password authentication via Supabase Auth
   - ✅ Automatic session management
   - ✅ Token-based authorization

3. **Edge Functions**:
   - ✅ Sensitive operations (booking processing, invitations) use Edge Functions
   - ✅ Service role key is server-side only

### ⚠️ **What We Just Added:**

1. **Rate Limiting**
   - New table to track API request frequency
   - Function to check rate limits before processing requests
   - Prevents brute force attacks and API abuse

2. **Security Audit Logs**
   - Tracks all sensitive operations (role changes, booking modifications)
   - Only super_admin can view audit logs
   - Helps detect suspicious activity

3. **Automatic Logging**
   - Triggers that log all bookings and role changes
   - Audit trail for compliance and security monitoring

---

## 🚀 Immediate Actions to Take

### **1. Apply the New Security Migration**

Run this in your Supabase SQL Editor:

```bash
# If using Supabase CLI locally
supabase migration up

# Or copy the contents of:
# supabase/migrations/20260112000000_security_hardening.sql
# and run it in Supabase Dashboard > SQL Editor
```

### **2. Enable Additional Supabase Security Features**

Go to **Supabase Dashboard > Authentication > URL Configuration**:

1. **Set Site URL**: `https://your-production-domain.com`
2. **Add Redirect URLs**: Only your trusted domains
3. **Enable Email Confirmations**: Require email verification

Go to **Supabase Dashboard > Authentication > Providers**:

1. **Disable unused providers**: Only keep email/password if that's all you need
2. **Enable CAPTCHA**: Add reCAPTCHA for registration

### **3. Configure Vercel Environment Variables**

In your Vercel dashboard (or deployment platform):

1. Create a `.env` file locally (already gitignored):
   ```env
   VITE_SUPABASE_URL=https://flqignqyqpdgvztpqucd.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

2. Add these to Vercel Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

3. **Note**: Even though these will be bundled in your frontend build (which is fine), using env vars makes it easier to rotate keys if needed.

### **4. Enable Supabase Network Restrictions** (Optional Premium Feature)

If you have Supabase Pro:
- Go to **Project Settings > Network**
- Add IP allowlists for super_admin operations
- Enable database connection pooling

---

## 🔐 Additional Security Best Practices

### **1. Implement Rate Limiting in Frontend**

Add this utility to check rate limits before making requests:

```typescript
// src/utils/rateLimiter.ts
import { supabase } from '@/integrations/supabase/client';

export const checkRateLimit = async (action: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      action_type: action,
      max_attempts: 10,
      time_window_minutes: 5
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true; // Allow in case of error
  }
};
```

### **2. Add Request Validation**

Before making sensitive operations, validate inputs:

```typescript
// Example: Before creating a booking
if (!await checkRateLimit('create_booking')) {
  toast.error('Too many requests. Please try again later.');
  return;
}
```

### **3. Monitor Security Audit Logs**

Create a Super Admin page to view security logs:

```typescript
// Query audit logs (super_admin only)
const { data: auditLogs } = await supabase
  .from('security_audit_log')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100);
```

### **4. Rotate Keys Regularly**

- Every 90 days, generate new Supabase anon keys
- Update in environment variables
- Redeploy application

### **5. Enable Content Security Policy (CSP)**

Add to your `index.html` or hosting platform headers:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               connect-src 'self' https://*.supabase.co; 
               img-src 'self' data: https:; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval';">
```

---

## 🎯 What Attackers CANNOT Do (With Current Setup)

Even though they can see API calls in DevTools:

❌ **Cannot access other users' data** - RLS policies block this  
❌ **Cannot modify database directly** - RLS policies prevent unauthorized writes  
❌ **Cannot bypass authentication** - JWT tokens are validated server-side  
❌ **Cannot escalate privileges** - Role changes require super_admin access  
❌ **Cannot use service role key** - It's server-side only  
❌ **Cannot spam APIs** - Rate limiting prevents this (after migration)  
❌ **Cannot hide malicious actions** - Audit logs track everything (after migration)  

---

## 🚨 What to Monitor

### **Signs of Security Issues:**

1. **Unusual number of failed login attempts** - Check Supabase Auth logs
2. **Rapid API calls from single user** - Check rate_limits table
3. **Unexpected role changes** - Check security_audit_log table
4. **Failed RLS policy checks** - Check Supabase logs

### **Where to Check:**

1. **Supabase Dashboard > Logs > API Logs**
2. **Supabase Dashboard > Authentication > Users** (check login patterns)
3. **Your database > security_audit_log table** (after applying migration)

---

## 📚 Learn More

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod)
- [JWT Token Security](https://jwt.io/introduction)

---

## ✅ Next Steps

1. [ ] Apply the security hardening migration (`20260112000000_security_hardening.sql`)
2. [ ] Enable email verification in Supabase Dashboard
3. [ ] Add CAPTCHA to registration forms
4. [ ] Set up environment variables for production
5. [ ] Implement rate limiting checks in critical operations
6. [ ] Create super admin page to monitor audit logs
7. [ ] Set up alerts for suspicious activity
8. [ ] Document security procedures for your team

---

## 💬 Remember

**The anon key being visible is NOT a vulnerability** - it's how Supabase works by design. Your real protection comes from:

1. ✅ Row Level Security policies (already implemented)
2. ✅ JWT-based authentication (already implemented)
3. ✅ Service role key protection (already implemented)
4. ✨ Rate limiting (newly added - apply migration)
5. ✨ Audit logging (newly added - apply migration)

Your app is **more secure than most traditional setups** because security is enforced at the database level, not just in application code!

