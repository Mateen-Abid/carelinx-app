import { Router } from 'express';
import { createSupabaseAdminClient, supabaseAdmin } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validateBookingSlotConflict } from '../utils/booking-conflicts';
import { attachResolvedServiceNames, resolveServiceNameForNewBooking } from '../utils/booking-service';

const router = Router();

type BookingClinicRow = {
  clinic_id?: string | null;
  clinic?: string | null;
  clinic_address?: string | null;
  [key: string]: unknown;
};

type ClinicAddressRow = {
  id: string;
  name: string;
  address: string | null;
};

type OccupiedDoctorRow = {
  doctor_id?: string | null;
  doctor_name?: string | null;
  appointment_time?: string | null;
  clinic_id?: string | null;
  clinic?: string | null;
};

type OccupiedTreatmentRow = {
  treatment_id?: string | null;
  treatment_name?: string | null;
  appointment_time?: string | null;
  clinic_id?: string | null;
  clinic?: string | null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
};

const normalizeOccupiedName = (value: string | null | undefined) => {
  const trimmed = String(value || '').trim().toLowerCase();
  return trimmed || null;
};

const clinicMatchesOccupiedRoute = (
  booking: { clinic_id?: string | null; clinic?: string | null },
  clinicId?: string | null,
  clinicName?: string | null
) => {
  if (clinicId) {
    return booking.clinic_id === clinicId;
  }

  if (clinicName) {
    return normalizeOccupiedName(booking.clinic) === normalizeOccupiedName(clinicName);
  }

  return true;
};

/**
 * GET /api/bookings/occupied-slots
 * Get occupied doctor slots for a specific date
 */
