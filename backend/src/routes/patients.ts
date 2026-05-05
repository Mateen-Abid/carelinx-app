import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

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

  return `${MANUAL_PATIENT_PREFIX}${encodeURIComponent(`${name}|${phone}|${email}`)}`;
};

const isManualPatientKey = (value: string) => value.startsWith(MANUAL_PATIENT_PREFIX);

const calculateAge = (dateOfBirth: string | null): number => {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  gender: string | null;
  date_of_birth: string | null;
  phone: string | null;
  created_at?: string | null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
};

/**
 * GET /api/patients
 * Get all patients (Super Admin only)
 * Returns patients who have bookings from real clinics only
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    console.log('🔍 Fetching patients from REAL clinics only (super admin view)...');

    // First, fetch all real clinics
    const { data: clinicsData, error: clinicsError } = await supabaseAdmin
      .from('clinics')
      .select('id, name');

    if (clinicsError) {
      console.error('❌ Error fetching clinics:', clinicsError);
      return res.status(400).json({ error: clinicsError.message });
    }

    console.log('✅ Clinics fetched:', clinicsData?.length || 0);

    if (!clinicsData || clinicsData.length === 0) {
      console.log('⚠️ No clinics found in database');
      return res.json({
        patients: [],
        clinics: [],
        doctors: []
      });
    }

    // Create a set of real clinic IDs and names
    const realClinicIds = new Set(clinicsData.map(c => c.id));
    const realClinicNames = new Set(clinicsData.map(c => c.name.toLowerCase()));

    console.log('📊 Real clinic IDs:', realClinicIds.size);
    console.log('📊 Real clinic names:', realClinicNames.size);

    // Fetch all bookings, but we'll filter to only those from real clinics
    const { data: bookingsData, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('user_id, appointment_date, clinic_id, clinic, doctor_name, doctor_id, patient_name, patient_phone, patient_email, patient_gender, patient_date_of_birth, booking_source')
      .order('appointment_date', { ascending: false });

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
      return res.status(400).json({ error: bookingsError.message });
    }

    console.log('✅ All bookings fetched:', bookingsData?.length || 0);

    // Filter bookings to only those from real clinics
    const realClinicBookings = bookingsData?.filter(booking => {
      // Check if booking has clinic_id that matches a real clinic
      if (booking.clinic_id && realClinicIds.has(booking.clinic_id)) {
        return true;
      }
      // Check if booking has clinic name that matches a real clinic
      if (booking.clinic && realClinicNames.has(booking.clinic.toLowerCase())) {
        return true;
      }
      return false;
    }) || [];

    console.log('✅ Bookings from real clinics:', realClinicBookings.length);
    console.log('📊 Filtered out:', (bookingsData?.length || 0) - realClinicBookings.length, 'bookings from non-existent clinics');

    // Get unique user IDs from real clinic bookings only
    const userIds = [...new Set(realClinicBookings.map(b => b.user_id).filter(id => id !== null) || [])];
    const manualBookings = realClinicBookings.filter((booking) => !booking.user_id && buildManualPatientKey(booking));

    if (userIds.length === 0 && manualBookings.length === 0) {
      console.log('⚠️ No patients found with bookings from real clinics');
      return res.json({
        patients: [],
        clinics: clinicsData.map(c => c.name),
        doctors: []
      });
    }

    console.log('👥 Unique patient user IDs from real clinics:', userIds.length);

    // Fetch profiles for these users
    let profilesData: ProfileRow[] = [];
    if (userIds.length > 0) {
      const { data, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, email, gender, date_of_birth, phone, created_at')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        return res.status(400).json({ error: profilesError.message });
      }

      profilesData = data || [];
    }

    console.log('✅ Profiles fetched:', profilesData?.length || 0);

    // Create maps for lookups
    const profileMap = new Map<string, ProfileRow>();
    profilesData?.forEach(profile => {
      profileMap.set(profile.user_id, profile);
    });

    // Create a map of user_id to last appointment date (prefer past/today)
    const lastAppointmentMap = new Map<string, string>();
    const lastAppointmentAnyMap = new Map<string, string>();
    // Create a map of user_id to doctor names (doctors this patient has appointments with)
    const patientDoctorMap = new Map<string, Set<string>>();
    // Create a map of user_id to clinic names (clinics this patient has appointments with)
    const patientClinicMap = new Map<string, Set<string>>();
    const manualPatientSnapshotMap = new Map<string, { patient_name?: string | null; patient_phone?: string | null; patient_email?: string | null; patient_gender?: string | null; patient_date_of_birth?: string | null }>();
    
    // Create a map of clinic_id to clinic name for quick lookup
    const clinicIdToNameMap = new Map<string, string>();
    clinicsData?.forEach(clinic => {
      clinicIdToNameMap.set(clinic.id, clinic.name);
    });
    
    const normalizeDate = (dateValue?: string | null): string => {
      if (!dateValue) return '';
      return dateValue.split('T')[0];
    };
    const todayStr = new Date().toISOString().split('T')[0];

    realClinicBookings.forEach(booking => {
      const patientKey = booking.user_id || buildManualPatientKey(booking);
      if (!patientKey) {
        return;
      }

      const bookingDate = booking.appointment_date;
      const bookingDateStr = normalizeDate(bookingDate);
      const currentAny = lastAppointmentAnyMap.get(patientKey);
      if (!currentAny || bookingDateStr > normalizeDate(currentAny)) {
        lastAppointmentAnyMap.set(patientKey, bookingDate);
      }

      const currentLast = lastAppointmentMap.get(patientKey);
      if (bookingDateStr && bookingDateStr <= todayStr && (!currentLast || bookingDateStr > normalizeDate(currentLast))) {
        lastAppointmentMap.set(patientKey, bookingDate);
      }

      if (!patientDoctorMap.has(patientKey)) {
        patientDoctorMap.set(patientKey, new Set<string>());
      }
      if (booking.doctor_name) {
        patientDoctorMap.get(patientKey)!.add(booking.doctor_name);
      }

      if (!patientClinicMap.has(patientKey)) {
        patientClinicMap.set(patientKey, new Set<string>());
      }
      let clinicName = '';
      if (booking.clinic_id && clinicIdToNameMap.has(booking.clinic_id)) {
        clinicName = clinicIdToNameMap.get(booking.clinic_id)!;
      } else if (booking.clinic) {
        clinicName = booking.clinic;
      }
      if (clinicName) {
        patientClinicMap.get(patientKey)!.add(clinicName);
      }

      if (!booking.user_id && isManualPatientKey(patientKey) && !manualPatientSnapshotMap.has(patientKey)) {
        manualPatientSnapshotMap.set(patientKey, {
          patient_name: booking.patient_name,
          patient_phone: booking.patient_phone,
          patient_email: booking.patient_email,
          patient_gender: booking.patient_gender,
          patient_date_of_birth: booking.patient_date_of_birth,
        });
      }
    });

    // Determine active status (patients with appointments in last 30 days or upcoming)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activePatientIds = new Set<string>();
    realClinicBookings.forEach(booking => {
      const patientKey = booking.user_id || buildManualPatientKey(booking);
      if (patientKey && booking.appointment_date) {
        const appointmentDate = new Date(booking.appointment_date);
        if (appointmentDate >= thirtyDaysAgo || appointmentDate >= today) {
          activePatientIds.add(patientKey);
        }
      }
    });

    // Transform profiles to patients
    const registeredPatients = profilesData?.map((profile) => {
      const patientKey = profile.user_id;
      const lastAppointmentDate = lastAppointmentMap.get(patientKey) || lastAppointmentAnyMap.get(patientKey);
      let formattedDate = 'No appointments';
      if (lastAppointmentDate) {
        try {
          const date = new Date(lastAppointmentDate);
          if (!isNaN(date.getTime())) {
            formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }
        } catch (e) {
          console.error('Error formatting date:', e);
          formattedDate = 'Invalid date';
        }
      }

      const age = calculateAge(profile.date_of_birth);

      const patientDoctors = patientDoctorMap.get(patientKey);
      const patientClinics = patientClinicMap.get(patientKey);
      
      return {
        id: patientKey,
        user_id: patientKey,
        name: profile.full_name || profile.email || 'Unknown Patient',
        gender: (profile.gender as 'Male' | 'Female' | 'Other') || 'Other',
        age: age > 0 ? age : 0,
        contact: profile.phone || profile.email || 'N/A',
        email: profile.email || '',
        lastAppointment: formattedDate,
        status: activePatientIds.has(patientKey) ? 'active' as const : 'inactive' as const,
        doctorNames: patientDoctors ? Array.from(patientDoctors) : [],
        clinicNames: patientClinics ? Array.from(patientClinics) : [],
        isManual: false,
      };
    }) || [];

    const manualPatients = Array.from(manualPatientSnapshotMap.entries()).map(([patientKey, snapshot]) => {
      const lastAppointmentDate = lastAppointmentMap.get(patientKey) || lastAppointmentAnyMap.get(patientKey);
      let formattedDate = 'No appointments';
      if (lastAppointmentDate) {
        try {
          const date = new Date(lastAppointmentDate);
          if (!isNaN(date.getTime())) {
            formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }
        } catch (e) {
          console.error('Error formatting manual patient date:', e);
          formattedDate = 'Invalid date';
        }
      }

      const patientDoctors = patientDoctorMap.get(patientKey);
      const patientClinics = patientClinicMap.get(patientKey);
      const genderValue = normalizeManualIdentityValue(snapshot.patient_gender);
      const gender =
        genderValue === 'male' || genderValue === 'm'
          ? 'Male'
          : genderValue === 'female' || genderValue === 'f'
            ? 'Female'
            : 'Other';

      return {
        id: patientKey,
        user_id: patientKey,
        name: snapshot.patient_name || snapshot.patient_email || 'Unknown Patient',
        gender,
        age: calculateAge(snapshot.patient_date_of_birth || null),
        contact: snapshot.patient_phone || snapshot.patient_email || 'N/A',
        email: snapshot.patient_email || '',
        lastAppointment: formattedDate,
        status: activePatientIds.has(patientKey) ? 'active' as const : 'inactive' as const,
        doctorNames: patientDoctors ? Array.from(patientDoctors) : [],
        clinicNames: patientClinics ? Array.from(patientClinics) : [],
        isManual: true,
      };
    });

    const patients = [...registeredPatients, ...manualPatients];

    console.log('📊 Patients processed:', patients.length);

    // Extract unique doctors from bookings for filter
    const uniqueDoctors = new Set<string>(['all']);
    realClinicBookings.forEach(booking => {
      if (booking.doctor_name) {
        uniqueDoctors.add(booking.doctor_name);
      }
    });

    // Also fetch all doctors from real clinics for filter
    const { data: doctorsData } = await supabaseAdmin
      .from('doctors')
      .select('name')
      .in('clinic_id', Array.from(realClinicIds));

    if (doctorsData) {
      doctorsData.forEach(doctor => {
        if (doctor.name) {
          uniqueDoctors.add(doctor.name);
        }
      });
    }

    const clinicNames = ['All Clinics', ...(clinicsData?.map(c => c.name) || [])];
    const doctors = Array.from(uniqueDoctors).sort();

    res.json({
      patients,
      clinics: clinicNames,
      doctors
    });
  } catch (error: unknown) {
    console.error('❌ Error fetching patients:', error);
    res.status(500).json({ error: getErrorMessage(error) || 'Failed to fetch patients' });
  }
});

/**
 * GET /api/patients/:userId/appointments
 * Get patient's appointment history
 */
