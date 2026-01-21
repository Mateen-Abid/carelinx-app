import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/profiles
 * Get authenticated user's profile
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, gender, date_of_birth, phone')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({ profile: data || null });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/profiles
 * Update authenticated user's profile
 */
router.patch('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;

    res.json({ profile: data });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

