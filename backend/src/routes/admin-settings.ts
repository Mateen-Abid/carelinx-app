import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/admin/settings
 * Get admin settings for authenticated user
 */
router.get('/settings', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from('admin_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({ settings: data || null });
  } catch (error: any) {
    console.error('Get admin settings error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin/settings
 * Create or update admin settings
 */
router.post('/settings', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const settingsData = {
      user_id: userId,
      ...req.body,
    };

    // Check if settings exist
    const { data: existingSettings } = await supabaseAdmin
      .from('admin_settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let result;
    if (existingSettings) {
      // Update existing settings
      const { data, error } = await supabaseAdmin
        .from('admin_settings')
        .update(settingsData)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Insert new settings
      const { data, error } = await supabaseAdmin
        .from('admin_settings')
        .insert(settingsData)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    res.json({ settings: result });
  } catch (error: any) {
    console.error('Save admin settings error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/admin/team-members
 * Get team members (from super_admin_invitations)
 */
router.get('/team-members', authenticate, async (req: AuthRequest, res) => {
  try {
    console.log('🔍 Fetching team members from super_admin_invitations...');
    const { data, error } = await supabaseAdmin
      .from('super_admin_invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching invitations:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      
      // Handle table not found gracefully
      if (error.code === '42P01') {
        console.log('⚠️ Table super_admin_invitations does not exist, returning empty array');
        return res.json({ teamMembers: [] });
      }
      throw error;
    }

    console.log('✅ Invitations fetched:', data?.length || 0);

    // Map invitations to team member format
    const teamMembers = (data || []).map((invitation: any) => {
      const roleName = invitation.role_type === 'super_admin' ? 'Super Admin' : 
                      invitation.role_type === 'clinic_admin' ? 'Clinic Admin' : 
                      'Admin';
      
      let memberStatus: 'active' | 'inactive' | 'on-leave' = 'active';
      if (invitation.status === 'pending') {
        memberStatus = 'active';
      } else if (invitation.status === 'accepted') {
        memberStatus = 'active';
      } else if (invitation.status === 'expired' || invitation.status === 'cancelled') {
        memberStatus = 'inactive';
      }
      
      const permissions: 'Full Access' | 'Limited Access' = 
        invitation.role_type === 'super_admin' ? 'Full Access' : 'Limited Access';
      
      return {
        id: invitation.id,
        name: invitation.name || invitation.email || 'N/A',
        role: roleName,
        description: `Invited as ${invitation.role_type === 'super_admin' ? 'Super Admin' : 'Clinic Admin'}`,
        status: memberStatus,
        permissions: permissions,
        access_level: invitation.role_type as 'super_admin' | 'clinic_admin' | 'public_user' | null,
        email: invitation.email,
        user_id: invitation.accepted_by || null,
        created_at: invitation.created_at,
        updated_at: invitation.updated_at || invitation.accepted_at,
      };
    });

    console.log('✅ Team members mapped:', teamMembers.length);
    res.json({ teamMembers });
  } catch (error: any) {
    console.error('❌ Get team members error:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    res.status(400).json({ error: error.message || 'Failed to fetch team members' });
  }
});

/**
 * GET /api/admin/profile
 * Get user profile with role information
 */
router.get('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;

    // Fetch profile data
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, created_at, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    // Fetch user role from user_roles table
    const { data: userRoleData, error: userRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role_type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    let roleType = null;
    if (!userRoleError && userRoleData?.role_type) {
      roleType = userRoleData.role_type;
    } else if (profileData?.role) {
      // Fallback to profiles.role
      roleType = profileData.role;
    }

    // Map role_type to display name
    const roleDisplayName = 
      roleType === 'super_admin' ? 'Super Admin' :
      roleType === 'clinic_admin' ? 'Clinic Administrator' :
      roleType === 'public_user' ? 'Public User' :
      roleType === 'patient' ? 'Patient' :
      'User';

    // Format joined date
    let joinedDate = '';
    if (profileData?.created_at) {
      const joinedDateObj = new Date(profileData.created_at);
      joinedDate = joinedDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    res.json({
      profile: {
        fullName: profileData?.full_name || 'Dr. Adebayo',
        email: profileData?.email || req.user.email || 'admin@lushcare.com',
        joinedDate,
        role: roleDisplayName,
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

