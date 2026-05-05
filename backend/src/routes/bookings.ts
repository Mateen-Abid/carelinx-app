import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getOccupiedSlots, validateBookingSlotConflict } from '../utils/booking-conflicts';

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

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
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

    const { occupiedDoctorSlots, occupiedTreatmentSlots } = await getOccupiedSlots({
      date,
      doctorIds,
      doctorNames,
      treatmentIds,
      treatmentNames,
      clinicId: clinicId || null,
      clinicName: clinicName || null,
    });

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
    const bookingData = {
      ...req.body,
      user_id: userId,
      booking_source: 'patient_app',
      created_by_role: 'patient',
      created_by_user_id: userId,
    };

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

    if (error) throw error;

    res.json({ booking: data });
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

