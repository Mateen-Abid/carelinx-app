import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { optionalAuth, authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

type AvailabilityEntry = {
  day_of_week: number;
  start_minutes: number;
  end_minutes: number;
};

const dayNameToNumber: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const dbTimeToMinutes = (dbTime: string | null): number | null => {
  if (!dbTime) return null;
  const [h, m] = dbTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const displayTimeToMinutes = (value: string): number | null => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  const hourRaw = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (Number.isNaN(hourRaw) || Number.isNaN(minute) || hourRaw < 1 || hourRaw > 12 || minute < 0 || minute > 59) {
    return null;
  }

  let hour24 = hourRaw % 12;
  if (period === 'PM') hour24 += 12;

  return hour24 * 60 + minute;
};

const parseAvailability = (availability: string): AvailabilityEntry[] | null => {
  const parts = availability
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return [];

  const parsed: AvailabilityEntry[] = [];

  for (const part of parts) {
    const match = part.match(/^([A-Za-z]+):\s*(.+)\s-\s(.+)$/);
    if (!match) return null;

    const dayName = match[1].toLowerCase();
    const day_of_week = dayNameToNumber[dayName];
    if (day_of_week === undefined) return null;

    const start_minutes = displayTimeToMinutes(match[2]);
    const end_minutes = displayTimeToMinutes(match[3]);
    if (start_minutes === null || end_minutes === null || end_minutes <= start_minutes) return null;

    parsed.push({ day_of_week, start_minutes, end_minutes });
  }

  return parsed;
};

const validateAvailabilityWithinClinicHours = async (
  clinicId: string,
  availability: string
): Promise<{ valid: boolean; error?: string }> => {
  const entries = parseAvailability(availability);
  if (entries === null) {
    return { valid: false, error: 'Invalid availability format' };
  }

  // Allow empty availability string
  if (entries.length === 0) return { valid: true };

  const { data: clinicHours, error } = await supabaseAdmin
    .from('clinic_operating_hours')
    .select('day_of_week, opening_time, closing_time, is_closed')
    .eq('clinic_id', clinicId);

  if (error) {
    return { valid: false, error: `Failed to validate clinic hours: ${error.message}` };
  }

  const hoursMap = new Map<number, { opening: number | null; closing: number | null; is_closed: boolean }>();
  (clinicHours || []).forEach((h: any) => {
    hoursMap.set(h.day_of_week, {
      opening: dbTimeToMinutes(h.opening_time),
      closing: dbTimeToMinutes(h.closing_time),
      is_closed: !!h.is_closed,
    });
  });

  for (const entry of entries) {
    const clinicDay = hoursMap.get(entry.day_of_week);
    if (!clinicDay || clinicDay.is_closed || clinicDay.opening === null || clinicDay.closing === null) {
      return { valid: false, error: 'Doctor availability must be within clinic operating days' };
    }

    if (entry.start_minutes < clinicDay.opening || entry.end_minutes > clinicDay.closing) {
      return { valid: false, error: 'Doctor availability must be within clinic operating hours' };
    }
  }

  return { valid: true };
};

/**
 * GET /api/doctors
 * Get all active doctors (public route)
 * For super admin: use ?all=true to get all doctors regardless of status
 */
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { clinic_id, all } = req.query;
    
    // Check if user is super admin or clinic admin (if authenticated)
    let isSuperAdmin = false;
    let isClinicAdmin = false;
    if (req.user) {
      const { data: userRole } = await supabaseAdmin
        .from('user_roles')
        .select('role_type')
        .eq('user_id', req.user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      isSuperAdmin = userRole?.role_type === 'super_admin';
      isClinicAdmin = userRole?.role_type === 'clinic_admin';
    }
    
    // If super admin requests all doctors, or clinic admin is viewing their clinic's doctors, don't filter by status
    // Otherwise, only return active doctors for public users
    let query = supabaseAdmin
      .from('doctors')
      .select('id, name, specialty, email, phone, availability, clinic_id, status, services, price');

    // Only filter by status if:
    // - Not super admin requesting all doctors (all=true)
    // - Not clinic admin viewing their own clinic's doctors
    // - Public user (unauthenticated or not admin)
    const shouldFilterByStatus = !(isSuperAdmin && all === 'true') && !(isClinicAdmin && clinic_id);
    
    if (shouldFilterByStatus) {
      query = query.eq('status', 'active');
    }

    if (clinic_id) {
      query = query.eq('clinic_id', clinic_id);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;

    res.json({ doctors: data });
  } catch (error: any) {
    console.error('Get doctors error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/doctors
 * Create a new doctor (clinic admin only)
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { clinic_id, name, specialty, email, phone, availability, services, status, price } = req.body;

    if (!clinic_id || !name || !specialty) {
      return res.status(400).json({ error: 'Clinic ID, name, and specialty are required' });
    }

    // Verify clinic belongs to user
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('id', clinic_id)
      .eq('clinic_admin_id', req.user.id)
      .single();

    if (clinicError || !clinicData) {
      return res.status(403).json({ error: 'Clinic not found or access denied' });
    }

    if (availability && typeof availability === 'string') {
      const validation = await validateAvailabilityWithinClinicHours(clinic_id, availability);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'Invalid doctor availability' });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('doctors')
      .insert({
        clinic_id,
        name,
        specialty,
        email: email || null,
        phone: phone || null,
        availability: availability || null,
        services: services || null,
        status: status || 'active',
        price: price ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ doctor: data });
  } catch (error: any) {
    console.error('Create doctor error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/doctors/:id/appointments
 * Get appointments for a specific doctor (super admin only)
 */
router.get('/:id/appointments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // First get doctor name
    const { data: doctorData, error: doctorError } = await supabaseAdmin
      .from('doctors')
      .select('name')
      .eq('id', id)
      .maybeSingle();

    if (doctorError) throw doctorError;
    if (!doctorData) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Get appointments by doctor name
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('doctor_name', doctorData.name)
      .order('appointment_date', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({ appointments: data || [] });
  } catch (error: any) {
    console.error('Get doctor appointments error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/doctors/:id
 * Update doctor (super admin only)
 */
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.availability && typeof updates.availability === 'string') {
      const { data: doctor, error: doctorError } = await supabaseAdmin
        .from('doctors')
        .select('clinic_id')
        .eq('id', id)
        .single();

      if (doctorError || !doctor?.clinic_id) {
        return res.status(404).json({ error: 'Doctor not found' });
      }

      const validation = await validateAvailabilityWithinClinicHours(doctor.clinic_id, updates.availability);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'Invalid doctor availability' });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('doctors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ doctor: data });
  } catch (error: any) {
    console.error('Update doctor error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/doctors/:id
 * Delete doctor (super admin only)
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('doctors')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Doctor deleted successfully' });
  } catch (error: any) {
    console.error('Delete doctor error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

