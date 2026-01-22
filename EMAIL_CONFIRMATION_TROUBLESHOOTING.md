# Email Confirmation Troubleshooting Guide

If you're not receiving confirmation emails during signup, follow these steps:

## 1. Check Supabase Dashboard Settings

### A. Enable Email Confirmation
1. Go to **Supabase Dashboard** → **Authentication** → **Providers** → **Email**
2. Make sure **"Confirm email"** toggle is **ENABLED**
3. This is required for Supabase to send confirmation emails

### B. Configure SMTP Settings
1. Go to **Supabase Dashboard** → **Settings** → **Auth** → **SMTP Settings**
2. Configure your SMTP provider (Gmail, SendGrid, etc.)
3. **Without SMTP configuration, emails will NOT be sent**

**Common SMTP Providers:**
- **Gmail**: Use App Password (not regular password)
- **SendGrid**: Use API key
- **Mailgun**: Use API key
- **AWS SES**: Use access keys

### C. Whitelist Redirect URLs
1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Add your frontend URL to **Redirect URLs**:
   - `http://localhost:8080/auth?mode=login&message=email_confirmed`
   - `https://yourdomain.com/auth?mode=login&message=email_confirmed`
3. This ensures the confirmation link works correctly

## 2. Check Your Email

### A. Check Spam/Junk Folder
- Confirmation emails often end up in spam
- Check all email folders (Inbox, Spam, Junk, Promotions, etc.)

### B. Check Email Address
- Make sure you entered the correct email address
- Check for typos in the email

### C. Wait a Few Minutes
- Emails can take 1-5 minutes to arrive
- Check again after waiting

## 3. Use Resend Confirmation Email Feature

If you didn't receive the email:
1. Go to the signup page
2. Click **"Resend Confirmation Email"** button
3. Check your email again

## 4. Check Backend Logs

Check your backend console for these messages:
- `✅ Signup successful - confirmation email should be sent automatically`
- `📧 Email sent to: [your-email]`
- `❌ Error resending confirmation email:` (if there's an error)

## 5. Verify Environment Variables

Make sure these are set in `backend/.env`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
FRONTEND_URL=http://localhost:8080  # or your production URL
```

## 6. Test SMTP Configuration

You can test if SMTP is working by:
1. Going to **Supabase Dashboard** → **Settings** → **Auth** → **SMTP Settings**
2. Click **"Send Test Email"**
3. If test email fails, your SMTP configuration is incorrect

## 7. Common Issues and Solutions

### Issue: "Email not sent" in logs
**Solution**: Configure SMTP in Supabase Dashboard

### Issue: "Redirect URL not whitelisted"
**Solution**: Add your frontend URL to Redirect URLs in Supabase Dashboard

### Issue: "User already exists" but no email
**Solution**: 
- Use "Resend Confirmation Email" button
- Or manually confirm email in Supabase Dashboard → Authentication → Users

### Issue: Emails going to spam
**Solution**: 
- Check spam folder
- Configure SPF/DKIM records for your domain (if using custom domain)
- Use a reputable SMTP provider (SendGrid, Mailgun, etc.)

## 8. Manual Email Confirmation (Development Only)

If you need to manually confirm an email for testing:
1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find the user
3. Click on the user
4. Click **"Confirm Email"** button

**Note**: This is only for development/testing. In production, users should confirm via email.

## 9. Still Not Working?

If none of the above works:
1. Check Supabase status page: https://status.supabase.com
2. Verify your Supabase project is active (not paused)
3. Check if you've exceeded email sending limits
4. Contact Supabase support if issue persists

## Quick Checklist

- [ ] "Confirm email" toggle is ENABLED in Supabase Dashboard
- [ ] SMTP is configured in Supabase Dashboard
- [ ] Redirect URLs are whitelisted
- [ ] Checked spam/junk folder
- [ ] Waited a few minutes for email
- [ ] Tried "Resend Confirmation Email" button
- [ ] Backend logs show no errors
- [ ] Environment variables are set correctly

