import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

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
      .select('user_id, appointment_date, clinic_id, clinic, doctor_name, doctor_id')
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
    
    if (userIds.length === 0) {
      console.log('⚠️ No patients found with bookings from real clinics');
      return res.json({
        patients: [],
        clinics: clinicsData.map(c => c.name),
        doctors: []
      });
    }

    console.log('👥 Unique patient user IDs from real clinics:', userIds.length);

    // Fetch profiles for these users
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, email, gender, date_of_birth, phone, created_at')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return res.status(400).json({ error: profilesError.message });
    }

    console.log('✅ Profiles fetched:', profilesData?.length || 0);

    // Helper function to calculate age
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

    // Create maps for lookups
    const profileMap = new Map<string, any>();
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
      const userId = booking.user_id;
      if (userId) {
        const bookingDate = booking.appointment_date;
        const bookingDateStr = normalizeDate(bookingDate);
        const currentAny = lastAppointmentAnyMap.get(userId);
        if (!currentAny || bookingDateStr > normalizeDate(currentAny)) {
          lastAppointmentAnyMap.set(userId, bookingDate);
        }

        const currentLast = lastAppointmentMap.get(userId);
        if (bookingDateStr && bookingDateStr <= todayStr && (!currentLast || bookingDateStr > normalizeDate(currentLast))) {
          lastAppointmentMap.set(userId, bookingDate);
        }
        // Track doctor names for this patient
        if (!patientDoctorMap.has(userId)) {
          patientDoctorMap.set(userId, new Set<string>());
        }
        if (booking.doctor_name) {
          patientDoctorMap.get(userId)!.add(booking.doctor_name);
        }
        // Track clinic names for this patient
        if (!patientClinicMap.has(userId)) {
          patientClinicMap.set(userId, new Set<string>());
        }
        // Get clinic name from clinic_id or clinic field
        let clinicName = '';
        if (booking.clinic_id && clinicIdToNameMap.has(booking.clinic_id)) {
          clinicName = clinicIdToNameMap.get(booking.clinic_id)!;
        } else if (booking.clinic) {
          clinicName = booking.clinic;
        }
        if (clinicName) {
          patientClinicMap.get(userId)!.add(clinicName);
        }
      }
    });

    // Determine active status (patients with appointments in last 30 days or upcoming)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activePatientIds = new Set<string>();
    realClinicBookings.forEach(booking => {
      if (booking.user_id && booking.appointment_date) {
        const appointmentDate = new Date(booking.appointment_date);
        if (appointmentDate >= thirtyDaysAgo || appointmentDate >= today) {
          activePatientIds.add(booking.user_id);
        }
      }
    });

    // Transform profiles to patients
    const patients = profilesData?.map((profile) => {
      const lastAppointmentDate = lastAppointmentMap.get(profile.user_id) || lastAppointmentAnyMap.get(profile.user_id);
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

      const patientDoctors = patientDoctorMap.get(profile.user_id);
      const patientClinics = patientClinicMap.get(profile.user_id);
      
      return {
        id: profile.user_id,
        user_id: profile.user_id,
        name: profile.full_name || profile.email || 'Unknown Patient',
        gender: (profile.gender as 'Male' | 'Female' | 'Other') || 'Other',
        age: age > 0 ? age : 0,
        contact: profile.phone || profile.email || 'N/A',
        email: profile.email || '',
        lastAppointment: formattedDate,
        status: activePatientIds.has(profile.user_id) ? 'active' as const : 'inactive' as const,
        doctorNames: patientDoctors ? Array.from(patientDoctors) : [],
        clinicNames: patientClinics ? Array.from(patientClinics) : [],
      };
    }) || [];

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
  } catch (error: any) {
    console.error('❌ Error fetching patients:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch patients' });
  }
});

/**
 * GET /api/patients/:userId/appointments
 * Get patient's appointment history
 */
router.get('/:userId/appointments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const { data: appointmentsData, error } = await supabaseAdmin
      .from('bookings')
      .select('*, clinics(name)')
      .eq('user_id', userId)
      .order('appointment_date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching appointments:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ appointments: appointmentsData || [] });
  } catch (error: any) {
    console.error('Error fetching patient appointments:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch appointments' });
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
  } catch (error: any) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch profile' });
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
    const updateData: any = {
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
      const profileData: any = {
        user_id: userId,
        email: user.email || updateData.email || '',
        full_name: updateData.full_name || user.user_metadata?.full_name || 'Unknown Patient',
      };

      // Add optional fields only if they exist
      if (updateData.gender) profileData.gender = updateData.gender;
      if (updateData.phone) profileData.phone = updateData.phone;
      if (updateData.date_of_birth) profileData.date_of_birth = updateData.date_of_birth;

      console.log('💾 Creating profile with data:', profileData);

      // Create profile
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
      const fallbackProfileData: any = {
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
  } catch (error: any) {
    console.error('❌ Update patient error:', error);
    res.status(500).json({ error: error.message || 'Failed to update patient' });
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
  } catch (error: any) {
    console.error('❌ Error deleting patient:', error);
    res.status(500).json({ error: error.message || 'Failed to delete patient' });
  }
});

export default router;

