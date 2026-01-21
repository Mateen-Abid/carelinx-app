import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/stats/dashboard
 * Get dashboard statistics
 */
router.get('/dashboard', authenticate, async (req: AuthRequest, res) => {
  try {
    // Fetch clinics
    const { data: clinicsData, error: clinicsError } = await supabaseAdmin
      .from('clinics')
      .select('*')
      .order('created_at', { ascending: false });

    if (clinicsError) {
      throw clinicsError;
    }

    const clinics = clinicsData || [];

    // Calculate stats
    const totalClinics = clinics.length;
    const activeClinics = clinics.filter((c: any) => c.status === 'active').length;
    const pendingClinics = clinics.filter((c: any) => c.status === 'pending').length;
    const suspendedClinics = clinics.filter((c: any) => c.status === 'suspended').length;

    // Fetch additional statistics
    const { count: totalPatients } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'patient');

    const { count: totalAppointments } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    // Get total doctors from doctors table
    const { count: totalDoctors } = await supabaseAdmin
      .from('doctors')
      .select('*', { count: 'exact', head: true });

    res.json({
      stats: {
        totalClinics: totalClinics || 0,
        activeClinics: activeClinics || 0,
        pendingApproval: pendingClinics || 0,
        suspendedClinics: suspendedClinics || 0,
        totalDoctors: totalDoctors || 0,
        totalPatients: totalPatients || 0,
        totalAppointments: totalAppointments || 0,
      },
      clinics,
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/stats/clinic/:id
 * Get statistics for a specific clinic
 */
router.get('/clinic/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id: clinicId } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clinicId)) {
      console.warn(`⚠️ Invalid clinic ID format in stats: ${clinicId}`);
      return res.status(400).json({ error: 'Invalid clinic ID format' });
    }

    // Fetch clinic to get name
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('name')
      .eq('id', clinicId)
      .single();

    if (clinicError || !clinicData) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    const clinicName = clinicData.name;

    // Fetch total doctors for this clinic
    const { count: totalDoctors, error: doctorsError } = await supabaseAdmin
      .from('doctors')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);

    // Fetch total appointments for this clinic
    // First try by clinic_id
    const { count: appointmentsByClinicId, error: appointmentsErrorById } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);

    // Also fetch by clinic name for NULL clinic_id bookings
    let appointmentsByClinicName = 0;
    if (clinicName) {
      const { count: countByName, error: appointmentsErrorByName } = await supabaseAdmin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .is('clinic_id', null)
        .ilike('clinic', clinicName);

      if (!appointmentsErrorByName && countByName) {
        appointmentsByClinicName = countByName;
      }
    }

    const totalAppointments = (appointmentsByClinicId || 0) + appointmentsByClinicName;

    // Fetch total patients (unique users who have booked with this clinic)
    // First get bookings by clinic_id
    const { data: bookingsByClinicId, error: bookingsErrorById } = await supabaseAdmin
      .from('bookings')
      .select('user_id')
      .eq('clinic_id', clinicId);

    // Also get bookings by clinic name for NULL clinic_id
    let bookingsByClinicName: any[] = [];
    if (clinicName) {
      const { data: bookingsByName, error: bookingsErrorByName } = await supabaseAdmin
        .from('bookings')
        .select('user_id')
        .is('clinic_id', null)
        .ilike('clinic', clinicName);

      if (!bookingsErrorByName && bookingsByName) {
        bookingsByClinicName = bookingsByName;
      }
    }

    // Combine both sets and get unique user_ids
    const allBookings = [...(bookingsByClinicId || []), ...bookingsByClinicName];
    const uniqueUserIds = new Set(allBookings.map((b: any) => b.user_id).filter(Boolean));
    const totalPatients = uniqueUserIds.size;

    res.json({
      totalDoctors: totalDoctors || 0,
      totalPatients: totalPatients || 0,
      totalAppointments: totalAppointments || 0,
    });
  } catch (error: any) {
    console.error('Get clinic stats error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

