import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

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

