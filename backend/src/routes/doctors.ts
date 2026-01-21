import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { optionalAuth, authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/doctors
 * Get all active doctors (public route)
 */
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { clinic_id } = req.query;
    
    let query = supabaseAdmin
      .from('doctors')
      .select('id, name, specialty, email, phone, availability, clinic_id, status, services')
      .eq('status', 'active');

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
    const { clinic_id, name, specialty, email, phone, availability, services, status } = req.body;

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

