import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const ACTIVE_BOOKING_STATUSES = ['confirmed'];

const normalizeTimeValue = (value: string | null | undefined): string | null => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    const hourRaw = Number(twelveHourMatch[1]);
    const minute = Number(twelveHourMatch[2]);
    const period = twelveHourMatch[3].toUpperCase();

    if (Number.isNaN(hourRaw) || Number.isNaN(minute) || hourRaw < 1 || hourRaw > 12 || minute < 0 || minute > 59) {
      return null;
    }

    let hour24 = hourRaw % 12;
    if (period === 'PM') {
      hour24 += 12;
    }

    return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (twentyFourHourMatch) {
    const hour = Number(twentyFourHourMatch[1]);
    const minute = Number(twentyFourHourMatch[2]);

    if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  return trimmed.replace(/\s+/g, '').toUpperCase();
};

const normalizeNameValue = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
};

const clinicMatches = (
  booking: { clinic_id?: string | null; clinic?: string | null },
  clinicId?: string | null,
  clinicName?: string | null
) => {
  if (clinicId) {
    return booking.clinic_id === clinicId;
  }

  if (clinicName) {
    return normalizeNameValue(booking.clinic) === normalizeNameValue(clinicName);
  }

  return true;
};

const hasDoctorSlotConflict = async (
  doctorId: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<boolean> => {
  const normalizedRequestedTime = normalizeTimeValue(appointmentTime);
  if (!normalizedRequestedTime) return false;

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('appointment_time')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', appointmentDate)
    .in('status', ACTIVE_BOOKING_STATUSES);

  if (error) {
    throw error;
  }

  return (data || []).some((booking: any) => normalizeTimeValue(booking.appointment_time) === normalizedRequestedTime);
};

const hasDoctorSlotConflictByName = async (
  doctorName: string,
  appointmentDate: string,
  appointmentTime: string,
  clinicId?: string | null,
  clinicName?: string | null
): Promise<boolean> => {
  const normalizedRequestedTime = normalizeTimeValue(appointmentTime);
  const normalizedDoctorName = normalizeNameValue(doctorName);
  if (!normalizedRequestedTime || !normalizedDoctorName) return false;

  let query = supabaseAdmin
    .from('bookings')
    .select('doctor_name, appointment_time, clinic_id, clinic')
    .eq('appointment_date', appointmentDate)
    .in('status', ACTIVE_BOOKING_STATUSES);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).some((booking: any) => {
    const bookingDoctorName = normalizeNameValue(booking.doctor_name);
    const bookingTime = normalizeTimeValue(booking.appointment_time);
    return (
      bookingDoctorName === normalizedDoctorName &&
      bookingTime === normalizedRequestedTime &&
      clinicMatches(booking, clinicId, clinicName)
    );
  });
};

const hasTreatmentSlotConflict = async (
  treatmentId: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<boolean> => {
  const normalizedRequestedTime = normalizeTimeValue(appointmentTime);
  if (!normalizedRequestedTime) return false;

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('appointment_time')
    .eq('treatment_id', treatmentId)
    .eq('appointment_date', appointmentDate)
    .in('status', ACTIVE_BOOKING_STATUSES);

  if (error) {
    throw error;
  }

  return (data || []).some((booking: any) => normalizeTimeValue(booking.appointment_time) === normalizedRequestedTime);
};

const hasTreatmentSlotConflictByName = async (
  treatmentName: string,
  appointmentDate: string,
  appointmentTime: string,
  clinicId?: string | null,
  clinicName?: string | null
): Promise<boolean> => {
  const normalizedRequestedTime = normalizeTimeValue(appointmentTime);
  const normalizedTreatmentName = normalizeNameValue(treatmentName);
  if (!normalizedRequestedTime || !normalizedTreatmentName) return false;

  let query = supabaseAdmin
    .from('bookings')
    .select('treatment_name, appointment_time, clinic_id, clinic')
    .eq('appointment_date', appointmentDate)
    .in('status', ACTIVE_BOOKING_STATUSES);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).some((booking: any) => {
    const bookingTreatmentName = normalizeNameValue(booking.treatment_name);
    const bookingTime = normalizeTimeValue(booking.appointment_time);
    return (
      bookingTreatmentName === normalizedTreatmentName &&
      bookingTime === normalizedRequestedTime &&
      clinicMatches(booking, clinicId, clinicName)
    );
  });
};

/**
 * GET /api/bookings/occupied-slots
 * Get occupied doctor slots for a specific date
 */
