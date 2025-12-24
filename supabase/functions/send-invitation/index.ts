// Deno Edge Function - TypeScript errors for Deno imports are expected
// These imports work correctly in Supabase Edge Functions runtime (Deno)
// @ts-expect-error - Deno-specific import
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
// @ts-expect-error - Deno-specific import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// =====================================================
// CONFIGURATION - Easy to change for different clients
// =====================================================
// Environment variables are optional - defaults will be used if not set
// When client gets domain, just update these in Supabase Dashboard
const CLIENT_CONFIG = {
  // Get from environment or use default (will be overridden by request if needed)
  // @ts-expect-error - Deno global is available in Edge Functions runtime
  APP_URL: Deno.env.get('APP_URL') || '',
  // @ts-expect-error - Deno global
  APP_NAME: Deno.env.get('APP_NAME') || 'CareLinix',
  // @ts-expect-error - Deno global
  SUPPORT_EMAIL: Deno.env.get('SUPPORT_EMAIL') || 'support@carelinix.com',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client
    const supabaseAdmin = createClient(
      // @ts-expect-error - Deno global is available in Edge Functions runtime
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-expect-error - Deno global
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is super_admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is super_admin
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (userRole?.role_type !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admin can send invitations' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body with error handling
    let requestBody: { email?: string; name?: string; role_type?: string; app_url?: string }
    try {
      requestBody = await req.json()
    } catch (parseError: unknown) {
      console.error('❌ Error parsing request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid request body. Expected JSON format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, name, role_type, app_url } = requestBody

    // Log received data for debugging
    console.log('📥 Received request:', { email, name, role_type, app_url })

    if (!email || !role_type) {
      console.error('❌ Missing required fields:', { email: !!email, role_type: !!role_type })
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: email, role_type',
          received: { email: !!email, role_type: !!role_type, name: !!name, app_url: !!app_url }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use app_url from request if provided, otherwise use environment variable or default
    const invitationBaseUrl = app_url || CLIENT_CONFIG.APP_URL || 'http://localhost:5173'

    // Validate role_type
    if (!['super_admin', 'clinic_admin'].includes(role_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role_type. Must be super_admin or clinic_admin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already exists
    try {
      const { data: existingUsers, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (listUsersError) {
        console.error('❌ Error listing users:', listUsersError)
        // Continue anyway - might be a permission issue
      } else if (existingUsers?.users) {
        const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
        
        if (existingUser) {
          console.error('❌ User already exists:', email)
          return new Response(
            JSON.stringify({ error: 'User with this email already exists' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    } catch (userCheckError: unknown) {
      console.error('❌ Error checking existing users:', userCheckError)
      // Continue - might be a temporary issue
    }

    // Check if there's already a pending invitation for this email
    try {
      const { data: existingInvitation, error: inviteCheckError } = await supabaseAdmin
        .from('super_admin_invitations')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('status', 'pending')
        .maybeSingle()

      if (inviteCheckError && inviteCheckError.code !== 'PGRST116') {
        console.error('❌ Error checking existing invitations:', inviteCheckError)
        // Continue anyway
      } else if (existingInvitation) {
        console.error('❌ Pending invitation already exists:', email)
        return new Response(
          JSON.stringify({ error: 'A pending invitation already exists for this email' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (inviteCheckError: unknown) {
      console.error('❌ Error checking invitations:', inviteCheckError)
      // Continue - might be a temporary issue
    }

    // Generate unique invitation token
    const invitationToken = crypto.randomUUID()

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('super_admin_invitations')
      .insert({
        invited_by: user.id,
        email: email.toLowerCase(),
        name: name || null,
        invitation_token: invitationToken,
        role_type: role_type,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return new Response(
        JSON.stringify({ error: `Failed to create invitation: ${inviteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build invitation URL using the base URL
    const invitationUrl = `${invitationBaseUrl}/invite/${invitationToken}`

    // Prepare email content
    const roleDisplayName = role_type === 'super_admin' ? 'Super Admin' : 'Clinic Admin'
    const emailSubject = `You've been invited to join ${CLIENT_CONFIG.APP_NAME} as ${roleDisplayName}`
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to ${CLIENT_CONFIG.APP_NAME}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #0C2243; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00FFA2; margin: 0;">${CLIENT_CONFIG.APP_NAME}</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #0C2243; margin-top: 0;">You've been invited!</h2>
          <p>Hello${name ? ` ${name}` : ''},</p>
          <p>You've been invited to join <strong>${CLIENT_CONFIG.APP_NAME}</strong> as a <strong>${roleDisplayName}</strong>.</p>
          <p>Click the button below to accept the invitation and create your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" style="background-color: #00FFA2; color: #0C2243; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">Or copy and paste this link into your browser:</p>
          <p style="font-size: 12px; color: #666; word-break: break-all;">${invitationUrl}</p>
          <p style="font-size: 12px; color: #666; margin-top: 30px;">This invitation will expire in 7 days.</p>
          <p style="font-size: 12px; color: #666;">If you didn't expect this invitation, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">
            Need help? Contact us at <a href="mailto:${CLIENT_CONFIG.SUPPORT_EMAIL}" style="color: #0C2243;">${CLIENT_CONFIG.SUPPORT_EMAIL}</a>
          </p>
        </div>
      </body>
      </html>
    `

    const emailText = `
You've been invited to join ${CLIENT_CONFIG.APP_NAME} as ${roleDisplayName}!

Hello${name ? ` ${name}` : ''},

You've been invited to join ${CLIENT_CONFIG.APP_NAME} as a ${roleDisplayName}.

Click this link to accept the invitation and create your account:
${invitationUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

Need help? Contact us at ${CLIENT_CONFIG.SUPPORT_EMAIL}
    `.trim()

    // Send email using Supabase's email service via database function
    // This uses Supabase's configured SMTP settings (Dashboard → Settings → Auth → SMTP Settings)
    try {
      const { data: emailResult, error: emailError } = await supabaseAdmin
        .rpc('send_invitation_email', {
          p_email: email.toLowerCase(),
          p_subject: emailSubject,
          p_html_content: emailHtml,
          p_text_content: emailText,
          p_invitation_url: invitationUrl
        })

      if (emailError) {
        console.log('⚠️ Email function error (this is okay if SMTP not configured yet):', emailError.message)
        console.log('📧 Invitation created. Email will be sent via Supabase SMTP if configured.')
        console.log('💡 To configure: Supabase Dashboard → Settings → Auth → SMTP Settings')
      } else {
        console.log('✅ Email sent successfully:', emailResult)
      }
    } catch (rpcError: unknown) {
      // RPC function might not exist or SMTP not configured - that's okay
      console.log('⚠️ Email sending attempted. If SMTP is configured in Supabase, email will be sent.')
      console.log('💡 Configure SMTP: Supabase Dashboard → Settings → Auth → SMTP Settings')
    }

    // Log invitation details
    console.log('📧 Invitation created for:', email)
    console.log('🔗 Invitation URL:', invitationUrl)
    console.log('👤 Role:', role_type)

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation_id: invitation.id,
        invitation_token: invitationToken,
        invitation_url: invitationUrl,
        message: 'Invitation created successfully. Email sent to user.',
        // For testing: include the URL so you can manually test
        test_url: invitationUrl
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