router.get('/:userId/appointments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    let appointmentsData = null;
    let error = null;

    if (isManualPatientKey(userId)) {
      const { data, error: manualError } = await supabaseAdmin
        .from('bookings')
        .select('*, clinics(name)')
        .order('appointment_date', { ascending: false });

      appointmentsData = (data || [])
        .filter((booking: { patient_name?: string | null; patient_phone?: string | null; patient_email?: string | null }) => buildManualPatientKey(booking) === userId)
        .slice(0, 10);
      error = manualError;
    } else {
      const response = await supabaseAdmin
        .from('bookings')
        .select('*, clinics(name)')
        .eq('user_id', userId)
        .order('appointment_date', { ascending: false })
        .limit(10);

      appointmentsData = response.data;
      error = response.error;
    }

    if (error) {
      console.error('Error fetching appointments:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ appointments: appointmentsData || [] });
  } catch (error: unknown) {
    console.error('Error fetching patient appointments:', error);
    res.status(500).json({ error: getErrorMessage(error) || 'Failed to fetch appointments' });
  }
});

/**
 * GET /api/patients/:userId/profile
 * Get patient's full profile data
 */
router.get('/:userId/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, gender, date_of_birth, phone')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching patient profile:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ profile: data });
  } catch (error: unknown) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({ error: getErrorMessage(error) || 'Failed to fetch profile' });
  }
});

