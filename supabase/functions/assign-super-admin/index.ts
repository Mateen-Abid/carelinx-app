import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, password } = await req.json()

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const user = existingUser.users.find(u => u.email === email)

    let userId: string

    if (user) {
      // User exists, use their ID
      userId = user.id
      console.log(`User ${email} already exists, using existing ID: ${userId}`)
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: 'Super Admin'
        }
      })

      if (createError) {
        throw createError
      }

      userId = newUser.user.id
      console.log(`Created new user ${email} with ID: ${userId}`)
    }

    // Update profile to set super_admin role
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userId,
        email: email,
        full_name: 'Super Admin',
        role: 'super_admin'
      }, {
        onConflict: 'user_id'
      })

    if (updateError) {
      throw updateError
    }

    console.log(`Successfully assigned super_admin role to ${email}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Super admin role assigned to ${email}`,
        userId: userId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error: any) {
    console.error('Error assigning super admin:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

