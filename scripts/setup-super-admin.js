/**
 * Setup Super Admin Script
 * 
 * This script can be run to automatically create and assign super_admin role
 * Run this after setting up your Supabase project:
 * 
 * Option 1: Run via Supabase CLI
 *   supabase functions serve assign-super-admin
 *   Then call: POST http://localhost:54321/functions/v1/assign-super-admin
 *   Body: { "email": "mateenofficial42@gmail.com", "password": "admin1122" }
 * 
 * Option 2: Run via Supabase Dashboard
 *   Go to Edge Functions > assign-super-admin > Invoke
 *   Body: { "email": "mateenofficial42@gmail.com", "password": "admin1122" }
 * 
 * Option 3: Use the auto-assignment in code (see src/contexts/AuthContext.tsx)
 *   The code will automatically assign the role on first login
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://flqignqyqpdgvztpqucd.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscWlnbnF5cXBkZ3Z6dHBxdWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTM2NTUsImV4cCI6MjA3MTg2OTY1NX0.dHxWj6i2t_qqzxHCtTSm0f80xDvjo32yIJ6Bbfbr5sY';

const SUPER_ADMIN_EMAIL = 'mateenofficial42@gmail.com';
const SUPER_ADMIN_PASSWORD = 'admin1122';

async function setupSuperAdmin() {
  try {
    console.log('Setting up Super Admin...');
    
    // Call the Edge Function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/assign-super-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Super Admin setup successful!');
      console.log('Response:', data);
    } else {
      console.error('❌ Error setting up Super Admin:', data);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  setupSuperAdmin();
}

module.exports = { setupSuperAdmin };

