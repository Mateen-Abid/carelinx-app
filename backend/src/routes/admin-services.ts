import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/admin-services/specialties
 * Get all specialties
 */
router.get('/specialties', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('super_admin_specialties')
      .select('*')
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
 * POST /api/admin-services/specialties
 * Create or reactivate a specialty
 */
router.post('/specialties', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;

    // Check if specialty exists
    const { data: existing } = await supabaseAdmin
      .from('super_admin_specialties')
      .select('id, name, is_active')
      .ilike('name', name.trim())
      .maybeSingle();

    if (existing) {
      if (existing.is_active) {
        return res.status(400).json({ error: 'Specialty already exists' });
      }

      // Reactivate inactive specialty
      const { data, error } = await supabaseAdmin
        .from('super_admin_specialties')
        .update({
          is_active: true,
          description: description?.trim() || null,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return res.json({ specialty: data, reactivated: true });
    }

    // Create new specialty
    const { data, error } = await supabaseAdmin
      .from('super_admin_specialties')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ specialty: data });
  } catch (error: any) {
    console.error('Create specialty error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/admin-services/specialties/:id
 * Update a specialty
 */
router.patch('/specialties/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const { data, error } = await supabaseAdmin
      .from('super_admin_specialties')
      .update({
        name: name.trim(),
        description: description || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ specialty: data });
  } catch (error: any) {
    console.error('Update specialty error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin-services/specialties/:id
 * Delete a specialty and all its services (soft delete)
 * User is already authenticated via middleware, so we can do direct updates
 */
router.delete('/specialties/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // First, soft delete all services under this specialty
    const { data: servicesData, error: servicesError } = await supabaseAdmin
      .from('super_admin_services')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('specialty_id', id)
      .eq('is_active', true)
      .select('id');

    if (servicesError) throw servicesError;

    const deletedServicesCount = servicesData?.length || 0;

    // Then, soft delete the specialty itself
    const { data: specialtyData, error: specialtyError } = await supabaseAdmin
      .from('super_admin_specialties')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (specialtyError) throw specialtyError;

    if (!specialtyData) {
      return res.status(404).json({ error: 'Specialty not found' });
    }

    res.json({ 
      success: true, 
      deleted_services_count: deletedServicesCount,
      specialty: specialtyData
    });
  } catch (error: any) {
    console.error('Delete specialty error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/admin-services/services
 * Get all services with specialty names
 */
router.get('/services', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('super_admin_services')
      .select(`
        *,
        specialty:super_admin_specialties(name)
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({ services: data });
  } catch (error: any) {
    console.error('Get services error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin-services/services
 * Create a service
 */
router.post('/services', authenticate, async (req: AuthRequest, res) => {
  try {
    const { specialty_id, name, description } = req.body;

    const trimmedName = name.trim();
    console.log('📝 Creating service:', trimmedName, 'for specialty:', specialty_id);
    
    // First check for exact match (case-sensitive) - this is what the unique constraint uses
    // IMPORTANT: Don't filter by is_active - we need to check ALL services (active and inactive)
    const { data: exactMatch, error: exactCheckError } = await supabaseAdmin
      .from('super_admin_services')
      .select('id, name, is_active')
      .eq('specialty_id', specialty_id)
      .eq('name', trimmedName)
      .maybeSingle();

    if (exactCheckError && exactCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking exact match:', exactCheckError);
      throw exactCheckError;
    }

    // If exact match found, use it
    const existing = exactMatch;

    if (existing) {
      console.log('🔍 Found existing service:', existing.name, 'Active:', existing.is_active, 'ID:', existing.id);
      
      // Check if exact name matches (case-sensitive) - if not, it's a different service
      const exactNameMatch = existing.name === trimmedName;
      console.log('🔍 Exact name match:', exactNameMatch, 'Existing:', existing.name, 'New:', trimmedName);
      
      if (existing.is_active && exactNameMatch) {
        console.log('⚠️ Service already exists and is active - cannot create duplicate');
        console.log('🔍 Service details:', JSON.stringify(existing, null, 2));
        // Double-check the database state - maybe it was just updated
        const { data: doubleCheck, error: doubleCheckError } = await supabaseAdmin
          .from('super_admin_services')
          .select('id, name, is_active')
          .eq('id', existing.id)
          .maybeSingle();
        
        if (!doubleCheckError && doubleCheck && !doubleCheck.is_active) {
          console.log('🔄 Service is actually inactive, reactivating...');
          // Service is actually inactive, reactivate it
          const { data: updatedData, error: updateError } = await supabaseAdmin
            .from('super_admin_services')
            .update({
              is_active: true,
              description: description?.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (!updateError && updatedData) {
            console.log('✅ Service reactivated after double-check');
            return res.json({ service: updatedData, reactivated: true });
          }
        }
        
        return res.status(400).json({ 
          error: `Service "${trimmedName}" already exists for this specialty` 
        });
      }

      // If inactive and exact name match, reactivate it
      if (!existing.is_active && exactNameMatch) {
        console.log('♻️ Reactivating inactive service:', existing.id);
        const { data: updatedData, error: updateError } = await supabaseAdmin
          .from('super_admin_services')
          .update({
            is_active: true,
            description: description?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single(); // Use .single() here since we know the ID exists

        if (updateError) {
          console.error('❌ Error reactivating service:', updateError);
          throw updateError;
        }

        if (updatedData) {
          console.log('✅ Service reactivated successfully:', updatedData.name);
          return res.json({ service: updatedData, reactivated: true });
        }
        
        console.log('⚠️ Reactivation returned no data - this should not happen');
        // If update didn't return data, something is wrong - but fall through to create new
      } else if (!exactNameMatch) {
        console.log('ℹ️ Name doesn\'t match exactly (case difference), will try to create new');
      } else {
        console.log('⚠️ Service exists but logic didn\'t match - is_active:', existing.is_active, 'exactMatch:', exactNameMatch);
      }
      // If name doesn't match exactly (different case), we'll create a new service
      // The unique constraint will catch it if it's a true duplicate
    } else {
      console.log('✅ No existing service found, creating new');
    }

    // Create new service
    console.log('➕ Creating new service:', trimmedName);
    const { data, error } = await supabaseAdmin
      .from('super_admin_services')
      .insert({
        specialty_id,
        name: trimmedName,
        description: description?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating service:', error);
      // Handle unique constraint violation with better error message
      if (error.code === '23505' && error.message.includes('unique_service_per_specialty')) {
        console.log('⚠️ Unique constraint violation - service exists (possibly inactive)');
        // Try to find and reactivate the inactive service
        const { data: inactiveService, error: findError } = await supabaseAdmin
          .from('super_admin_services')
          .select('id, name, is_active')
          .eq('specialty_id', specialty_id)
          .eq('name', trimmedName)
          .eq('is_active', false)
          .maybeSingle();

        if (!findError && inactiveService) {
          console.log('♻️ Found inactive service, reactivating:', inactiveService.id);
          const { data: reactivated, error: reactivateError } = await supabaseAdmin
            .from('super_admin_services')
            .update({
              is_active: true,
              description: description?.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', inactiveService.id)
            .select()
            .single();

          if (!reactivateError && reactivated) {
            console.log('✅ Service reactivated after constraint error');
            return res.json({ service: reactivated, reactivated: true });
          }
        }

        return res.status(400).json({ 
          error: `Service "${trimmedName}" already exists for this specialty` 
        });
      }
      throw error;
    }

    console.log('✅ Service created successfully:', data.name);
    res.json({ service: data });
  } catch (error: any) {
    console.error('Create service error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/admin-services/services/:id
 * Update a service
 */
router.patch('/services/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { specialty_id, name, description } = req.body;

    const { data, error } = await supabaseAdmin
      .from('super_admin_services')
      .update({
        specialty_id,
        name: name.trim(),
        description: description || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ service: data });
  } catch (error: any) {
    console.error('Update service error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin-services/services/:id
 * Delete a service (soft delete - sets is_active to false)
 * User is already authenticated via middleware, so we can do direct update
 */
router.delete('/services/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Delete service request:', id, 'User:', req.user?.email);

    // First check if service exists (regardless of active status)
    const { data: existingService, error: checkError } = await supabaseAdmin
      .from('super_admin_services')
      .select('id, name, is_active')
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking service existence:', checkError);
      throw checkError;
    }

    if (!existingService) {
      console.log('⚠️ Service not found:', id);
      return res.status(404).json({ error: 'Service not found' });
    }

    console.log('✅ Service found:', existingService.name, 'Active:', existingService.is_active);

    // If already inactive, return success (idempotent operation)
    if (!existingService.is_active) {
      console.log('ℹ️ Service already deleted, returning success');
      return res.json({ success: true, message: 'Service already deleted', service: existingService });
    }

    // Soft delete the service (set is_active to false)
    const { data, error } = await supabaseAdmin
      .from('super_admin_services')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows

    if (error) {
      console.error('❌ Error updating service:', error);
      throw error;
    }

    if (!data) {
      console.log('⚠️ Update returned no data for service:', id);
      return res.status(404).json({ error: 'Service not found or could not be updated' });
    }

    console.log('✅ Service deleted successfully:', data.name);
    res.json({ success: true, service: data });
  } catch (error: any) {
    console.error('❌ Delete service error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/admin-services/requests/services
 * Get pending service requests
 */
router.get('/requests/services', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .select(`
        *,
        clinics:clinic_id (name),
        specialties:specialty_id (name)
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) throw error;

    res.json({ requests: data });
  } catch (error: any) {
    console.error('Get service requests error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin-services/requests/services/:id/approve
 * Approve a service request
 */
router.post('/requests/services/:id/approve', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get the request details
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('service_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Add service to super_admin_services
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('super_admin_services')
      .insert({
        specialty_id: request.specialty_id,
        name: request.service_name,
        description: request.description,
        is_active: true,
        created_by: userId,
      })
      .select()
      .single();

    if (serviceError) throw serviceError;

    // Update request status
    const { error: updateError } = await supabaseAdmin
      .from('service_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ service, request: { ...request, status: 'approved' } });
  } catch (error: any) {
    console.error('Approve service request error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin-services/requests/services/:id/reject
 * Reject a service request
 */
router.post('/requests/services/:id/reject', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const userId = req.user.id;

    const { error } = await supabaseAdmin
      .from('service_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        rejection_reason: rejectionReason,
      })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Reject service request error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/admin-services/requests/specialties
 * Get pending specialty requests
 */
router.get('/requests/specialties', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('specialty_requests')
      .select(`
        *,
        clinics:clinic_id(name)
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) throw error;

    res.json({ requests: data });
  } catch (error: any) {
    console.error('Get specialty requests error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin-services/requests/specialties/:id/approve
 * Approve a specialty request
 */
router.post('/requests/specialties/:id/approve', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get the request details
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('specialty_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Add specialty to super_admin_specialties
    const { data: specialty, error: specialtyError } = await supabaseAdmin
      .from('super_admin_specialties')
      .insert({
        name: request.specialty_name,
        description: request.description,
        is_active: true,
        created_by: userId,
      })
      .select()
      .single();

    if (specialtyError) throw specialtyError;

    // Update request status
    const { error: updateError } = await supabaseAdmin
      .from('specialty_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ specialty, request: { ...request, status: 'approved' } });
  } catch (error: any) {
    console.error('Approve specialty request error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin-services/requests/specialties/:id/reject
 * Reject a specialty request
 */
router.post('/requests/specialties/:id/reject', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const userId = req.user.id;

    const { error } = await supabaseAdmin
      .from('specialty_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        rejection_reason: rejectionReason,
      })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Reject specialty request error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

