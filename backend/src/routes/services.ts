import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/services/specialties
 * Get all specialties (public route)
 */
router.get('/specialties', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('super_admin_specialties')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({ specialties: data });
  } catch (error: any) {
    console.error('Get specialties error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/services/treatments
 * Get all treatments (public route)
 */
router.get('/treatments', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('super_admin_services')
      .select(`
        id,
        name,
        specialty_id,
        specialties:specialty_id(name)
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({ treatments: data });
  } catch (error: any) {
    console.error('Get treatments error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

