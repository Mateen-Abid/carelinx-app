import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/user/role
 * Get user's role
 */
router.get('/role', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    // Check user_roles table first
    const { data: userRoleData, error: userRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role_type, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!userRoleError && userRoleData?.role_type) {
      return res.json({ role: userRoleData.role_type });
    }

    // Fallback to profiles table
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (!profileError && profileData?.role) {
      return res.json({ role: profileData.role });
    }

    // Default to patient
    res.json({ role: 'patient' });
  } catch (error: any) {
    console.error('Get user role error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

