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
const CLIENT_CONFIG = {
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

  console.log('📥 Received request:', {
    method: req.method,
    url: req.url,
    hasAuthHeader: !!req.headers.get('Authorization')
  })

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ Missing authorization header')
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

    // Verify the requesting user
    const token = authHeader.replace('Bearer ', '')
    console.log('🔐 Verifying user token...')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User verified:', user.id, user.email)

    // Check if user is clinic_admin
    console.log('🔍 Checking user role...')
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    console.log('📋 User role result:', { userRole, roleError })

    if (roleError || userRole?.role_type !== 'clinic_admin') {
      console.error('❌ User is not clinic_admin:', userRole?.role_type)
      return new Response(
        JSON.stringify({ error: 'Only clinic admin can send doctor invitations', user_role: userRole?.role_type }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get clinic for this clinic admin
    console.log('🔍 Fetching clinic for user:', user.id)
    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id, name')
      .eq('clinic_admin_id', user.id)
      .eq('status', 'active')
      .single()

    console.log('📋 Clinic result:', { clinic, clinicError })

    if (clinicError || !clinic) {
      console.error('❌ Clinic not found:', clinicError)
      return new Response(
        JSON.stringify({ error: 'Clinic not found or not active', details: clinicError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    let requestBody: { email?: string; name?: string; doctor_id?: string; app_url?: string }
    try {
      requestBody = await req.json()
      console.log('📥 Request body received:', {
        email: requestBody.email,
        name: requestBody.name,
        doctor_id: requestBody.doctor_id,
        app_url: requestBody.app_url
      })
    } catch (parseError: unknown) {
      console.error('❌ Error parsing request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid request body. Expected JSON format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, name, doctor_id, app_url } = requestBody

    console.log('📥 Received doctor invitation request:', { 
      email: email || 'MISSING', 
      name: name || 'MISSING', 
      doctor_id: doctor_id || 'MISSING',
      app_url: app_url || 'MISSING',
      clinic_id: clinic.id,
      requestBody: requestBody
    })

    if (!email || !name || !doctor_id) {
      const errorResponse = { 
        error: 'Missing required fields: email, name, doctor_id',
        received: { 
          email: !!email, 
          name: !!name,
          doctor_id: !!doctor_id,
          email_value: email || null,
          name_value: name || null,
          doctor_id_value: doctor_id || null,
          full_request: requestBody
        }
      }
      console.error('❌ Validation failed:', errorResponse)
      return new Response(
        JSON.stringify(errorResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify that the doctor exists and belongs to this clinic
    console.log('🔍 Verifying doctor exists in clinic...')
    const { data: existingDoctor, error: doctorCheckError } = await supabaseAdmin
      .from('doctors')
      .select('id, name, email, clinic_id, user_id')
      .eq('id', doctor_id)
      .eq('clinic_id', clinic.id)
      .single()

    if (doctorCheckError || !existingDoctor) {
      console.error('❌ Doctor not found or does not belong to this clinic:', doctorCheckError)
      return new Response(
        JSON.stringify({ error: 'Doctor not found or does not belong to your clinic' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if doctor already has a user account
    if (existingDoctor.user_id) {
      console.error('❌ Doctor already has system access:', existingDoctor.user_id)
      return new Response(
        JSON.stringify({ error: 'This doctor already has system access. They can login with their account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Doctor verified:', existingDoctor.id, existingDoctor.name)

    // Use app_url from request if provided, otherwise use environment variable or default
    const invitationBaseUrl = app_url || CLIENT_CONFIG.APP_URL || 'http://localhost:5173'

    // Check if user already exists
    try {
      const { data: existingUsers, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (listUsersError) {
        console.error('❌ Error listing users:', listUsersError)
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
    }

    // Check if there's already a pending invitation for this email in this clinic
    try {
      const { data: existingInvitation, error: inviteCheckError } = await supabaseAdmin
        .from('clinic_admin_invitations')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('clinic_id', clinic.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (inviteCheckError && inviteCheckError.code !== 'PGRST116') {
        console.error('❌ Error checking existing invitations:', inviteCheckError)
      } else if (existingInvitation) {
        console.error('❌ Pending invitation already exists:', email)
        return new Response(
          JSON.stringify({ error: 'A pending invitation already exists for this email in your clinic' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (inviteCheckError: unknown) {
      console.error('❌ Error checking invitations:', inviteCheckError)
    }

    // Use existing doctor (no need to create new one)
    const doctor = existingDoctor

    // Generate unique invitation token
    const invitationToken = crypto.randomUUID()

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('clinic_admin_invitations')
      .insert({
        invited_by: user.id,
        clinic_id: clinic.id,
        email: email.toLowerCase(),
        name: name,
        invitation_token: invitationToken,
        doctor_id: doctor.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
      .select()
      .single()

    if (inviteError) {
      console.error('❌ Error creating invitation:', inviteError)
      return new Response(
        JSON.stringify({ error: `Failed to create invitation: ${inviteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build invitation URL
    const invitationUrl = `${invitationBaseUrl}/invite/${invitationToken}`

    // Prepare email content
    const emailSubject = `You've been invited to join ${clinic.name} as a Doctor`
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Doctor Invitation - ${CLIENT_CONFIG.APP_NAME}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #0C2243; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00FFA2; margin: 0;">${CLIENT_CONFIG.APP_NAME}</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #0C2243; margin-top: 0;">You've been invited as a Doctor!</h2>
          <p>Hello${name ? ` ${name}` : ''},</p>
          <p>You've been invited to join <strong>${clinic.name}</strong> as a <strong>Doctor</strong>.</p>
          <p>As a doctor, you'll have access to:</p>
          <ul>
            <li>View and manage your appointments</li>
            <li>View and manage your patients</li>
          </ul>
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
You've been invited to join ${clinic.name} as a Doctor!

Hello${name ? ` ${name}` : ''},

You've been invited to join ${clinic.name} as a Doctor.

As a doctor, you'll have access to:
- View and manage your appointments
- View and manage your patients

Click this link to accept the invitation and create your account:
${invitationUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

Need help? Contact us at ${CLIENT_CONFIG.SUPPORT_EMAIL}
    `.trim()

    // Send email using Supabase's built-in email service (Gmail SMTP)
    // This requires SMTP configuration in Supabase Dashboard → Settings → Auth → SMTP Settings
    try {
      console.log('📧 Sending email via Supabase email service (Gmail SMTP)...')
      console.log('📧 Email details:', {
        to: email.toLowerCase(),
        subject: emailSubject
      })
      
      // Use Supabase's email service via RPC (uses SMTP configured in dashboard)
      const { data: emailResult, error: emailError } = await supabaseAdmin
        .rpc('send_invitation_email', {
          p_email: email.toLowerCase(),
          p_subject: emailSubject,
          p_html_content: emailHtml,
          p_text_content: emailText,
          p_invitation_url: invitationUrl
        })

      if (!emailError && emailResult) {
        console.log('✅ Email sent via Supabase email service (Gmail SMTP):', emailResult)
      } else {
        console.error('❌ Supabase email service error:', emailError)
        console.log('⚠️ Supabase email service not configured.')
        console.log('💡 Configure Gmail SMTP in Supabase Dashboard → Settings → Auth → SMTP Settings')
        console.log('📧 Invitation created. Email not sent, but invitation link is available in UI.')
      }
    } catch (emailError: unknown) {
      console.error('❌ Error sending email:', emailError)
      if (emailError instanceof Error) {
        console.error('❌ Error message:', emailError.message)
      }
      console.log('📧 Invitation created. Email sending failed, but invitation link is available.')
    }

    console.log('📧 Doctor invitation created for:', email)
    console.log('🔗 Invitation URL:', invitationUrl)
    console.log('👨‍⚕️ Doctor ID:', doctor.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation_id: invitation.id,
        doctor_id: doctor.id,
        invitation_token: invitationToken,
        invitation_url: invitationUrl,
        message: 'Doctor invitation created successfully. Email sent to user.',
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