router.get('/occupied-slots', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');

    const date = typeof req.query.date === 'string' ? req.query.date : '';
    const doctorIdsParam = typeof req.query.doctor_ids === 'string' ? req.query.doctor_ids : '';
    const doctorNamesParam = typeof req.query.doctor_names === 'string' ? req.query.doctor_names : '';
    const treatmentIdsParam = typeof req.query.treatment_ids === 'string' ? req.query.treatment_ids : '';
    const treatmentNamesParam = typeof req.query.treatment_names === 'string' ? req.query.treatment_names : '';
    const clinicId = typeof req.query.clinic_id === 'string' ? req.query.clinic_id : '';
    const clinicName = typeof req.query.clinic === 'string' ? req.query.clinic : '';
    const doctorIds = doctorIdsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const doctorNames = doctorNamesParam
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    const treatmentIds = treatmentIdsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const treatmentNames = treatmentNamesParam
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    if (doctorIds.length === 0 && doctorNames.length === 0 && treatmentIds.length === 0 && treatmentNames.length === 0) {
      return res.json({ occupiedDoctorSlots: {}, occupiedTreatmentSlots: {} });
    }

    let occupiedDoctorSlots: Record<string, string[]> = {};
    let occupiedTreatmentSlots: Record<string, string[]> = {};

    if (doctorIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .select('doctor_id, appointment_time')
        .eq('appointment_date', date)
        .in('doctor_id', doctorIds)
        .in('status', ACTIVE_BOOKING_STATUSES);

      if (error) throw error;

      occupiedDoctorSlots = (data || []).reduce((acc: Record<string, string[]>, booking: any) => {
        if (!booking.doctor_id || !booking.appointment_time) return acc;

        if (!acc[booking.doctor_id]) {
          acc[booking.doctor_id] = [];
        }

        acc[booking.doctor_id].push(booking.appointment_time);
        return acc;
      }, {});
    }

    if (doctorNames.length > 0) {
      const query = supabaseAdmin
        .from('bookings')
        .select('doctor_name, appointment_time, clinic_id, clinic')
        .eq('appointment_date', date)
        .in('status', ACTIVE_BOOKING_STATUSES);

      const { data, error } = await query;

      if (error) throw error;

      const requestedNameSet = new Set(doctorNames.map((name) => normalizeNameValue(name)).filter(Boolean));
      (data || []).forEach((booking: any) => {
        const normalizedDoctorName = normalizeNameValue(booking.doctor_name);
        if (
          !normalizedDoctorName ||
          !requestedNameSet.has(normalizedDoctorName) ||
          !booking.appointment_time ||
          !clinicMatches(booking, clinicId, clinicName)
        ) {
          return;
        }

        if (!occupiedDoctorSlots[normalizedDoctorName]) {
          occupiedDoctorSlots[normalizedDoctorName] = [];
        }

        occupiedDoctorSlots[normalizedDoctorName].push(booking.appointment_time);
      });
    }

    if (treatmentIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .select('treatment_id, appointment_time')
        .eq('appointment_date', date)
        .in('treatment_id', treatmentIds)
        .in('status', ACTIVE_BOOKING_STATUSES);

      if (error) throw error;

      occupiedTreatmentSlots = (data || []).reduce((acc: Record<string, string[]>, booking: any) => {
        if (!booking.treatment_id || !booking.appointment_time) return acc;

        if (!acc[booking.treatment_id]) {
          acc[booking.treatment_id] = [];
        }

        acc[booking.treatment_id].push(booking.appointment_time);
        return acc;
      }, {});
    }

    if (treatmentNames.length > 0) {
      const query = supabaseAdmin
        .from('bookings')
        .select('treatment_name, appointment_time, clinic_id, clinic')
        .eq('appointment_date', date)
        .in('status', ACTIVE_BOOKING_STATUSES);

      const { data, error } = await query;

      if (error) throw error;

      const requestedNameSet = new Set(treatmentNames.map((name) => normalizeNameValue(name)).filter(Boolean));
      (data || []).forEach((booking: any) => {
        const normalizedTreatmentName = normalizeNameValue(booking.treatment_name);
        if (
          !normalizedTreatmentName ||
          !requestedNameSet.has(normalizedTreatmentName) ||
          !booking.appointment_time ||
          !clinicMatches(booking, clinicId, clinicName)
        ) {
          return;
        }

        if (!occupiedTreatmentSlots[normalizedTreatmentName]) {
          occupiedTreatmentSlots[normalizedTreatmentName] = [];
        }

        occupiedTreatmentSlots[normalizedTreatmentName].push(booking.appointment_time);
      });
    }

    res.json({ occupiedDoctorSlots, occupiedTreatmentSlots });
  } catch (error: any) {
    console.error('Get occupied slots error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/bookings/all
 * Get ALL bookings (Super Admin only)
 */
router.get('/all', authenticate, async (req: AuthRequest, res) => {
  try {
    // TODO: Add role check for super_admin
    
    // Fetch ALL bookings from database
    const { data: bookingsData, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (bookingsError) throw bookingsError;

    // Fetch profiles for patient details
    const { data: profilesData } = await supabaseAdmin
      .from('profiles')
      .select('*');

    // Fetch clinics
    const { data: clinicsData } = await supabaseAdmin
      .from('clinics')
      .select('id, name, status')
      .eq('status', 'active');

    // Fetch doctors
    const { data: doctorsData } = await supabaseAdmin
      .from('doctors')
      .select('id, name, clinic_id');

    res.json({
      bookings: bookingsData || [],
      profiles: profilesData || [],
      clinics: clinicsData || [],
      doctors: doctorsData || [],
    });
  } catch (error: any) {
    console.error('Get all bookings error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/bookings
 * Get all bookings for authenticated user
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch clinics to get addresses
    const clinicIds = [...new Set(data?.map((b: any) => b.clinic_id).filter((id: any) => id) || [])];
    const clinicNames = [...new Set(data?.map((b: any) => b.clinic).filter((name: any) => name) || [])];
    
    let clinicMap = new Map<string, { address: string | null }>();
    
    if (clinicIds.length > 0) {
      const { data: clinicsById } = await supabaseAdmin
        .from('clinics')
        .select('id, name, address')
        .in('id', clinicIds);
      
      clinicsById?.forEach((clinic: any) => {
        clinicMap.set(clinic.id, { address: clinic.address });
        // Also map by name for fallback
        clinicMap.set(clinic.name.toLowerCase().trim(), { address: clinic.address });
      });
    }
    
    // Also fetch by clinic names (for bookings without clinic_id)
    if (clinicNames.length > 0) {
      const { data: clinicsByName } = await supabaseAdmin
        .from('clinics')
        .select('id, name, address')
        .in('name', clinicNames);
      
      clinicsByName?.forEach((clinic: any) => {
        clinicMap.set(clinic.id, { address: clinic.address });
        clinicMap.set(clinic.name.toLowerCase().trim(), { address: clinic.address });
      });
    }

    // Add clinic address to each booking
    const bookingsWithAddress = data?.map((booking: any) => {
      let clinicAddress = null;
      
      // Try to find address by clinic_id first
      if (booking.clinic_id && clinicMap.has(booking.clinic_id)) {
        clinicAddress = clinicMap.get(booking.clinic_id)?.address || null;
      } else if (booking.clinic) {
        // Fallback to clinic name
        const normalizedName = booking.clinic.toLowerCase().trim();
        if (clinicMap.has(normalizedName)) {
          clinicAddress = clinicMap.get(normalizedName)?.address || null;
        }
      }
      
      return {
        ...booking,
        clinic_address: clinicAddress
      };
    });

    res.json({ bookings: bookingsWithAddress || [] });
  } catch (error: any) {
    console.error('Get bookings error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/bookings
 * Create a new booking
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const bookingData = { ...req.body, user_id: userId };

    if (bookingData.doctor_id && bookingData.appointment_date && bookingData.appointment_time) {
      const slotConflict = await hasDoctorSlotConflict(
        bookingData.doctor_id,
        bookingData.appointment_date,
        bookingData.appointment_time
      );

      if (slotConflict) {
        return res.status(409).json({ error: 'This doctor time slot has already been booked' });
      }
    }

    if (bookingData.doctor_name && bookingData.appointment_date && bookingData.appointment_time) {
      const slotConflict = await hasDoctorSlotConflictByName(
        bookingData.doctor_name,
        bookingData.appointment_date,
        bookingData.appointment_time,
        bookingData.clinic_id || null,
        bookingData.clinic || null
      );

      if (slotConflict) {
        return res.status(409).json({ error: 'This doctor time slot has already been booked' });
      }
    }

    if (bookingData.treatment_id && bookingData.appointment_date && bookingData.appointment_time) {
      const slotConflict = await hasTreatmentSlotConflict(
        bookingData.treatment_id,
        bookingData.appointment_date,
        bookingData.appointment_time
      );

      if (slotConflict) {
        return res.status(409).json({ error: 'This treatment time slot has already been booked' });
      }
    }

    if (bookingData.booking_type === 'treatment' && bookingData.treatment_name && bookingData.appointment_date && bookingData.appointment_time) {
      const slotConflict = await hasTreatmentSlotConflictByName(
        bookingData.treatment_name,
        bookingData.appointment_date,
        bookingData.appointment_time,
        bookingData.clinic_id || null,
        bookingData.clinic || null
      );

      if (slotConflict) {
        return res.status(409).json({ error: 'This treatment time slot has already been booked' });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (error) throw error;

    res.json({ booking: data });
  } catch (error: any) {
    console.error('Create booking error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/bookings/:id
 * Update booking status
 */
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ booking: data });
  } catch (error: any) {
    console.error('Update booking error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

