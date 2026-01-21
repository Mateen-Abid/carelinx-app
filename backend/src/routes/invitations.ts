import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { optionalAuth, authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/invitations/:token
 * Get invitation by token (public route - no auth required)
 */
router.get('/:token', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Invalid invitation link' });
    }

    // First try to fetch from super_admin_invitations
    const { data: superAdminData, error: superAdminError } = await supabaseAdmin
      .from('super_admin_invitations')
      .select('*')
      .eq('invitation_token', token)
      .maybeSingle();

    if (superAdminData) {
      return res.json({ 
        invitation: { ...superAdminData, invitation_type: 'super_admin', role_type: 'super_admin' } 
      });
    }

    if (superAdminError && superAdminError.code !== 'PGRST116') {
      // If error is not "not found", try clinic_admin_invitations
      const { data: clinicAdminData, error: clinicAdminError } = await supabaseAdmin
        .from('clinic_admin_invitations')
        .select('*')
        .eq('invitation_token', token)
        .maybeSingle();

      if (clinicAdminData) {
        return res.json({ 
          invitation: { ...clinicAdminData, invitation_type: 'clinic_admin', role_type: clinicAdminData.role_type || 'doctor' } 
        });
      }

      if (clinicAdminError && clinicAdminError.code !== 'PGRST116') {
        throw clinicAdminError;
      }
    } else {
      // Not found in super_admin_invitations, try clinic_admin_invitations
      const { data: clinicAdminData, error: clinicAdminError } = await supabaseAdmin
        .from('clinic_admin_invitations')
        .select('*')
        .eq('invitation_token', token)
        .maybeSingle();

      if (clinicAdminData) {
        return res.json({ 
          invitation: { ...clinicAdminData, invitation_type: 'clinic_admin', role_type: clinicAdminData.role_type || 'doctor' } 
        });
      }

      if (clinicAdminError && clinicAdminError.code !== 'PGRST116') {
        throw clinicAdminError;
      }
    }

    // Invitation not found
    res.status(404).json({ error: 'Invitation not found or invalid' });
  } catch (error: any) {
    console.error('Get invitation error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/invitations/send
 * Send invitation via Supabase Edge Function (server-side)
 * This route prevents API keys from being exposed to the frontend
 */
router.post('/send', authenticate, async (req: AuthRequest, res) => {
  try {
    const { email, name, role_type, app_url } = req.body;

    if (!email || !role_type) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, role_type' 
      });
    }

    // Validate role_type
    if (!['super_admin', 'clinic_admin'].includes(role_type)) {
      return res.status(400).json({ 
        error: 'Invalid role_type. Must be super_admin or clinic_admin' 
      });
    }

    // Check if user is super_admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role_type')
      .eq('user_id', req.user!.id)
      .eq('is_active', true)
      .single();

    if (roleError || !userRole || userRole.role_type !== 'super_admin') {
      return res.status(403).json({ 
        error: 'Only super admin can send invitations' 
      });
    }

    // Get Supabase URL and anon key from environment
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Get user's access token from cookie (already validated by authenticate middleware)
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
      return res.status(401).json({ error: 'No access token found' });
    }

    // Build Edge Function URL
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-invitation`;

    console.log('📤 Backend calling Edge Function to send invitation:', { email, role_type });

    // Call Supabase Edge Function from backend
    // This way, the API key is never exposed to the frontend
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': supabaseAnonKey, // Anon key is used here (server-side only, not exposed to frontend)
      },
      body: JSON.stringify({
        email: email.trim(),
        name: name?.trim() || null,
        role_type: role_type,
        app_url: app_url || process.env.FRONTEND_URL || 'http://localhost:8080',
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Edge Function error:', responseData);
      return res.status(response.status).json(responseData);
    }

    console.log('✅ Invitation sent successfully via Edge Function');
    res.json(responseData);
  } catch (error: any) {
    console.error('❌ Send invitation error:', error);
    res.status(500).json({ error: error.message || 'Failed to send invitation' });
  }
});

export default router;

