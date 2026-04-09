import { Router } from 'express';
import { createSupabaseAdminClient } from '../config/supabase';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/services/specialties
 * Get all specialties (public route)
 */
router.get('/specialties', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
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
    const supabaseAdmin = createSupabaseAdminClient();
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

/**
 * GET /api/services/clinic-treatments
 * Get active clinic treatments for patient-facing matching
 */
router.get('/clinic-treatments', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const clinicId = String(req.query.clinic_id || '').trim();

    if (!clinicId) {
      return res.status(400).json({ error: 'clinic_id is required' });
    }

    let query = supabaseAdmin
      .from('treatments')
      .select('id, clinic_id, name, price, specialty, service, status')
      .eq('clinic_id', clinicId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    const specialty = String(req.query.specialty || '').trim();
    if (specialty) {
      query = query.ilike('specialty', `%${specialty}%`);
    }

    const service = String(req.query.service || '').trim();
    if (service) {
      query = query.ilike('service', `%${service}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ treatments: data || [] });
  } catch (error: any) {
    console.error('Get clinic treatments error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/services/approved-clinic-services
 * Get approved clinic-requested services for patient-facing real clinic flows
 */
router.get('/approved-clinic-services', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const requestId = String(req.query.id || '').trim();
    const clinicId = String(req.query.clinic_id || '').trim();

    let query = supabaseAdmin
      .from('service_requests')
      .select(`
        id,
        clinic_id,
        specialty_id,
        service_name,
        status,
        requested_at,
        clinics:clinic_id (
          id,
          name,
          status
        ),
        specialties:specialty_id (
          name
        )
      `)
      .eq('status', 'approved')
      .order('requested_at', { ascending: false });

    if (requestId) {
      query = query.eq('id', requestId);
    }

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const services = (data || []).filter((item: any) => item?.clinics?.status === 'active');

    res.json({ services });
  } catch (error: any) {
    console.error('Get approved clinic services error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

