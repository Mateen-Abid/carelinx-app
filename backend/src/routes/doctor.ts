import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

type BookingRecord = {
  id: string;
  user_id: string | null;
  doctor_name?: string | null;
  specialty?: string | null;
  status?: string | null;
  appointment_date?: string;
  appointment_time?: string;
  clinic?: string | null;
  clinic_id?: string | null;
  doctor_id?: string | null;
  created_at?: string;
};

const getDoctorContext = async (userId: string) => {
  const { data: userRole, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('role_type')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (roleError || userRole?.role_type !== 'doctor') {
    return { error: 'Only doctors can access this resource' };
  }

  const { data: doctor, error: doctorError } = await supabaseAdmin
    .from('doctors')
    .select('id, name, clinic_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (doctorError || !doctor) {
    return { error: 'Doctor record not found' };
  }

  const { data: clinic, error: clinicError } = await supabaseAdmin
    .from('clinics')
    .select('id, name, status, logo_url')
    .eq('id', doctor.clinic_id)
    .maybeSingle();

  if (clinicError || !clinic) {
    return { error: 'Clinic not found for doctor' };
  }

  return { doctor, clinic };
};

/**
 * GET /api/doctor/clinic
 * Get clinic for authenticated doctor
 */
router.get('/clinic', authenticate, async (req: AuthRequest, res) => {
  try {
    const context = await getDoctorContext(req.user.id);
    if ('error' in context) {
      return res.status(403).json({ error: context.error });
    }

    res.json({ clinic: context.clinic, doctor: context.doctor });
  } catch (error: unknown) {
    console.error('Get doctor clinic error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to load clinic' });
  }
});

/**
 * GET /api/doctor/bookings
 * Get bookings for authenticated doctor
 */
router.get('/bookings', authenticate, async (req: AuthRequest, res) => {
  try {
    const context = await getDoctorContext(req.user.id);
    if ('error' in context) {
      return res.status(403).json({ error: context.error });
    }

    const { doctor, clinic } = context;
    const dateFilter = typeof req.query.dateFilter === 'string' ? req.query.dateFilter : undefined;

    let bookings: BookingRecord[] = [];

    // Primary query by doctor_id
    let byIdQuery = supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('doctor_id', doctor.id)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (dateFilter === 'today' || dateFilter === 'tomorrow' || dateFilter === 'this-week') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      if (dateFilter === 'today') {
        byIdQuery = byIdQuery.eq('appointment_date', todayStr);
      } else if (dateFilter === 'tomorrow') {
        byIdQuery = byIdQuery.eq('appointment_date', tomorrowStr);
      } else if (dateFilter === 'this-week') {
        byIdQuery = byIdQuery
          .gte('appointment_date', weekStart.toISOString().split('T')[0])
          .lt('appointment_date', weekEnd.toISOString().split('T')[0]);
      }
    }
    const { data: byIdData, error: byIdError } = await byIdQuery;
    if (byIdError) {
      throw byIdError;
    }
    bookings = bookings.concat((byIdData || []) as BookingRecord[]);

    // Fallback query by doctor_name + clinic (older records)
    const clinicName = clinic.name?.trim();
    let byNameQuery = supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('doctor_name', doctor.name)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (clinicName) {
      byNameQuery = byNameQuery.or(`clinic_id.eq.${clinic.id},clinic.eq.${clinicName}`);
    } else {
      byNameQuery = byNameQuery.eq('clinic_id', clinic.id);
    }

    if (dateFilter === 'today' || dateFilter === 'tomorrow' || dateFilter === 'this-week') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      if (dateFilter === 'today') {
        byNameQuery = byNameQuery.eq('appointment_date', todayStr);
      } else if (dateFilter === 'tomorrow') {
        byNameQuery = byNameQuery.eq('appointment_date', tomorrowStr);
      } else if (dateFilter === 'this-week') {
        byNameQuery = byNameQuery
          .gte('appointment_date', weekStart.toISOString().split('T')[0])
          .lt('appointment_date', weekEnd.toISOString().split('T')[0]);
      }
    }
    const { data: byNameData, error: byNameError } = await byNameQuery;
    if (byNameError) {
      throw byNameError;
    }

    bookings = bookings.concat((byNameData || []) as BookingRecord[]);

    // De-duplicate by booking ID
    const seen = new Set<string>();
    const uniqueBookings = bookings.filter((booking) => {
      if (seen.has(booking.id)) return false;
      seen.add(booking.id);
      return true;
    });

    const userIds = [...new Set(uniqueBookings.map((b) => b.user_id).filter(Boolean))];
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, email, gender, date_of_birth, phone, created_at')
      .in('user_id', userIds);

    if (profilesError) {
      throw profilesError;
    }

    res.json({
      bookings: uniqueBookings,
      profiles: profilesData || [],
      clinic,
      doctor,
    });
  } catch (error: unknown) {
    console.error('Get doctor bookings error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to load bookings' });
  }
});

export default router;

