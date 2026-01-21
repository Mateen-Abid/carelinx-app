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
    const { fullName, gender, dateOfBirth, phone } = req.body;

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        gender: gender,
        date_of_birth: dateOfBirth || null,
        phone: phone || null,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating patient:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, message: 'Patient information updated successfully' });
  } catch (error: any) {
    console.error('Error updating patient:', error);
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

