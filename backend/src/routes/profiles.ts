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

    console.log('💾 Updating user profile:', {
      userId,
      updates,
    });

    // First, check if profile exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking profile:', checkError);
      return res.status(400).json({ error: checkError.message });
    }

    if (!existingProfile) {
      // Profile doesn't exist - create it with user data from auth
      console.log('⚠️ Profile not found for user:', userId, '- creating profile');

      // Get user email from auth
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (userError || !user) {
        console.error('❌ Error fetching user from auth:', userError);
        return res.status(404).json({ error: `User not found: ${userError?.message || 'Unknown error'}` });
      }

      console.log('✅ User found in auth:', { email: user.email, id: user.id });

      // Prepare profile data
      const profileData: any = {
        user_id: userId,
        email: user.email || updates.email || '',
        full_name: updates.full_name || user.user_metadata?.full_name || 'Unknown User',
      };

      // Add optional fields if provided
      if (updates.gender) profileData.gender = updates.gender;
      if (updates.phone) profileData.phone = updates.phone;
      if (updates.date_of_birth) profileData.date_of_birth = updates.date_of_birth;

      console.log('💾 Creating profile with data:', profileData);

      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert(profileData)
        .select('user_id, full_name, email, gender, date_of_birth, phone, created_at')
        .maybeSingle();

      if (createError) {
        console.error('❌ Error creating profile:', createError);
        return res.status(400).json({ error: `Failed to create profile: ${createError.message}` });
      }

      if (!newProfile) {
        console.error('❌ Profile creation returned no data');
        return res.status(500).json({ error: 'Profile creation failed - no data returned' });
      }

      console.log('✅ Profile created successfully:', newProfile);
      return res.json({ profile: newProfile, success: true, created: true });
    }

    console.log('✅ Profile exists, updating:', existingProfile);

    // Clean updates - remove any non-existent fields
    const { age, birth_date, dob, sex, ...updatesCleaned } = updates;
    if (age !== undefined || birth_date !== undefined || dob !== undefined || sex !== undefined) {
      console.log('⚠️ Removed non-existent fields from updates:', { age, birth_date, dob, sex });
    }

    console.log('💾 Cleaned update data:', updatesCleaned);

    // Update profile
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updatesCleaned)
      .eq('user_id', userId)
      .select('user_id, full_name, email, gender, date_of_birth, phone, created_at')
      .maybeSingle();

    if (error) {
      console.error('❌ Error updating profile:', error);
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      console.error('❌ Profile update returned no data');
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log('✅ Profile updated successfully:', {
      userId: data.user_id,
      full_name: data.full_name,
      email: data.email,
    });

    res.json({ profile: data, success: true });
  } catch (error: any) {
    console.error('❌ Update profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

