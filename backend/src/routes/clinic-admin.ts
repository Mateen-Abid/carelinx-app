import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/clinic-admin/clinic
 * Create a new clinic (for onboarding)
 */
router.post('/clinic', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { name, email, description, specialties, logo_url, address } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const { data: clinicData, error } = await supabaseAdmin
      .from('clinics')
      .insert({
        name,
        email,
        address: address || '',
        description: description || null,
        specialties: specialties || null,
        logo_url: logo_url || null,
        clinic_admin_id: userId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating clinic:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ clinic: clinicData });
  } catch (error: any) {
    console.error('❌ Create clinic error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/clinic-admin/clinic
 * Update clinic details
 */
router.patch('/clinic', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Verify clinic belongs to user
    const { data: existingClinic, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('clinic_admin_id', userId)
      .maybeSingle();

    if (clinicError || !existingClinic) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    const { data: clinicData, error } = await supabaseAdmin
      .from('clinics')
      .update(updates)
      .eq('id', existingClinic.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating clinic:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ clinic: clinicData });
  } catch (error: any) {
    console.error('❌ Update clinic error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/clinic-admin/clinic/operating-hours
 * Update clinic operating hours
 */
router.post('/clinic/operating-hours', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { hours } = req.body; // Array of { day_of_week, opening_time, closing_time, is_closed }

    if (!Array.isArray(hours)) {
      return res.status(400).json({ error: 'Hours must be an array' });
    }

    // Get clinic ID
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('clinic_admin_id', userId)
      .maybeSingle();

    if (clinicError || !clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    // Delete existing hours
    await supabaseAdmin
      .from('clinic_operating_hours')
      .delete()
      .eq('clinic_id', clinicData.id);

    // Insert new hours
    const hoursToInsert = hours.map((h: any) => ({
      clinic_id: clinicData.id,
      day_of_week: h.day_of_week,
      opening_time: h.opening_time || null,
      closing_time: h.closing_time || null,
      is_closed: h.is_closed || false,
    }));

    const { data: hoursData, error } = await supabaseAdmin
      .from('clinic_operating_hours')
      .insert(hoursToInsert)
      .select();

    if (error) {
      console.error('❌ Error updating operating hours:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ operatingHours: hoursData });
  } catch (error: any) {
    console.error('❌ Update operating hours error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/clinic-admin/clinic
 * Get clinic for authenticated clinic admin
 */
router.get('/clinic', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    
    const { data: clinicData, error } = await supabaseAdmin
      .from('clinics')
      .select('id, name, status, logo_url, specialties, email, contact_phone, contact_email, address, description, registration_date')
      .eq('clinic_admin_id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching clinic:', error);
      return res.status(400).json({ error: error.message });
    }

    if (!clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    // Fetch operating hours
    const { data: hoursData } = await supabaseAdmin
      .from('clinic_operating_hours')
      .select('day_of_week, opening_time, closing_time, is_closed')
      .eq('clinic_id', clinicData.id)
      .order('day_of_week', { ascending: true });

    res.json({
      clinic: clinicData,
      operatingHours: hoursData || []
    });
  } catch (error: any) {
    console.error('❌ Get clinic error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/clinic-admin/bookings
 * Get bookings for clinic admin's clinic with profiles
 */
router.get('/bookings', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { timeFilter } = req.query;

    // Get clinic ID
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id, name')
      .eq('clinic_admin_id', userId)
      .maybeSingle();

    if (clinicError || !clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    // Build query
    let query = supabaseAdmin
      .from('bookings')
      .select('*')
      .or(`clinic_id.eq.${clinicData.id},clinic.eq.${clinicData.name}`)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    // Apply time filter if provided
    if (timeFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      query = query.eq('appointment_date', today);
    } else if (timeFilter === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      query = query.eq('appointment_date', tomorrowStr);
    }

    const { data: bookingsData, error: bookingsError } = await query;

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
      return res.status(400).json({ error: bookingsError.message });
    }

    // Fetch profiles for bookings
    const userIds = [...new Set((bookingsData || []).map((b: any) => b.user_id))];
    let profilesMap = new Map();
    
    if (userIds.length > 0) {
      const { data: profilesData } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      profilesData?.forEach((profile: any) => {
        profilesMap.set(profile.user_id, profile);
      });
    }

    // Attach profiles to bookings
    const bookingsWithProfiles = (bookingsData || []).map((booking: any) => ({
      ...booking,
      profile: profilesMap.get(booking.user_id) || null,
    }));

    res.json({ bookings: bookingsWithProfiles });
  } catch (error: any) {
    console.error('❌ Get bookings error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/clinic-admin/profile
 * Get profile for authenticated clinic admin
 */
router.get('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    const { data: profileData, error } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, created_at, role')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching profile:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ profile: profileData });
  } catch (error: any) {
    console.error('❌ Get profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/clinic-admin/team-members
 * Get team members (clinic admin invitations) for clinic
 */
router.get('/team-members', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    // Get clinic ID
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('clinic_admin_id', userId)
      .eq('status', 'active')
      .single();

    if (clinicError || !clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    // Fetch invitations
    const { data, error } = await supabaseAdmin
      .from('clinic_admin_invitations')
      .select('*')
      .eq('clinic_id', clinicData.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching team members:', error);
      return res.status(400).json({ error: error.message });
    }

    // Map to team member format
    const teamMembers = (data || []).map((invitation: any) => ({
      id: invitation.id,
      name: invitation.name || invitation.email || 'N/A',
      email: invitation.email,
      status: invitation.status,
      created_at: invitation.created_at,
      doctor_id: invitation.doctor_id,
    }));

    res.json({ teamMembers });
  } catch (error: any) {
    console.error('❌ Get team members error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/clinic-admin/invitations
 * Send doctor invitation (clinic admin)
 */
router.post('/invitations', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { email, name, doctor_id, app_url } = req.body;

    if (!email || !doctor_id) {
      return res.status(400).json({ error: 'Missing required fields: email, doctor_id' });
    }

    // Get clinic ID for the authenticated clinic admin
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('clinic_admin_id', userId)
      .eq('status', 'active')
      .single();

    if (clinicError || !clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    // Ensure doctor belongs to this clinic
    const { data: doctorData, error: doctorError } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('id', doctor_id)
      .eq('clinic_id', clinicData.id)
      .single();

    if (doctorError || !doctorData) {
      return res.status(400).json({ error: 'Doctor not found for this clinic' });
    }

    // Prevent duplicate pending invitation for same email in this clinic
    const { data: existingInvite, error: inviteCheckError } = await supabaseAdmin
      .from('clinic_admin_invitations')
      .select('id')
      .eq('clinic_id', clinicData.id)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (inviteCheckError && inviteCheckError.code !== 'PGRST116') {
      return res.status(400).json({ error: inviteCheckError.message });
    }

    if (existingInvite) {
      return res.status(400).json({ error: 'A pending invitation already exists for this email' });
    }

    const invitationToken = crypto.randomUUID();

    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('clinic_admin_invitations')
      .insert({
        invited_by: userId,
        email: email.toLowerCase(),
        name: name?.trim() || null,
        invitation_token: invitationToken,
        status: 'pending',
        clinic_id: clinicData.id,
        doctor_id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error('❌ Error creating doctor invitation:', inviteError);
      return res.status(500).json({ error: inviteError.message });
    }

    const invitationBaseUrl = app_url || process.env.FRONTEND_URL || 'http://localhost:8080';
    const invitationUrl = `${invitationBaseUrl}/invite/${invitationToken}`;

    // Send email via RPC (uses SMTP configured in Supabase)
    const emailSubject = `You've been invited to join CareLinx as a Doctor`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to CareLinx</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #0C2243; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #00FFA2; margin: 0;">CareLinx</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #0C2243; margin-top: 0;">You've been invited!</h2>
          <p>Hello${name ? ` ${name}` : ''},</p>
          <p>You've been invited to join <strong>CareLinx</strong> as a <strong>Doctor</strong>.</p>
          <p>Click the button below to accept the invitation and create your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" style="background-color: #00FFA2; color: #0C2243; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">Or copy and paste this link into your browser:</p>
          <p style="font-size: 12px; color: #666; word-break: break-all;">${invitationUrl}</p>
          <p style="font-size: 12px; color: #666; margin-top: 30px;">This invitation will expire in 7 days.</p>
        </div>
      </body>
      </html>
    `;

    const emailText = `
You've been invited to join CareLinx as a Doctor!

Hello${name ? ` ${name}` : ''},

Click this link to accept the invitation and create your account:
${invitationUrl}

This invitation will expire in 7 days.
    `.trim();

    const { error: emailError } = await supabaseAdmin.rpc('send_invitation_email', {
      p_email: email.toLowerCase(),
      p_subject: emailSubject,
      p_html_content: emailHtml,
      p_text_content: emailText,
      p_invitation_url: invitationUrl,
    });

    if (emailError) {
      console.error('❌ Error sending invitation email:', emailError);
    }

    res.json({
      success: true,
      invitation_id: invitation.id,
      invitation_token: invitationToken,
      invitation_url: invitationUrl,
      message: 'Invitation created successfully. Email sent to user.',
      test_url: invitationUrl,
    });
  } catch (error: any) {
    console.error('❌ Send doctor invitation error:', error);
    res.status(500).json({ error: error.message || 'Failed to send invitation' });
  }
});

/**
 * GET /api/clinic-admin/treatments
 * Get treatments for clinic
 */
router.get('/treatments', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    // Get clinic ID
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('clinic_admin_id', userId)
      .single();

    if (clinicError || !clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    const { data: treatmentsData, error } = await supabaseAdmin
      .from('treatments')
      .select('*')
      .eq('clinic_id', clinicData.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching treatments:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ treatments: treatmentsData || [] });
  } catch (error: any) {
    console.error('❌ Get treatments error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/clinic-admin/treatments
 * Create a new treatment
 */
router.post('/treatments', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { name, description, price, duration, clinic_id } = req.body;

    // Verify clinic belongs to user
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('clinic_admin_id', userId)
      .eq('id', clinic_id)
      .single();

    if (clinicError || !clinicData) {
      return res.status(403).json({ error: 'Clinic not found or access denied' });
    }

    const { data, error } = await supabaseAdmin
      .from('treatments')
      .insert({
        name,
        description,
        price,
        duration,
        clinic_id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating treatment:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ treatment: data });
  } catch (error: any) {
    console.error('❌ Create treatment error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/clinic-admin/treatments/:id
 * Update a treatment
 */
router.patch('/treatments/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    // Verify treatment belongs to user's clinic
    const { data: treatmentData, error: treatmentError } = await supabaseAdmin
      .from('treatments')
      .select('clinic_id, clinics!inner(clinic_admin_id)')
      .eq('id', id)
      .single();

    if (treatmentError || !treatmentData) {
      return res.status(404).json({ error: 'Treatment not found' });
    }

    // Check if clinic belongs to user
    const clinic = treatmentData.clinics as any;
    if (clinic.clinic_admin_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabaseAdmin
      .from('treatments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating treatment:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ treatment: data });
  } catch (error: any) {
    console.error('❌ Update treatment error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/clinic-admin/treatments/:id
 * Delete a treatment
 */
router.delete('/treatments/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify treatment belongs to user's clinic
    const { data: treatmentData, error: treatmentError } = await supabaseAdmin
      .from('treatments')
      .select('clinic_id, clinics!inner(clinic_admin_id)')
      .eq('id', id)
      .single();

    if (treatmentError || !treatmentData) {
      return res.status(404).json({ error: 'Treatment not found' });
    }

    // Check if clinic belongs to user
    const clinic = treatmentData.clinics as any;
    if (clinic.clinic_admin_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { error } = await supabaseAdmin
      .from('treatments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting treatment:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Delete treatment error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/clinic-admin/specialty-requests
 * Create a specialty request
 */
router.post('/specialty-requests', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { specialty_name } = req.body;

    if (!specialty_name || !specialty_name.trim()) {
      return res.status(400).json({ error: 'Specialty name is required' });
    }

    // Get clinic ID
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('clinic_admin_id', userId)
      .maybeSingle();

    if (clinicError || !clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('specialty_requests')
      .insert({
        clinic_id: clinicData.id,
        clinic_admin_id: userId,
        specialty_name: specialty_name.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating specialty request:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ request: data });
  } catch (error: any) {
    console.error('❌ Create specialty request error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/clinic-admin/service-requests
 * Create a service request
 */
router.post('/service-requests', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { specialty_id, service_name } = req.body;

    if (!specialty_id || !service_name || !service_name.trim()) {
      return res.status(400).json({ error: 'Specialty ID and service name are required' });
    }

    // Get clinic ID
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('clinic_admin_id', userId)
      .maybeSingle();

    if (clinicError || !clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .insert({
        clinic_id: clinicData.id,
        clinic_admin_id: userId,
        specialty_id,
        service_name: service_name.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating service request:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ request: data });
  } catch (error: any) {
    console.error('❌ Create service request error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/clinic-admin/patients/:userId
 * Update patient profile (clinic admin can update their patients)
 */
router.patch('/patients/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { userId: patientUserId } = req.params;
    const updates = req.body;

    // Verify clinic belongs to user
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id, name')
      .eq('clinic_admin_id', userId)
      .maybeSingle();

    if (clinicError || !clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    // Verify patient has bookings with this clinic
    const { data: bookingData } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('user_id', patientUserId)
      .or(`clinic_id.eq.${clinicData.id},clinic.eq.${clinicData.name}`)
      .limit(1);

    if (!bookingData || bookingData.length === 0) {
      return res.status(403).json({ error: 'Patient not found or access denied' });
    }

    // Update profile
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('user_id', patientUserId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('❌ Error updating patient profile:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ profile: data });
  } catch (error: any) {
    console.error('❌ Update patient profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/clinic-admin/patients/:userId/profile
 * Get patient profile (clinic admin can view their patients)
 */
router.get('/patients/:userId/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { userId: patientUserId } = req.params;

    // Verify clinic belongs to user
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id, name')
      .eq('clinic_admin_id', userId)
      .maybeSingle();

    if (clinicError || !clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    // Verify patient has bookings with this clinic
    const { data: bookingData } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('user_id', patientUserId)
      .or(`clinic_id.eq.${clinicData.id},clinic.eq.${clinicData.name}`)
      .limit(1);

    if (!bookingData || bookingData.length === 0) {
      return res.status(403).json({ error: 'Patient not found or access denied' });
    }

    // Get profile
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, email, gender, date_of_birth, phone, created_at')
      .eq('user_id', patientUserId)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching patient profile:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ profile: data });
  } catch (error: any) {
    console.error('❌ Get patient profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/clinic-admin/patients/:userId
 * Delete patient (clinic admin can delete their patients' bookings)
 */
router.delete('/patients/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { userId: patientUserId } = req.params;

    // Verify clinic belongs to user
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id, name')
      .eq('clinic_admin_id', userId)
      .maybeSingle();

    if (clinicError || !clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    // Delete bookings for this patient with this clinic
    const { error: deleteError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('user_id', patientUserId)
      .or(`clinic_id.eq.${clinicData.id},clinic.eq.${clinicData.name}`);

    if (deleteError) {
      console.error('❌ Error deleting patient bookings:', deleteError);
      return res.status(400).json({ error: deleteError.message });
    }

    res.json({ success: true, message: 'Patient deleted successfully' });
  } catch (error: any) {
    console.error('❌ Delete patient error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/clinic-admin/insights/bookings
 * Get bookings for insights (with date filtering)
 */
router.get('/insights/bookings', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Get clinic ID
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id, name')
      .eq('clinic_admin_id', userId)
      .maybeSingle();

    if (clinicError || !clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    // Build query
    let query = supabaseAdmin
      .from('bookings')
      .select('*')
      .or(`clinic_id.eq.${clinicData.id},clinic.eq.${clinicData.name}`);

    if (startDate) {
      query = query.gte('appointment_date', startDate as string);
    }
    if (endDate) {
      query = query.lte('appointment_date', endDate as string);
    }

    query = query.order('appointment_date', { ascending: true });

    const { data: bookingsData, error: bookingsError } = await query;

    if (bookingsError) {
      console.error('❌ Error fetching bookings for insights:', bookingsError);
      return res.status(400).json({ error: bookingsError.message });
    }

    res.json({ bookings: bookingsData || [] });
  } catch (error: any) {
    console.error('❌ Get insights bookings error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/clinic-admin/clinic/logo
 * Upload clinic logo to Supabase storage
 */
router.post('/clinic/logo', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    
    // Get clinic ID
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('clinic_admin_id', userId)
      .maybeSingle();

    if (clinicError || !clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    // Note: File uploads should be sent as multipart/form-data
    // For now, we'll accept base64 encoded file or use a file upload library
    // This is a simplified version - you may want to use multer or similar
    const { file, fileName, fileType } = req.body;

    if (!file || !fileName) {
      return res.status(400).json({ error: 'File and fileName are required' });
    }

    // Convert base64 to buffer if needed
    const fileBuffer = Buffer.from(file, 'base64');
    const fileExt = fileName.split('.').pop();
    const storageFileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `clinic-logos/${storageFileName}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('clinic-assets')
      .upload(filePath, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: fileType || `image/${fileExt}`,
      });

    if (uploadError) {
      console.error('❌ Error uploading logo:', uploadError);
      return res.status(400).json({ error: uploadError.message });
    }

    if (!uploadData) {
      return res.status(400).json({ error: 'Upload failed' });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('clinic-assets')
      .getPublicUrl(filePath);

    res.json({ logo_url: publicUrl });
  } catch (error: any) {
    console.error('❌ Upload logo error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