router.get('/occupied-slots', async (req, res) => {
  try {
    const adminDb = createSupabaseAdminClient();
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

    const occupiedDoctorSlots: Record<string, string[]> = {};
    const occupiedTreatmentSlots: Record<string, string[]> = {};

    if (doctorIds.length > 0 || doctorNames.length > 0) {
      const { data, error } = await adminDb
        .from('bookings')
        .select('doctor_id, doctor_name, appointment_time, clinic_id, clinic')
        .eq('appointment_date', date)
        .in('status', ['confirmed']);

      if (error) throw error;

      const requestedDoctorIds = new Set(doctorIds);
      const requestedDoctorNames = new Set(
        doctorNames
          .map((name) => normalizeOccupiedName(name))
          .filter((name): name is string => Boolean(name))
      );

      ((data as OccupiedDoctorRow[] | null) || []).forEach((booking) => {
        if (!booking.appointment_time || !clinicMatchesOccupiedRoute(booking, clinicId || null, clinicName || null)) {
          return;
        }

        if (booking.doctor_id && requestedDoctorIds.has(booking.doctor_id)) {
          if (!occupiedDoctorSlots[booking.doctor_id]) {
            occupiedDoctorSlots[booking.doctor_id] = [];
          }
          occupiedDoctorSlots[booking.doctor_id].push(booking.appointment_time);
        }

        const normalizedDoctorName = normalizeOccupiedName(booking.doctor_name);
        if (normalizedDoctorName && requestedDoctorNames.has(normalizedDoctorName)) {
          if (!occupiedDoctorSlots[normalizedDoctorName]) {
            occupiedDoctorSlots[normalizedDoctorName] = [];
          }
          occupiedDoctorSlots[normalizedDoctorName].push(booking.appointment_time);
        }
      });
    }

    if (treatmentIds.length > 0 || treatmentNames.length > 0) {
      const { data, error } = await adminDb
        .from('bookings')
        .select('treatment_id, treatment_name, appointment_time, clinic_id, clinic')
        .eq('appointment_date', date)
        .in('status', ['confirmed']);

      if (error) throw error;

      const requestedTreatmentIds = new Set(treatmentIds);
      const requestedTreatmentNames = new Set(
        treatmentNames
          .map((name) => normalizeOccupiedName(name))
          .filter((name): name is string => Boolean(name))
      );

      ((data as OccupiedTreatmentRow[] | null) || []).forEach((booking) => {
        if (!booking.appointment_time || !clinicMatchesOccupiedRoute(booking, clinicId || null, clinicName || null)) {
          return;
        }

        if (booking.treatment_id && requestedTreatmentIds.has(booking.treatment_id)) {
          if (!occupiedTreatmentSlots[booking.treatment_id]) {
            occupiedTreatmentSlots[booking.treatment_id] = [];
          }
          occupiedTreatmentSlots[booking.treatment_id].push(booking.appointment_time);
        }

        const normalizedTreatmentName = normalizeOccupiedName(booking.treatment_name);
        if (normalizedTreatmentName && requestedTreatmentNames.has(normalizedTreatmentName)) {
          if (!occupiedTreatmentSlots[normalizedTreatmentName]) {
            occupiedTreatmentSlots[normalizedTreatmentName] = [];
          }
          occupiedTreatmentSlots[normalizedTreatmentName].push(booking.appointment_time);
        }
      });
    }

    res.json({ occupiedDoctorSlots, occupiedTreatmentSlots });
  } catch (error: unknown) {
    console.error('Get occupied slots error:', error);
    res.status(400).json({ error: getErrorMessage(error) });
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

    const bookingsWithServices = await attachResolvedServiceNames(bookingsData || []);

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
      bookings: bookingsWithServices,
      profiles: profilesData || [],
      clinics: clinicsData || [],
      doctors: doctorsData || [],
    });
  } catch (error: unknown) {
    console.error('Get all bookings error:', error);
    res.status(400).json({ error: getErrorMessage(error) });
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
    const clinicIds = [
      ...new Set(
        ((data as BookingClinicRow[] | null) || [])
          .map((booking) => booking.clinic_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const clinicNames = [
      ...new Set(
        ((data as BookingClinicRow[] | null) || [])
          .map((booking) => booking.clinic)
          .filter((name): name is string => Boolean(name))
      ),
    ];
    
    const clinicMap = new Map<string, { address: string | null }>();
    
    if (clinicIds.length > 0) {
      const { data: clinicsById } = await supabaseAdmin
        .from('clinics')
        .select('id, name, address')
        .in('id', clinicIds);
      
      (clinicsById as ClinicAddressRow[] | null)?.forEach((clinic) => {
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
      
      (clinicsByName as ClinicAddressRow[] | null)?.forEach((clinic) => {
        clinicMap.set(clinic.id, { address: clinic.address });
        clinicMap.set(clinic.name.toLowerCase().trim(), { address: clinic.address });
      });
    }

    // Add clinic address to each booking
    const bookingsWithAddress = (data as BookingClinicRow[] | null)?.map((booking) => {
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
  } catch (error: unknown) {
    console.error('Get bookings error:', error);
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

/**
 * POST /api/bookings
 * Create a new booking
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const requestedClinicId = typeof req.body.clinic_id === 'string'
      ? req.body.clinic_id.trim()
      : '';
    let autoBookingEnabled = false;
    let canonicalClinicName = typeof req.body.clinic === 'string' ? req.body.clinic : null;

    if (requestedClinicId) {
      const { data: clinic, error: clinicError } = await supabaseAdmin
        .from('clinics')
        .select('id, name, status, auto_booking_enabled')
        .eq('id', requestedClinicId)
        .maybeSingle();

      if (clinicError) throw clinicError;
      if (!clinic) {
        return res.status(400).json({ error: 'Clinic not found' });
      }
      if (clinic.status !== 'active') {
        return res.status(403).json({ error: 'This clinic is not accepting appointments' });
      }

      autoBookingEnabled = clinic.auto_booking_enabled === true;
      canonicalClinicName = clinic.name;
    }

    const bookingData = await resolveServiceNameForNewBooking({
      ...req.body,
      user_id: userId,
      clinic_id: requestedClinicId || req.body.clinic_id || null,
      clinic: canonicalClinicName || req.body.clinic,
      status: autoBookingEnabled ? 'confirmed' : 'pending',
      confirmed_at: autoBookingEnabled ? new Date().toISOString() : null,
      booking_source: 'patient_app',
      created_by_role: 'patient',
      created_by_user_id: userId,
    });

    const bookingType = bookingData.booking_type === 'treatment' ? 'treatment' : 'doctor';
    const savedServiceName = typeof bookingData.service_name === 'string' ? bookingData.service_name.trim() : '';
    const savedTreatmentName = typeof bookingData.treatment_name === 'string' ? bookingData.treatment_name.trim() : '';
    if (!savedServiceName || savedServiceName.includes(',')) {
      return res.status(400).json({ error: 'Service is required to book this appointment' });
    }
    if (bookingType === 'treatment' && savedTreatmentName && savedServiceName.toLowerCase() === savedTreatmentName.toLowerCase()) {
      return res.status(400).json({ error: 'Service is required to book this appointment' });
    }

    const slotConflict = await validateBookingSlotConflict({
      bookingType: bookingData.booking_type || 'doctor',
      doctorId: bookingData.doctor_id || null,
      doctorName: bookingData.doctor_name || null,
      treatmentId: bookingData.treatment_id || null,
      treatmentName: bookingData.treatment_name || null,
      appointmentDate: bookingData.appointment_date || null,
      appointmentTime: bookingData.appointment_time || null,
      clinicId: bookingData.clinic_id || null,
      clinicName: bookingData.clinic || null,
    });

    if (slotConflict.hasConflict) {
      return res.status(409).json({ error: slotConflict.error });
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (error?.code === '23505' && error.message?.includes('appointment slot')) {
      return res.status(409).json({ error: error.message });
    }
    if (error) throw error;

    res.json({ booking: data, autoApproved: autoBookingEnabled });
  } catch (error: unknown) {
    console.error('Create booking error:', error);
    res.status(400).json({ error: getErrorMessage(error) });
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

    const { data: existingBooking, error: existingBookingError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (existingBookingError || !existingBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const nextBooking = {
      ...existingBooking,
      ...updates,
    };

    const isSlotChange =
      updates.appointment_date !== undefined ||
      updates.appointment_time !== undefined ||
      updates.doctor_id !== undefined ||
      updates.doctor_name !== undefined ||
      updates.treatment_id !== undefined ||
      updates.treatment_name !== undefined ||
      updates.booking_type !== undefined;

    if (isSlotChange) {
      const slotConflict = await validateBookingSlotConflict({
        bookingType: nextBooking.booking_type || 'doctor',
        doctorId: nextBooking.doctor_id || null,
        doctorName: nextBooking.doctor_name || null,
        treatmentId: nextBooking.treatment_id || null,
        treatmentName: nextBooking.treatment_name || null,
        appointmentDate: nextBooking.appointment_date || null,
        appointmentTime: nextBooking.appointment_time || null,
        clinicId: nextBooking.clinic_id || null,
        clinicName: nextBooking.clinic || null,
        excludeBookingId: id,
      });

      if (slotConflict.hasConflict) {
        return res.status(409).json({ error: slotConflict.error });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ booking: data });
  } catch (error: unknown) {
    console.error('Update booking error:', error);
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

export default router;

