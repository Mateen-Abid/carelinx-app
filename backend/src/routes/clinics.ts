import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { optionalAuth, authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/clinics
 * Get all active clinics (public route)
 */
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('clinics')
      .select('id, name, name_ar, address, address_ar, logo_url, specialties, description, description_ar, status')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ clinics: data });
  } catch (error: any) {
    console.error('Get clinics error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/clinics/by-admin/:adminId
 * Get clinic by clinic_admin_id (authenticated route)
 * MUST come before /:id route to avoid route conflicts
 */
router.get('/by-admin/:adminId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { adminId } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('clinics')
      .select('id, name, name_ar, status, logo_url, address, address_ar, specialties, description, description_ar')
      .eq('clinic_admin_id', adminId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    res.json({ clinic: data });
  } catch (error: any) {
    console.error('Get clinic by admin error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/clinics/:id
 * Get a single clinic by ID (public route)
 */
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.warn(`⚠️ Invalid clinic ID format: ${id}`);
      return res.status(400).json({ error: 'Invalid clinic ID format' });
    }
    
    const { data, error } = await supabaseAdmin
      .from('clinics')
      .select('id, name, name_ar, address, address_ar, logo_url, specialties, description, description_ar, status')
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    res.json({ clinic: data });
  } catch (error: any) {
    console.error('Get clinic error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/clinics
 * Create a new clinic with clinic admin user (super admin only)
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, email, password, address, contact_phone, contact_email, website, description, specialties } = req.body;

    if (!name || !email || !password || !address) {
      return res.status(400).json({ error: 'Name, email, password, and address are required' });
    }

    console.log('📝 Creating clinic admin user:', email);

    // Create clinic admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: 'clinic_admin',
      },
    });

    if (authError) {
      console.error('❌ Error creating clinic admin user:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create clinic admin user');
    }

    console.log('✅ Clinic admin user created:', authData.user.id);

    // Create clinic
    const { data: clinicData, error: clinicError } = await supabaseAdmin
      .from('clinics')
      .insert({
        name,
        email,
        address,
        contact_phone: contact_phone || null,
        contact_email: contact_email || email,
        website: website || null,
        description: description || null,
        specialties: specialties || null,
        status: 'active',
        clinic_admin_id: authData.user.id,
      })
      .select()
      .single();

    if (clinicError) {
      console.error('❌ Error creating clinic:', clinicError);
      // Try to delete the user if clinic creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw clinicError;
    }

    // Update profile role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'clinic_admin' })
      .eq('user_id', authData.user.id);

    if (profileError) {
      console.warn('⚠️ Warning: Failed to update profile role:', profileError);
      // Don't fail the whole operation if profile update fails
    }

    console.log('✅ Clinic created successfully:', clinicData.id);
    res.json({ clinic: clinicData });
  } catch (error: any) {
    console.error('Create clinic error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/clinics/:id
 * Update a clinic (super admin only)
 */
router.patch('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('clinics')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error('Update clinic error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