/**
 * PATCH /api/patients/:userId
 * Update patient information
 */
router.patch('/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { fullName, gender, dateOfBirth, phone, email } = req.body;

    console.log('💾 Updating patient profile (super admin):', {
      userId,
      fullName,
      gender,
      dateOfBirth,
      phone,
      email
    });

    // Prepare update data - only include fields that exist in profiles table
    // Convert API field names to database field names
    const updateData: Record<string, string | null> = {
      full_name: fullName?.trim() || null,
      gender: gender || null,
      date_of_birth: dateOfBirth || null,
      phone: phone?.trim() || null,
    };

    // Include email if provided
    if (email && email.trim()) {
      updateData.email = email.trim();
    }

    // Remove any null/undefined/empty string values to avoid unnecessary updates
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === null || updateData[key] === undefined || updateData[key] === '') {
        delete updateData[key];
      }
    });

    // Ensure at least full_name is present for update
    if (!updateData.full_name && !fullName) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    
    // If full_name was removed during cleaning, add it back
    if (!updateData.full_name && fullName) {
      updateData.full_name = fullName.trim();
    }

    console.log('💾 Cleaned update data:', updateData);

    // First check if profile exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking profile:', checkError);
      return res.status(400).json({ error: checkError.message });
    }

    if (!existingProfile) {
      // Profile doesn't exist - try to get user email from auth to create profile
      console.log('⚠️ Profile not found for user:', userId, '- attempting to create profile');
      
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (userError) {
        console.error('❌ Error fetching user from auth:', userError);
        return res.status(404).json({ error: `User not found: ${userError.message}` });
      }
      
      if (!user) {
        console.error('❌ User not found in auth for user_id:', userId);
        return res.status(404).json({ error: 'User not found in authentication system' });
      }

      console.log('✅ User found in auth:', { email: user.email, id: user.id });

      // Prepare profile data - ensure all required fields are present
      const profileData: Record<string, string | null> = {
        user_id: userId,
        email: user.email || updateData.email || '',
        full_name: updateData.full_name || user.user_metadata?.full_name || 'Unknown Patient',
      };

      // Add optional fields only if they exist
      if (updateData.gender) profileData.gender = updateData.gender;
      if (updateData.phone) profileData.phone = updateData.phone;
      if (updateData.date_of_birth) profileData.date_of_birth = updateData.date_of_birth;

      console.log('💾 Creating profile with data:', profileData);

      // Try to create profile using service role (should bypass RLS)
      let newProfile = null;
      let createError = null;
      
      const { data: insertData, error: insertErr } = await supabaseAdmin
        .from('profiles')
        .insert(profileData)
        .select('user_id, full_name, email, gender, date_of_birth, phone, created_at')
        .maybeSingle();

      if (insertErr) {
        console.error('❌ Error creating profile with direct insert:', insertErr);
        console.log('🔄 Attempting to use RPC function as fallback...');
        
        // If direct insert fails due to RLS, use the RPC function that bypasses RLS
        const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('create_profile_for_user', {
          p_user_id: profileData.user_id,
          p_email: profileData.email,
          p_full_name: profileData.full_name,
          p_gender: profileData.gender || null,
          p_phone: profileData.phone || null,
          p_date_of_birth: profileData.date_of_birth || null,
        });

        if (rpcErr) {
          console.error('❌ Error creating profile with RPC:', rpcErr);
          createError = rpcErr;
        } else if (rpcData && rpcData.length > 0) {
          newProfile = rpcData[0];
          console.log('✅ Profile created successfully via RPC:', newProfile);
        } else {
          createError = new Error('RPC function returned no data');
        }
      } else {
        newProfile = insertData;
        console.log('✅ Profile created successfully via direct insert:', newProfile);
      }

      if (createError || !newProfile) {
        console.error('❌ Error creating profile:', createError);
        console.error('❌ Profile data attempted:', profileData);
        return res.status(400).json({ error: `Failed to create profile: ${createError?.message || 'Unknown error'}` });
      }

      console.log('✅ Profile created successfully:', newProfile);
      return res.json({ profile: newProfile, success: true, created: true });
    }

    console.log('✅ Profile exists, updating:', existingProfile);

    // Update profile and return updated data in one query
    // Use maybeSingle() to avoid errors when no rows are found
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select('user_id, full_name, email, gender, date_of_birth, phone, created_at')
      .maybeSingle();

    if (error) {
      console.error('❌ Error updating patient profile:', error);
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      // This means the update didn't find any rows to update
      // This shouldn't happen since we checked for existingProfile above
      // But handle it gracefully with fallback creation
      console.error('❌ Profile update returned no data - profile may have been deleted:', userId);
      
      // Try to create the profile as a fallback
      console.log('🔄 Attempting to create profile as fallback...');
      const { data: { user: fallbackUser }, error: fallbackUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (fallbackUserError || !fallbackUser) {
        console.error('❌ User not found in auth:', fallbackUserError);
        return res.status(404).json({ error: 'Profile not found and user does not exist' });
      }

      // Create profile with the update data - use both updateData and original request body
      const fallbackProfileData: Record<string, string | null> = {
        user_id: userId,
        email: fallbackUser.email || updateData.email || email || '',
        full_name: updateData.full_name || fullName?.trim() || fallbackUser.user_metadata?.full_name || 'Unknown Patient',
      };

      // Add optional fields from updateData or original request
      if (updateData.gender || gender) {
        fallbackProfileData.gender = updateData.gender || gender;
      }
      if (updateData.phone || phone) {
        fallbackProfileData.phone = (updateData.phone || phone)?.trim();
      }
      if (updateData.date_of_birth || dateOfBirth) {
        fallbackProfileData.date_of_birth = updateData.date_of_birth || dateOfBirth;
      }

      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert(fallbackProfileData)
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

    res.json({ profile: data, success: true, message: 'Patient information updated successfully' });
  } catch (error: unknown) {
    console.error('❌ Update patient error:', error);
    res.status(500).json({ error: getErrorMessage(error) || 'Failed to update patient' });
  }
});

/**
 * DELETE /api/patients/:userId
 * Delete patient (removes all bookings)
 */
router.delete('/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    // Delete all bookings for this patient
    const { error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('user_id', userId);

    if (bookingsError) {
      console.error('❌ Error deleting bookings:', bookingsError);
      return res.status(400).json({ error: bookingsError.message });
    }

    console.log('✅ Patient bookings deleted successfully');
    res.json({ success: true, message: 'Patient deleted successfully' });
  } catch (error: unknown) {
    console.error('❌ Error deleting patient:', error);
    res.status(500).json({ error: getErrorMessage(error) || 'Failed to delete patient' });
  }
});

export default router;

