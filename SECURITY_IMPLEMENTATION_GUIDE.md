# 🚀 Security Implementation Guide

## Quick Start: Apply Security Updates NOW

### Step 1: Apply Database Migration (5 minutes)

**Option A: Using Supabase Dashboard**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**
4. Copy and paste the entire contents of `supabase/migrations/20260112000000_security_hardening.sql`
5. Click **Run**

**Option B: Using Supabase CLI** (if you have it set up)
```bash
supabase migration up
```

### Step 2: Verify Migration Success

Run this query in SQL Editor to verify tables were created:

```sql
-- Check if security tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('rate_limits', 'security_audit_log');

-- Should return 2 rows
```

### Step 3: Enable Rate Limiting in Your App (10 minutes)

Add rate limiting to critical operations:

#### Example 1: Protect Booking Creation

**File:** `src/contexts/BookingContext.tsx`

```typescript
import { checkRateLimitWithConfig, RATE_LIMITS } from '@/utils/rateLimiter';
import { toast } from 'sonner';

// In your booking function, add this BEFORE the booking creation:
const handleBooking = async (bookingData) => {
  // Check rate limit first
  const isAllowed = await checkRateLimitWithConfig(RATE_LIMITS.CREATE_BOOKING);
  
  if (!isAllowed) {
    toast.error('Too many booking attempts. Please wait a few minutes and try again.');
    return;
  }

  // Continue with booking creation
  // ... rest of your code
};
```

#### Example 2: Protect Login Attempts

**File:** `src/contexts/AuthContext.tsx`

```typescript
import { checkRateLimitWithConfig, RATE_LIMITS, logSecurityEvent } from '@/utils/rateLimiter';

// In your login function:
const handleLogin = async (email: string, password: string) => {
  // Check rate limit
  const isAllowed = await checkRateLimitWithConfig(RATE_LIMITS.LOGIN_ATTEMPT);
  
  if (!isAllowed) {
    toast.error('Too many login attempts. Please wait 15 minutes and try again.');
    await logSecurityEvent('login_attempt', 'auth.users', email, false, 'Rate limit exceeded');
    return;
  }

  try {
    // Your login logic here
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      await logSecurityEvent('login_attempt', 'auth.users', email, false, error.message);
      throw error;
    }

    await logSecurityEvent('login_attempt', 'auth.users', data.user?.id, true);
    
  } catch (error) {
    // Handle error
  }
};
```

#### Example 3: Protect Excel Export

**File:** `src/pages/admin/Appointments.tsx` (and other pages with export)

```typescript
import { checkRateLimitWithConfig, RATE_LIMITS } from '@/utils/rateLimiter';

const handleExportToExcel = async () => {
  // Check rate limit
  const isAllowed = await checkRateLimitWithConfig(RATE_LIMITS.EXPORT_DATA);
  
  if (!isAllowed) {
    toast.error('Too many export requests. Please wait a few minutes.');
    return;
  }

  // Continue with export
  const exportData = filteredAppointmentsData.map((appointment) => ({
    // ... your export logic
  }));

  exportToExcel(exportData, 'Appointments');
};
```

### Step 4: Enable Supabase Security Features (5 minutes)

1. **Go to Supabase Dashboard > Authentication > Providers**
   - Disable any providers you're not using
   - Keep only "Email" if that's all you need

2. **Go to Authentication > URL Configuration**
   - Set **Site URL**: Your production domain (e.g., `https://carelinx.vercel.app`)
   - Add **Redirect URLs**: Only your trusted domains
   - **Save changes**

3. **Go to Authentication > Email Templates** (optional but recommended)
   - Customize confirmation email
   - Add your branding

### Step 5: Enable Email Verification (Recommended)

1. **Go to Supabase Dashboard > Authentication > Providers**
2. Click **Email** provider
3. **Enable "Confirm email"** toggle
4. **Save changes**

This prevents fake account creation.

---

## 📊 How to Monitor Security

### View Audit Logs (Super Admin Only)

