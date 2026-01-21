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

    res.json({ bookings: data });
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

