import { Router } from 'express';
import { createSupabaseAdminClient, supabaseAdmin } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendEmail } from '../utils/email';
import { validateBookingSlotConflict } from '../utils/booking-conflicts';

const router = Router();

const MANUAL_PATIENT_PREFIX = 'manual:';

const normalizeManualIdentityValue = (value: string | null | undefined) =>
  String(value || '').trim().toLowerCase();

const buildManualPatientKey = (booking: {
  patient_name?: string | null;
  patient_phone?: string | null;
  patient_email?: string | null;
}) => {
  const name = normalizeManualIdentityValue(booking.patient_name);
  const phone = normalizeManualIdentityValue(booking.patient_phone);
  const email = normalizeManualIdentityValue(booking.patient_email);

  if (!name && !phone && !email) {
    return null;
  }

  return `${MANUAL_PATIENT_PREFIX}${name}|${phone}|${email}`;
};

const isManualPatientKey = (value: string) => value.startsWith(MANUAL_PATIENT_PREFIX);

const dbTimeToMinutes = (dbTime: string | null): number | null => {
  if (!dbTime) return null;

  const [hours, minutes] = dbTime.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return hours * 60 + minutes;
};

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

    for (const hour of hours) {
      if (hour?.is_closed) continue;

      const openingMinutes = dbTimeToMinutes(hour?.opening_time || null);
      const closingMinutes = dbTimeToMinutes(hour?.closing_time || null);

      if (openingMinutes === null || closingMinutes === null) {
        return res.status(400).json({ error: 'Opening and closing times are required for open days' });
      }

      if (closingMinutes <= openingMinutes) {
        return res.status(400).json({ error: 'Closing time must be after opening time' });
      }
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
    const userIds = [...new Set((bookingsData || []).map((b: any) => b.user_id).filter((id: any) => id !== null && id !== undefined))];
    let profilesMap = new Map();
    
    console.log('👥 Unique user IDs from bookings:', userIds.length);
    if (userIds.length > 0) {
      console.log('👥 Sample user IDs:', userIds.slice(0, 3));
    }
    
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, email, phone, gender, date_of_birth, created_at')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
      } else {
        console.log('✅ Profiles fetched:', profilesData?.length || 0, 'out of', userIds.length, 'user IDs');
        if (profilesData && profilesData.length > 0) {
          console.log('✅ Sample profile:', {
            user_id: profilesData[0].user_id,
            full_name: profilesData[0].full_name,
            email: profilesData[0].email
          });
        }
        profilesData?.forEach((profile: any) => {
          if (profile.user_id) {
            profilesMap.set(profile.user_id, profile);
          }
        });
        console.log('📊 Profiles in map:', profilesMap.size);
        if (profilesMap.size > 0) {
          const sampleKey = Array.from(profilesMap.keys())[0];
          console.log('📊 Sample map entry:', {
            key: sampleKey,
            value: profilesMap.get(sampleKey)
          });
        }
      }
    } else {
      console.log('⚠️ No user IDs found in bookings');
    }

    // Attach profiles to bookings
    const bookingsWithProfiles = (bookingsData || []).map((booking: any) => {
      const profile = booking.user_id ? profilesMap.get(booking.user_id) || null : null;
      if (booking.user_id && !profile) {
        console.log('⚠️ No profile found for booking:', {
          bookingId: booking.id,
          userId: booking.user_id,
          userIdType: typeof booking.user_id,
          userIdInMap: profilesMap.has(booking.user_id),
          mapSize: profilesMap.size,
          clinic: booking.clinic
        });
      }
      return {
        ...booking,
        profile: profile,
      };
    });
    
    console.log('📊 Bookings with profiles:', bookingsWithProfiles.filter((b: any) => b.profile).length);
    console.log('📊 Bookings without profiles:', bookingsWithProfiles.filter((b: any) => !b.profile && b.user_id).length);

    res.json({ bookings: bookingsWithProfiles });
  } catch (error: any) {
    console.error('❌ Get bookings error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/clinic-admin/bookings
 * Create a confirmed booking with manual patient details
 */
router.post('/bookings', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const {
      booking_type,
      appointment_date,
      appointment_time,
      doctor_id,
      treatment_id,
      service_name,
      patient_name,
      patient_phone,
      patient_email,
      patient_gender,
      patient_date_of_birth,
    } = req.body;

    const bookingType = booking_type === 'treatment' ? 'treatment' : 'doctor';
    const trimmedPatientName = typeof patient_name === 'string' ? patient_name.trim() : '';
    const trimmedPatientPhone = typeof patient_phone === 'string' ? patient_phone.trim() : '';
    const trimmedPatientEmail = typeof patient_email === 'string' ? patient_email.trim() : '';
    const trimmedPatientGender = typeof patient_gender === 'string' ? patient_gender.trim() : '';
    const trimmedServiceName = typeof service_name === 'string' ? service_name.trim() : '';
    const appointmentDate = typeof appointment_date === 'string' ? appointment_date.trim() : '';
    const appointmentTime = typeof appointment_time === 'string' ? appointment_time.trim() : '';

    if (!trimmedPatientName) {
      return res.status(400).json({ error: 'Patient name is required' });
    }

    if (!trimmedPatientPhone) {
      return res.status(400).json({ error: 'Patient phone is required' });
    }

    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'Appointment date and time are required' });
    }

    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id, name, status')
      .eq('clinic_admin_id', userId)
      .maybeSingle();

    if (clinicError || !clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    if (clinicData.status !== 'active') {
      return res.status(403).json({ error: 'Clinic must be active before creating bookings' });
    }

    let bookingPayload: Record<string, any> = {
      booking_type: bookingType,
      clinic_id: clinicData.id,
      clinic: clinicData.name,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      booking_source: 'clinic_admin',
      created_by_role: 'clinic_admin',
      created_by_user_id: userId,
      patient_name: trimmedPatientName,
      patient_phone: trimmedPatientPhone,
      patient_email: trimmedPatientEmail || null,
      patient_gender: trimmedPatientGender || null,
      patient_date_of_birth: patient_date_of_birth || null,
      user_id: null,
      doctor_id: null,
      doctor_name: null,
      treatment_id: null,
      treatment_name: null,
      service_name: null,
      specialty: '',
    };

    if (bookingType === 'doctor') {
      if (!doctor_id || typeof doctor_id !== 'string') {
        return res.status(400).json({ error: 'Doctor is required' });
      }

      const { data: doctorData, error: doctorError } = await supabaseAdmin
        .from('doctors')
        .select('id, name, specialty, services, status, clinic_id')
        .eq('id', doctor_id)
        .eq('clinic_id', clinicData.id)
        .maybeSingle();

      if (doctorError || !doctorData) {
        return res.status(404).json({ error: 'Doctor not found for this clinic' });
      }

      if (doctorData.status !== 'active') {
        return res.status(400).json({ error: 'Only active doctors can be booked' });
      }

      const doctorServices = String(doctorData.services || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      if (doctorServices.length > 0) {
        if (!trimmedServiceName) {
          return res.status(400).json({ error: 'Service is required for this doctor booking' });
        }

        if (!doctorServices.some((value) => value.toLowerCase() === trimmedServiceName.toLowerCase())) {
          return res.status(400).json({ error: 'Selected service is not offered by this doctor' });
        }
      }

      bookingPayload = {
        ...bookingPayload,
        doctor_id: doctorData.id,
        doctor_name: doctorData.name,
        specialty: doctorData.specialty || '',
        service_name: trimmedServiceName || null,
      };
    } else {
      if (!treatment_id || typeof treatment_id !== 'string') {
        return res.status(400).json({ error: 'Treatment is required' });
      }

      const { data: treatmentData, error: treatmentError } = await supabaseAdmin
        .from('treatments')
        .select('id, name, specialty, service, status, clinic_id')
        .eq('id', treatment_id)
        .eq('clinic_id', clinicData.id)
        .maybeSingle();

      if (treatmentError || !treatmentData) {
        return res.status(404).json({ error: 'Treatment not found for this clinic' });
      }

      if (treatmentData.status !== 'active') {
        return res.status(400).json({ error: 'Only active treatments can be booked' });
      }

      bookingPayload = {
        ...bookingPayload,
        // Backward-compatible fallback for environments where doctor_name
        // is still NOT NULL in bookings while treatment bookings roll out.
        doctor_name: treatmentData.name,
        treatment_id: treatmentData.id,
        treatment_name: treatmentData.name,
        specialty: treatmentData.specialty || '',
        service_name: treatmentData.service || null,
      };
    }

    const slotConflict = await validateBookingSlotConflict({
      bookingType,
      doctorId: bookingPayload.doctor_id,
      doctorName: bookingPayload.doctor_name,
      treatmentId: bookingPayload.treatment_id,
      treatmentName: bookingPayload.treatment_name,
      appointmentDate,
      appointmentTime,
      clinicId: clinicData.id,
      clinicName: clinicData.name,
    });

    if (slotConflict.hasConflict) {
      return res.status(409).json({ error: slotConflict.error });
    }

    const { data: bookingData, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert(bookingPayload)
      .select()
      .single();

    if (bookingError) {
      return res.status(400).json({ error: bookingError.message });
    }

    res.json({ booking: bookingData });
  } catch (error: any) {
    console.error('❌ Create clinic admin booking error:', error);
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

    // Send email via SMTP (backend)
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

    try {
      await sendEmail({
        to: email.toLowerCase(),
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
    });
    } catch (emailError: any) {
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
    const { name, description, price, specialty, service, status, clinic_id, availability } = req.body;

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedSpecialty = typeof specialty === 'string' ? specialty.trim() : '';
    const trimmedService = typeof service === 'string' ? service.trim() : '';
    const trimmedPrice = typeof price === 'string' ? price.trim() : price;
    const trimmedAvailability = typeof availability === 'string' ? availability.trim() : '';

    if (!trimmedName) {
      return res.status(400).json({ error: 'Treatment name is required' });
    }

    if (!trimmedSpecialty) {
      return res.status(400).json({ error: 'Specialty is required' });
    }

    if (!trimmedService) {
      return res.status(400).json({ error: 'Service is required' });
    }

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

    console.log('💾 Creating treatment:', { userId, clinic_id, name, specialty, service });
    
    const { data, error } = await supabaseAdmin
      .from('treatments')
      .insert({
        name: trimmedName,
        description: description || null,
        price: trimmedPrice || null,
        specialty: trimmedSpecialty,
        service: trimmedService,
        availability: trimmedAvailability || null,
        status: status || 'active',
        clinic_id,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating treatment:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // If RLS error, provide helpful message
      if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
        console.error('💡 RLS error detected - this suggests:');
        console.error('   1. SUPABASE_SERVICE_ROLE_KEY might not be set correctly in backend .env');
        console.error('   2. Or the treatments table RLS policies need to be updated');
        console.error('   3. Run the migration: 20250120000000_fix_treatments_rls_policies.sql');
        return res.status(403).json({ 
          error: 'Permission denied. Please ensure the service role key is configured correctly, or contact an administrator. If the error persists, run the treatments RLS migration.' 
        });
      }
      
      return res.status(400).json({ error: error.message });
    }
    
    console.log('✅ Treatment created successfully:', data);

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
    const { data: bookingData, error: bookingCheckError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('user_id', patientUserId)
      .or(`clinic_id.eq.${clinicData.id},clinic.eq.${clinicData.name}`)
      .limit(1);

    if (bookingCheckError) {
      console.error('❌ Error checking bookings:', bookingCheckError);
      return res.status(400).json({ error: `Failed to verify patient access: ${bookingCheckError.message}` });
    }

    if (!bookingData || bookingData.length === 0) {
      console.error('❌ No bookings found for patient:', {
        patientUserId,
        clinicId: clinicData.id,
        clinicName: clinicData.name
      });
      return res.status(403).json({ error: 'Patient not found or access denied. Patient must have bookings with this clinic.' });
    }

    console.log('✅ Patient has bookings with clinic, proceeding with update');

    // Log the update request
    console.log('💾 Updating patient profile:', {
      patientUserId,
      updates,
      clinicId: clinicData.id,
      clinicName: clinicData.name
    });

    // First, check if profile exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('user_id', patientUserId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking profile:', checkError);
      return res.status(400).json({ error: checkError.message });
    }

    if (!existingProfile) {
      // Profile doesn't exist - try to get user email from auth to create profile
      console.log('⚠️ Profile not found for user:', patientUserId, '- attempting to create profile');
      
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(patientUserId);
      
      if (userError) {
        console.error('❌ Error fetching user from auth:', userError);
        return res.status(404).json({ error: `User not found: ${userError.message}` });
      }
      
      if (!user) {
        console.error('❌ User not found in auth for user_id:', patientUserId);
        return res.status(404).json({ error: 'User not found in authentication system' });
      }

      console.log('✅ User found in auth:', { email: user.email, id: user.id });

      // Prepare profile data - ensure all required fields are present
      const profileData: any = {
        user_id: patientUserId,
        email: user.email || updates.email || '',
        full_name: updates.full_name || user.user_metadata?.full_name || 'Unknown Patient',
      };

      // Add optional fields only if they exist
      if (updates.gender) profileData.gender = updates.gender;
      if (updates.phone) profileData.phone = updates.phone;
      if (updates.date_of_birth) profileData.date_of_birth = updates.date_of_birth;

      console.log('💾 Creating profile with data:', profileData);

      // Create profile with basic info
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert(profileData)
        .select('user_id, full_name, email, gender, date_of_birth, phone, created_at')
        .maybeSingle();

      if (createError) {
        console.error('❌ Error creating profile:', createError);
        console.error('❌ Profile data attempted:', profileData);
        return res.status(400).json({ error: `Failed to create profile: ${createError.message}` });
      }

      if (!newProfile) {
        console.error('❌ Profile creation returned no data');
        return res.status(500).json({ error: 'Profile creation failed - no data returned' });
      }

      console.log('✅ Profile created successfully:', newProfile);
      return res.json({ profile: newProfile, success: true, created: true });
    }

    console.log('✅ Profile exists, updating:', existingProfile);

    // Update profile - ensure we're updating the correct fields
    // Only update fields that actually exist in the profiles table:
    // user_id, full_name, email, gender, date_of_birth, phone, created_at, updated_at
    // Remove any non-existent fields from updates
    const { age, birth_date, dob, sex, ...updatesCleaned } = updates;
    if (age !== undefined || birth_date !== undefined || dob !== undefined || sex !== undefined) {
      console.log('⚠️ Removed non-existent fields from updates:', { age, birth_date, dob, sex });
    }

    console.log('💾 Cleaned update data:', updatesCleaned);

    // Update profile and return updated data in one query
    // Use maybeSingle() first to check if update affected any rows
    const { data, error, count } = await supabaseAdmin
      .from('profiles')
      .update(updatesCleaned)
      .eq('user_id', patientUserId)
      .select('user_id, full_name, email, gender, date_of_birth, phone, created_at')
      .maybeSingle();

    if (error) {
      console.error('❌ Error updating patient profile:', error);
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      // This means the update didn't find any rows to update
      // This shouldn't happen since we checked for existingProfile above
      // But handle it gracefully
      console.error('❌ Profile update returned no data - profile may have been deleted:', patientUserId);
      
      // Try to create the profile as a fallback
      console.log('🔄 Attempting to create profile as fallback...');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(patientUserId);
      
      if (userError || !user) {
        console.error('❌ User not found in auth:', userError);
        return res.status(404).json({ error: 'Profile not found and user does not exist' });
      }

      // Create profile
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: patientUserId,
          email: user.email || updates.email || '',
          full_name: updates.full_name || user.user_metadata?.full_name || 'Unknown',
          gender: updates.gender || null,
          phone: updates.phone || null,
          date_of_birth: updates.date_of_birth || null,
        })
        .select('user_id, full_name, email, gender, date_of_birth, phone, created_at')
        .maybeSingle();

      if (createError) {
        console.error('❌ Error creating profile as fallback:', createError);
        return res.status(400).json({ error: `Failed to create profile: ${createError.message}` });
      }

      if (!newProfile) {
        return res.status(404).json({ error: 'Profile not found and creation failed' });
      }

      console.log('✅ Profile created as fallback:', newProfile);
      return res.json({ profile: newProfile, success: true, created: true });
    }

    console.log('✅ Patient profile updated successfully:', {
      userId: data.user_id,
      full_name: data.full_name,
      email: data.email,
      gender: data.gender,
      phone: data.phone,
      date_of_birth: data.date_of_birth
    });

    // Verify the update by fetching the profile again
    const { data: verifyData } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, email, gender, phone, date_of_birth, created_at')
      .eq('user_id', patientUserId)
      .maybeSingle();

    if (verifyData) {
      console.log('✅ Verified updated profile:', verifyData);
    }

    res.json({ profile: data, success: true });
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
 * This removes all appointments for the patient with this clinic
 */
router.delete('/patients/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const adminDb = createSupabaseAdminClient();
    const userId = req.user.id;
    const { userId: patientUserId } = req.params;

    console.log('🗑️ Delete patient request:', { userId, patientUserId });

    // Verify clinic belongs to user
    const { data: clinicData, error: clinicError } = await adminDb
      .from('clinics')
      .select('id, name')
      .eq('clinic_admin_id', userId)
      .maybeSingle();

    if (clinicError || !clinicData) {
      console.error('❌ Clinic not found for user:', userId);
      return res.status(404).json({ error: 'Clinic not found' });
    }

    console.log('✅ Clinic found:', { clinicId: clinicData.id, clinicName: clinicData.name });

    let totalDeleted = 0;

    if (isManualPatientKey(patientUserId)) {
      const { data: clinicBookings, error: manualCheckError } = await adminDb
        .from('bookings')
        .select('id, user_id, patient_name, patient_phone, patient_email')
        .or(`clinic_id.eq.${clinicData.id},clinic.eq.${clinicData.name}`);

      if (manualCheckError) {
        console.error('❌ Error checking manual patient bookings:', manualCheckError);
        return res.status(400).json({ error: `Failed to check bookings: ${manualCheckError.message}` });
      }

      const bookingIdsToDelete = ((clinicBookings || []) as any[])
        .filter((booking) => !booking.user_id && buildManualPatientKey(booking) === patientUserId)
        .map((booking) => booking.id)
        .filter(Boolean);

      console.log(`📊 Found ${bookingIdsToDelete.length} manual bookings to delete for ${patientUserId}`);

      if (bookingIdsToDelete.length === 0) {
        return res.json({
          success: true,
          message: 'Patient deleted successfully (no appointments found)',
          deletedCount: 0,
        });
      }

      const { data: deletedManualBookings, error: deleteManualError } = await adminDb
        .from('bookings')
        .delete()
        .in('id', bookingIdsToDelete)
        .select('id');

      if (deleteManualError) {
        console.error('❌ Error deleting manual patient bookings:', {
          bookingIdsToDelete,
          error: deleteManualError,
        });
        return res.status(400).json({ error: `Failed to delete bookings: ${deleteManualError.message}` });
      }

      const deletedManualIds = ((deletedManualBookings || []) as Array<{ id?: string | null }>)
        .map((booking) => booking.id)
        .filter((id): id is string => Boolean(id));

      if (deletedManualIds.length < bookingIdsToDelete.length) {
        const { data: remainingManualBookings, error: remainingManualError } = await adminDb
          .from('bookings')
          .select('id')
          .in('id', bookingIdsToDelete);

        if (remainingManualError) {
          console.error('❌ Error verifying manual patient booking deletion:', {
            bookingIdsToDelete,
            error: remainingManualError,
          });
          return res.status(400).json({ error: `Failed to verify booking deletion: ${remainingManualError.message}` });
        }

        const remainingManualIds = new Set(
          ((remainingManualBookings || []) as Array<{ id?: string | null }>)
            .map((booking) => booking.id)
            .filter((id): id is string => Boolean(id))
        );

        totalDeleted = bookingIdsToDelete.filter((bookingId) => !remainingManualIds.has(bookingId)).length;
      } else {
        totalDeleted = deletedManualIds.length;
      }

      console.log(`✅ Deleted ${totalDeleted} manual patient bookings`, deletedManualIds);
    } else {
      // First, check how many bookings exist for this patient with this clinic
      const { data: existingBookings, error: checkError } = await adminDb
        .from('bookings')
        .select('id')
        .eq('user_id', patientUserId)
        .or(`clinic_id.eq.${clinicData.id},clinic.eq.${clinicData.name}`);

      if (checkError) {
        console.error('❌ Error checking bookings:', checkError);
        return res.status(400).json({ error: `Failed to check bookings: ${checkError.message}` });
      }

      const bookingCount = existingBookings?.length || 0;
      console.log(`📊 Found ${bookingCount} bookings to delete for patient ${patientUserId} with clinic ${clinicData.name}`);

      if (bookingCount === 0) {
        console.log('⚠️ No bookings found for this patient with this clinic');
        return res.json({
          success: true,
          message: 'Patient deleted successfully (no appointments found)',
          deletedCount: 0,
        });
      }

      // Delete bookings for this patient with this clinic
      // Use two separate queries to ensure we catch both clinic_id and clinic name matches
      const { data: deletedById, error: deleteByIdError } = await adminDb
        .from('bookings')
        .delete()
        .eq('user_id', patientUserId)
        .eq('clinic_id', clinicData.id)
        .select('id');

      if (deleteByIdError) {
        console.error('❌ Error deleting bookings by clinic_id:', deleteByIdError);
      } else {
        totalDeleted += deletedById?.length || 0;
        console.log(`✅ Deleted ${deletedById?.length || 0} bookings by clinic_id`);
      }

      const { data: deletedByName, error: deleteByNameError } = await adminDb
        .from('bookings')
        .delete()
        .eq('user_id', patientUserId)
        .eq('clinic', clinicData.name)
        .select('id');

      if (deleteByNameError) {
        console.error('❌ Error deleting bookings by clinic name:', deleteByNameError);
        if (totalDeleted === 0) {
          return res.status(400).json({ error: `Failed to delete bookings: ${deleteByNameError.message}` });
        }
      } else {
        const deletedByNameCount = deletedByName?.length || 0;
        if (deletedByNameCount > 0) {
          const newDeletions = deletedByName?.filter((b: any) =>
            !deletedById?.some((d: any) => d.id === b.id)
          ) || [];
          totalDeleted += newDeletions.length;
          console.log(`✅ Deleted ${newDeletions.length} additional bookings by clinic name`);
        }
      }
    }

    console.log(`✅ Successfully deleted ${totalDeleted} bookings for patient ${patientUserId}`);
    res.json({ 
      success: true, 
      message: 'Patient deleted successfully', 
      deletedCount: totalDeleted 
    });
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