Create a new page at `src/pages/admin/SecurityLogs.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  success: boolean;
  error_message: string;
  created_at: string;
}

export default function SecurityLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('security_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return;
    }

    setLogs(data || []);
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Security Audit Logs</h1>
      
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Time</th>
            <th className="text-left p-2">User ID</th>
            <th className="text-left p-2">Action</th>
            <th className="text-left p-2">Table</th>
            <th className="text-left p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b">
              <td className="p-2">{new Date(log.created_at).toLocaleString()}</td>
              <td className="p-2 font-mono text-sm">{log.user_id?.substring(0, 8)}...</td>
              <td className="p-2">{log.action}</td>
              <td className="p-2">{log.table_name}</td>
              <td className="p-2">
                {log.success ? (
                  <span className="text-green-600">✓ Success</span>
                ) : (
                  <span className="text-red-600">✗ Failed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Add route in `src/App.tsx`:

```typescript
import SecurityLogs from '@/pages/admin/SecurityLogs';

// In your routes:
<Route path="/admin/security-logs" element={<SecurityLogs />} />
```

Add menu item in `src/components/admin/AdminSidebar.tsx`:

```typescript
{ path: '/admin/security-logs', label: 'Security Logs', icon: Shield }
```

---

## 🔐 Additional Security Hardening (Optional)

### 1. Add Content Security Policy

Add to `index.html` in `<head>` section:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               connect-src 'self' https://*.supabase.co; 
               img-src 'self' data: https:; 
               style-src 'self' 'unsafe-inline';
               script-src 'self' 'unsafe-inline' 'unsafe-eval';">
```

### 2. Add CAPTCHA to Registration

1. Get reCAPTCHA keys from [Google reCAPTCHA](https://www.google.com/recaptcha/admin)
2. Add to your signup form
3. Verify on backend using Edge Function

### 3. Enable 2FA (Supabase Premium Feature)

If you upgrade to Supabase Pro:
1. Go to **Authentication > Settings**
2. Enable **Multi-Factor Authentication**
3. Update your login UI to support 2FA

### 4. Set Up Monitoring Alerts

Use Supabase webhooks to send alerts:
1. Go to **Database > Webhooks**
2. Create webhook for `security_audit_log` table
3. Send to Discord/Slack when suspicious activity detected

---

## ✅ Security Checklist

### Immediate (Do Now)
- [ ] Apply security hardening migration
- [ ] Enable email verification in Supabase
- [ ] Set correct Site URL and Redirect URLs
- [ ] Add rate limiting to booking creation
- [ ] Add rate limiting to login attempts

### Short Term (This Week)
- [ ] Implement rate limiting on all critical operations
- [ ] Create security logs viewing page for super admin
- [ ] Add CAPTCHA to registration
- [ ] Set up monitoring alerts
- [ ] Review and tighten RLS policies

### Medium Term (This Month)
- [ ] Conduct security audit
- [ ] Set up automated security scanning
- [ ] Create incident response plan
- [ ] Train team on security best practices
- [ ] Implement Content Security Policy

### Long Term (Ongoing)
- [ ] Regular security reviews (monthly)
- [ ] Rotate Supabase keys (quarterly)
- [ ] Update dependencies regularly
- [ ] Monitor audit logs weekly
- [ ] Review rate limit thresholds based on usage

---

## 🆘 If You Suspect a Security Breach

1. **Check audit logs** in `security_audit_log` table
2. **Check rate limits** in `rate_limits` table for unusual patterns
3. **Check Supabase logs**: Dashboard > Logs > API Logs
4. **Revoke sessions**: Auth > Users > [User] > Revoke Session
5. **Reset credentials**: Generate new anon key if compromised
6. **Contact Supabase support** if needed

---

## 📞 Need Help?

- Supabase Discord: https://discord.supabase.com
- Supabase Docs: https://supabase.com/docs
- Security Issues: security@supabase.io

---

## 🎯 Summary

**What We Did:**
✅ Added rate limiting system  
✅ Added security audit logging  
✅ Created rate limiter utility  
✅ Updated Supabase client to use env vars  
✅ Provided implementation examples  

**What You Need to Do:**
1. Apply the migration (5 min)
2. Add rate limiting to key operations (30 min)
3. Enable Supabase security settings (5 min)
4. Test everything (15 min)

**Total Time: ~1 hour to significantly improve security**

