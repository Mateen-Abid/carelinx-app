import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UserRole = 'patient' | 'clinic_admin' | 'super_admin' | 'doctor';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  isSuperAdmin: boolean;
  isClinicAdmin: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (fullName: string) => Promise<{ error: any }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  deleteAccount: () => Promise<{ error: any }>;
  resendConfirmation: (email: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // No auto-assignment needed - roles are assigned via Edge Function when team members are added

  // Fetch user role from user_roles table (new system) or profiles.role (legacy)
  // Fully dynamic - no hardcoded emails
  const fetchUserRole = async (userId: string, email?: string): Promise<UserRole> => {
    try {
      // Early return if userId is invalid
      if (!userId) {
        console.log('⚠️ Invalid user ID, returning patient role');
        return 'patient';
      }
      
      // First check user_roles table (new roles system)
      console.log('🔍 Fetching role for user_id:', userId, 'email:', email);
      
      // Try with .single() first
      let { data: userRoleData, error: userRoleError } = await supabase
        .from('user_roles')
        .select('role_type, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      // If .single() fails (maybe multiple rows or no rows), try .maybeSingle()
      if (userRoleError && (userRoleError.code === 'PGRST116' || userRoleError.message?.includes('more than one'))) {
        console.log('⚠️ .single() failed, trying .maybeSingle()...');
        const { data: maybeData, error: maybeError } = await supabase
          .from('user_roles')
          .select('role_type, is_active')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();
        
        userRoleData = maybeData;
        userRoleError = maybeError;
      }
      
      console.log('📋 user_roles query result:', { userRoleData, userRoleError });

      // Handle RLS/auth errors silently (user might not be logged in)
      if (userRoleError && (userRoleError.code === 'PGRST301' || userRoleError.code === '42501' || userRoleError.message?.includes('JWT'))) {
        console.log('ℹ️ Auth/RLS error (user may not be logged in), returning patient role');
        return 'patient';
      }

      if (!userRoleError && userRoleData?.role_type) {
        // Map role_type to UserRole
        let role: UserRole;
        if (userRoleData.role_type === 'super_admin') {
          role = 'super_admin';
        } else if (userRoleData.role_type === 'clinic_admin') {
          role = 'clinic_admin';
        } else if (userRoleData.role_type === 'doctor') {
          role = 'doctor';
        } else if (userRoleData.role_type === 'public_user') {
          role = 'patient'; // Map public_user to patient for backward compatibility
        } else {
          role = 'patient'; // Default fallback
        }
        
        console.log('✅ Role fetched from user_roles table:', role, 'for user:', email);
        setUserRole(role);
        localStorage.setItem('userRole', role);
        return role;
      }
      
      // Log the error for debugging (but skip RLS/auth errors)
      if (userRoleError && userRoleError.code !== 'PGRST301' && userRoleError.code !== '42501' && !userRoleError.message?.includes('JWT')) {
        console.error('❌ Error fetching from user_roles:', userRoleError);
        console.error('❌ Error code:', userRoleError.code);
        console.error('❌ Error message:', userRoleError.message);
      }

      // FALLBACK: Check profiles.role (legacy system)
      // IMPORTANT: This is critical for existing users who have roles in profiles.role
      console.log('⚠️ No role in user_roles, checking profiles.role (legacy)...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (!profileError && profileData?.role) {
        // Map profiles.role to UserRole type
        let role: UserRole;
        if (profileData.role === 'super_admin') {
          role = 'super_admin';
        } else if (profileData.role === 'clinic_admin') {
          role = 'clinic_admin';
        } else if (profileData.role === 'patient') {
          role = 'patient';
        } else {
          role = 'patient'; // Default fallback
        }
        
        console.log('✅ Role fetched from profiles.role (legacy):', role, 'for user:', email);
        setUserRole(role);
        localStorage.setItem('userRole', role);
        
        // IMPORTANT: Also migrate this role to user_roles table for future
        // This ensures the role is in both places
        try {
          await supabase
            .from('user_roles')
            .upsert({
              user_id: userId,
              role_type: role === 'super_admin' ? 'super_admin' : 
                        role === 'clinic_admin' ? 'clinic_admin' : 'public_user',
              is_active: true,
            }, {
              onConflict: 'user_id'
            });
          console.log('✅ Role migrated to user_roles table');
        } catch (migrateError) {
          console.log('⚠️ Could not migrate role to user_roles (this is okay):', migrateError);
        }
        
        return role;
      }

      // If no role found anywhere, check if we have a cached role first
      const cachedRole = localStorage.getItem('userRole') as UserRole | null;
      if (cachedRole && (cachedRole === 'super_admin' || cachedRole === 'clinic_admin')) {
        console.log('⚠️ No role in DB, but using cached role:', cachedRole);
        // Don't update state or localStorage, just return cached role
        return cachedRole;
      }
      
      console.log('⚠️ No role found in database for user:', email, '- defaulting to patient');
      const defaultRole = 'patient';
      setUserRole(defaultRole);
      localStorage.setItem('userRole', defaultRole);
      return defaultRole;
    } catch (error: any) {
      console.error('❌ Error fetching user role:', error);
      
      // If error is infinite recursion, check cached role first
      if (error?.code === '42P17' || error?.message?.includes('infinite recursion')) {
        console.log('⚠️ Infinite recursion error detected, checking cached role...');
        const cachedRole = localStorage.getItem('userRole') as UserRole | null;
        if (cachedRole && (cachedRole === 'super_admin' || cachedRole === 'clinic_admin')) {
          console.log('✅ Using cached role due to recursion error:', cachedRole);
          // Don't update state or localStorage, just return cached role
          return cachedRole;
        }
      }
      
      // Only default to patient if we don't have a valid cached role
      const cachedRole = localStorage.getItem('userRole') as UserRole | null;
      if (cachedRole && (cachedRole === 'super_admin' || cachedRole === 'clinic_admin')) {
        console.log('✅ Using cached role after error:', cachedRole);
        return cachedRole;
      }
      
      const defaultRole = 'patient';
      setUserRole(defaultRole);
      localStorage.setItem('userRole', defaultRole);
      return defaultRole;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          console.log('🔄 Auth state changed:', event);
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            const userEmail = session.user.email || '';
            
            // Wait a bit for session to be fully established
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // For SIGNED_IN event, fetch role FIRST and keep loading true until fetched
            if (event === 'SIGNED_IN') {
              console.log('🔄 SIGNED_IN event - fetching role first (keeping loading true)...');
              // Keep loading true until role is fetched - this prevents ProtectedRoute from redirecting
              setLoading(true);
              
              // AUTO-ASSIGN ROLE FROM INVITATION (if email is confirmed)
              // IMPORTANT: Only call for invited users (check for invitation token or pending invitation)
              // Existing admins should NOT be affected by this logic
              if (session.user.email_confirmed_at) {
                // Check if this is an invited user (has invitation token or pending invitation)
                const invitationToken = sessionStorage.getItem('invitation_token') || localStorage.getItem('invitation_token');
                const invitationEmail = localStorage.getItem('invitation_email');
                
                // Only proceed if user has invitation token OR email matches invitation
                const isInvitedUser = invitationToken || 
                  (invitationEmail && invitationEmail.toLowerCase() === userEmail.toLowerCase());
                
                if (isInvitedUser) {
                  console.log('✅ Email is confirmed and user has invitation, checking for pending invitations...');
                  try {
                    // Add timeout to prevent hanging
                    const timeoutPromise = new Promise((_, reject) => 
                      setTimeout(() => reject(new Error('Function call timeout')), 5000)
                    );
                    
                    // Try super admin/clinic admin invitation first
                    const functionPromise = supabase
                      .rpc('auto_assign_role_from_invitation', {
                        p_user_id: session.user.id,
                        p_user_email: userEmail
                      });
                    
                    const { data: autoAssignResult, error: autoAssignError } = await Promise.race([
                      functionPromise,
                      timeoutPromise
                    ]) as any;
                    
                    if (!autoAssignError && autoAssignResult) {
                      console.log('📋 Auto-assign result:', autoAssignResult);
                      if (autoAssignResult.role_assigned) {
                        console.log(`✅ Role ${autoAssignResult.role_type} automatically assigned from invitation`);
                        // Wait a bit for database to sync
                        await new Promise(resolve => setTimeout(resolve, 300));
                      } else {
                        console.log('ℹ️ No role assigned (invitation may not be pending)');
                      }
                    } else if (autoAssignError) {
                      // Don't log as error if function doesn't exist yet (migration not run)
                      if (autoAssignError.code !== '42883' && autoAssignError.message?.includes('function') === false) {
                        console.error('❌ Error in auto-assign function:', autoAssignError);
                      } else {
                        console.log('ℹ️ Auto-assign function not available yet (migration may not be run)');
                      }
                    }

                    // Also check for clinic admin invitation (doctor role)
                    try {
                      const doctorFunctionPromise = supabase
                        .rpc('auto_assign_doctor_role_from_invitation', {
                          p_user_id: session.user.id,
                          p_user_email: userEmail
                        });
                      
                      const { data: doctorAssignResult, error: doctorAssignError } = await Promise.race([
                        doctorFunctionPromise,
                        timeoutPromise
                      ]) as any;
                      
                      if (!doctorAssignError && doctorAssignResult) {
                        console.log('📋 Doctor auto-assign result:', doctorAssignResult);
                        if (doctorAssignResult.role_assigned) {
                          console.log('✅ Doctor role automatically assigned from clinic invitation');
                          // Wait a bit for database to sync
                          await new Promise(resolve => setTimeout(resolve, 300));
                        }
                      } else if (doctorAssignError) {
                        // Don't log as error if function doesn't exist yet
                        if (doctorAssignError.code !== '42883' && doctorAssignError.message?.includes('function') === false) {
                          console.error('❌ Error in doctor auto-assign function:', doctorAssignError);
                        } else {
                          console.log('ℹ️ Doctor auto-assign function not available yet (migration may not be run)');
                        }
                      }
                    } catch (doctorAssignErr: any) {
                      if (doctorAssignErr?.message === 'Function call timeout') {
                        console.warn('⚠️ Doctor auto-assign function call timed out, continuing...');
                      } else {
                        console.log('ℹ️ Doctor auto-assign function call failed (this is okay if migration not run):', doctorAssignErr);
                      }
                    }
                  } catch (autoAssignErr: any) {
                    // Handle timeout or other errors
                    if (autoAssignErr?.message === 'Function call timeout') {
                      console.warn('⚠️ Auto-assign function call timed out, continuing with role fetch...');
                    } else {
                      console.log('ℹ️ Auto-assign function call failed (this is okay if migration not run):', autoAssignErr);
                    }
                  }
                } else {
                  // Not an invited user - skip auto-assign (existing admins won't be affected)
                  console.log('ℹ️ Not an invited user, skipping auto-assign');
                }
              }
              
              // Fetch role AFTER auto-assign (so we get the updated role)
              // IMPORTANT: Always fetch role, even if auto-assign failed or timed out
              console.log('🔄 Fetching user role...');
              fetchUserRole(session.user.id, userEmail)
                .then((dbRole) => {
                  console.log('✅ Role fetched on SIGNED_IN:', dbRole);
                  // Role is already set in fetchUserRole, now set loading to false
                  setLoading(false);
                })
                .catch((err) => {
                  console.error('❌ Error fetching role on SIGNED_IN:', err);
                  // On error, check if we have a cached role
                  const cachedRole = localStorage.getItem('userRole') as UserRole | null;
                  if (cachedRole && (cachedRole === 'super_admin' || cachedRole === 'clinic_admin' || cachedRole === 'doctor')) {
                    console.log('✅ Using cached role after SIGNED_IN error:', cachedRole);
                    setUserRole(cachedRole);
                    setLoading(false);
                  } else {
                    setLoading(false);
                  }
                });
            } else if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
              // For INITIAL_SESSION and TOKEN_REFRESHED, use cached role immediately
              // Don't fetch from DB to avoid unnecessary reloads on page focus
              const storedRole = localStorage.getItem('userRole') as UserRole | null;
              
              if (storedRole && (storedRole === 'super_admin' || storedRole === 'clinic_admin' || storedRole === 'doctor')) {
                // Use cached role immediately - no DB fetch
                setUserRole(storedRole);
                setLoading(false);
                console.log('✅ Using cached role from localStorage (no DB fetch):', storedRole);
              } else if (storedRole) {
                // Patient role - also use cached
                setUserRole(storedRole);
                setLoading(false);
              } else {
                // No cached role - fetch from DB (only if needed)
                setLoading(false);
                // Fetch in background without blocking
                if (session.user && session.user.id) {
                  fetchUserRole(session.user.id, userEmail)
                    .then((dbRole) => {
                      console.log('📋 User role from database (background fetch):', dbRole);
                      if (dbRole) {
                        setUserRole(dbRole);
                        localStorage.setItem('userRole', dbRole);
                      }
                    })
                    .catch((err) => {
                      // Silently handle errors
                      if (err?.code !== 'PGRST301' && err?.code !== '42501' && !err?.message?.includes('JWT')) {
                        console.error('❌ Error fetching user role:', err);
                      }
                    });
                }
              }
            } else {
              // For other events, use cached role if available
              const storedRole = localStorage.getItem('userRole') as UserRole | null;
              
              if (storedRole && (storedRole === 'super_admin' || storedRole === 'clinic_admin' || storedRole === 'doctor')) {
                // Only use cached role if it's a valid admin/doctor role
                setUserRole(storedRole);
                setLoading(false);
                console.log('✅ Using cached role from localStorage:', storedRole);
              } else {
                setLoading(false);
              }
            }
          } else {
            setUserRole(null);
            localStorage.removeItem('userRole');
            setLoading(false);
          }
        } catch (error) {
          console.error('❌ Error in auth state change:', error);
          setLoading(false); // Ensure loading is false on error
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const userEmail = session.user.email || '';
          
          // Check localStorage first for quick UI update
          const storedRole = localStorage.getItem('userRole') as UserRole | null;
          if (storedRole) {
            setUserRole(storedRole);
            setLoading(false); // Set loading to false immediately with cached role
          } else {
            // If no stored role, set loading to false anyway to prevent infinite loading
            // The role will be fetched in background
            setLoading(false);
          }
          
          // Only fetch from DB if no cached role exists (to avoid unnecessary reloads)
          // If cached role exists, skip DB fetch to prevent page reload on focus
          if (!storedRole && session.user && session.user.id) {
            // Only fetch if no cached role - this prevents reload on page focus
            fetchUserRole(session.user.id, userEmail)
              .then((dbRole) => {
                console.log('📋 User role from database (initial load):', dbRole, 'for:', userEmail);
                // Only update if we got a valid role (not patient from error)
                if (dbRole && dbRole !== 'patient') {
                  setUserRole(dbRole);
                  localStorage.setItem('userRole', dbRole);
                }
              })
              .catch((err) => {
                // Silently handle errors - don't log if it's just RLS or auth errors
                if (err?.code !== 'PGRST301' && err?.code !== '42501' && !err?.message?.includes('JWT')) {
                  console.error('❌ Error fetching user role:', err);
                }
              });
          }
        } else {
          setUserRole(null);
          localStorage.removeItem('userRole');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in getSession:', error);
        setLoading(false); // Ensure loading is false on error
      }
    }).catch((error) => {
      console.error('Error getting session:', error);
      setLoading(false); // Ensure loading is false on error
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      });
      
      console.log('SignUp response:', { data, error }); // Debug logging
      
      if (error) {
        console.log('SignUp error:', error.message); // Debug logging
        
        // Check for specific error types
        if (error.message.includes('already registered') || 
            error.message.includes('already been registered') ||
            error.message.includes('User already registered') ||
            error.message.includes('already exists') ||
            error.message.includes('duplicate') ||
            error.message.includes('already in use')) {
          return { 
            error: { 
              message: 'An account with this email already exists. Please try signing in instead.',
              type: 'duplicate_email'
            } 
          };
        }
        
        toast.error(error.message);
        return { error };
      }
      
      // Check if user was actually created (Supabase returns success but no user for existing emails)
      if (!data.user) {
        console.log('No user created - likely duplicate email'); // Debug logging
        return { 
          error: { 
            message: 'An account with this email already exists. Please try signing in instead.',
            type: 'duplicate_email'
          } 
        };
      }
      
      // Additional check: if user exists but email is not confirmed, it might be a duplicate
      if (data.user && !data.user.email_confirmed_at) {
        console.log('User created but email not confirmed - checking if this is a duplicate'); // Debug logging
        
        // Try to sign in to see if the account actually exists
        try {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (!signInError) {
            // If sign in works, the account already exists
            console.log('Account already exists - sign in successful'); // Debug logging
            return { 
              error: { 
                message: 'An account with this email already exists. Please try signing in instead.',
                type: 'duplicate_email'
              } 
            };
          }
        } catch (signInTestError) {
          // If sign in fails, it's a new account
          console.log('Sign in test failed - this is a new account'); // Debug logging
        }
      }
      
      // Check for invitation token (check both sessionStorage and localStorage)
      let invitationToken = sessionStorage.getItem('invitation_token') || localStorage.getItem('invitation_token');
      if (invitationToken && data.user) {
        console.log('🔗 Invitation token found during signUp:', invitationToken);
        try {
          // Verify invitation exists and is valid
          const { data: invitationData, error: inviteError } = await supabase
            .from('super_admin_invitations')
            .select('*')
            .eq('invitation_token', invitationToken)
            .eq('email', email.toLowerCase())
            .eq('status', 'pending')
            .single();

          if (!inviteError && invitationData) {
            // Check if invitation is expired
            if (new Date(invitationData.expires_at) >= new Date()) {
              // Get role_type from invitation (can be super_admin or clinic_admin)
              const roleType = invitationData.role_type || 'super_admin';
              
              // Validate role_type
              if (!['super_admin', 'clinic_admin'].includes(roleType)) {
                console.error('❌ Invalid role_type in invitation:', roleType);
                toast.error('Invalid invitation. Please contact support.');
                sessionStorage.removeItem('invitation_token');
                return { error: new Error('Invalid invitation role type') };
              }

              // Assign role based on invitation
              // IMPORTANT: Wait a bit for session to be fully established
              console.log('🔄 Attempting to assign role:', roleType, 'to user:', data.user.id);
              console.log('🔄 Invitation data:', invitationData);
              
              // IMPORTANT: If email confirmation is required, session won't be available immediately
              // In that case, we'll assign the role during signIn instead
              // Wait a bit and check for session
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Verify we have a valid session
              const { data: { session: currentSession } } = await supabase.auth.getSession();
              if (!currentSession) {
                console.log('⚠️ No session found during signup (email confirmation required)');
                console.log('ℹ️ Role will be assigned after email confirmation and login');
                // Don't return error - just preserve the invitation token for later
                // The role will be assigned during signIn
                toast.success('Account created! Please check your email to confirm your account. After confirmation, sign in to complete setup.');
                return { error: null };
              }
              
              console.log('✅ Session verified:', currentSession.user.id);
              
              // Try insert first, if it fails due to conflict, try update
              let roleData, roleError;
              
              // First try insert
              const { data: insertData, error: insertError } = await supabase
                .from('user_roles')
                .insert({
                  user_id: data.user.id,
                  role_type: roleType,
                  is_active: true,
                })
                .select()
                .single();

              if (insertError) {
                console.log('⚠️ Insert failed:', insertError);
                console.log('⚠️ Error code:', insertError.code);
                console.log('⚠️ Error message:', insertError.message);
                
                // Check if it's a duplicate key error (role already exists)
                if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('already exists')) {
                  console.log('ℹ️ Role already exists, trying upsert...');
                  // If role already exists, try upsert
                  const { data: upsertData, error: upsertError } = await supabase
                    .from('user_roles')
                    .upsert({
                      user_id: data.user.id,
                      role_type: roleType,
                      is_active: true,
                    }, {
                      onConflict: 'user_id'
                    })
                    .select();

                  roleData = upsertData;
                  roleError = upsertError;
                } else {
                  // For other errors (like RLS policy), still try upsert as fallback
                  console.log('⚠️ Trying upsert as fallback...');
                  const { data: upsertData, error: upsertError } = await supabase
                    .from('user_roles')
                    .upsert({
                      user_id: data.user.id,
                      role_type: roleType,
                      is_active: true,
                    }, {
                      onConflict: 'user_id'
                    })
                    .select();

                  roleData = upsertData;
                  roleError = upsertError;
                }
              } else {
                roleData = insertData;
                roleError = insertError;
              }

              console.log('📋 Role assignment result:', { roleData, roleError });

              if (!roleError && roleData) {
                console.log(`✅ Role ${roleType} assigned successfully to user:`, data.user.id);
                
                // Update invitation status
                const { error: updateInviteError } = await supabase
                  .from('super_admin_invitations')
                  .update({
                    status: 'accepted',
                    accepted_at: new Date().toISOString(),
                    accepted_by: data.user.id,
                  })
                  .eq('id', invitationData.id);

                if (updateInviteError) {
                  console.error('⚠️ Error updating invitation status:', updateInviteError);
                }

                // Clear invitation token from sessionStorage
                sessionStorage.removeItem('invitation_token');
                
                // IMPORTANT: Refresh userRole after assigning role
                console.log('🔄 Refreshing userRole after invitation role assignment...');
                // Wait a bit for database to sync
                await new Promise(resolve => setTimeout(resolve, 500));
                const assignedRole = await fetchUserRole(data.user.id, email);
                
                const roleDisplayName = roleType === 'super_admin' ? 'Super Admin' : 'Clinic Admin';
                console.log(`✅ ${roleDisplayName} role assigned via invitation`);
                console.log(`✅ UserRole refreshed:`, assignedRole);
                toast.success(`Account created! ${roleDisplayName} access granted.`);
              } else {
                console.error(`❌ Error assigning ${roleType} role:`, roleError);
                console.error(`❌ Error details:`, JSON.stringify(roleError, null, 2));
                
                // Check if it's an RLS policy error
                if (roleError?.code === '42501' || roleError?.message?.includes('permission denied') || roleError?.message?.includes('policy')) {
                  toast.error(`Permission denied. Please check RLS policies. Error: ${roleError.message}`);
                } else {
                  toast.error(`Failed to assign ${roleType} role. Error: ${roleError?.message || 'Unknown error'}`);
                }
              }
            } else {
              console.log('⚠️ Invitation expired');
              toast.error('This invitation has expired. Please request a new one.');
              sessionStorage.removeItem('invitation_token');
            }
          } else {
            console.log('⚠️ Invalid invitation token');
            toast.error('Invalid invitation. Please contact support.');
            sessionStorage.removeItem('invitation_token');
          }
        } catch (inviteErr: any) {
          console.error('❌ Error processing invitation:', inviteErr);
          toast.error('Error processing invitation. Please contact support.');
          sessionStorage.removeItem('invitation_token');
        }
      }

      // After signup, if user is created, fetch their role
      if (data.user) {
        // Wait a bit for role assignment to complete (if invitation was processed)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch user role to ensure it's up to date
        const updatedRole = await fetchUserRole(data.user.id, email);
        console.log('🔄 UserRole after signup:', updatedRole);
      }
      
      toast.success('Account created successfully! Please check your email to confirm your account.');
      return { error: null };
    } catch (error: any) {
      console.log('SignUp catch error:', error); // Debug logging
      toast.error(error.message);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Clear old cached role before login
      localStorage.removeItem('userRole');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      if (data.user) {
        toast.success('Welcome back!');
        
        const userEmail = data.user.email || '';
        console.log('🔐 User logged in:', userEmail);
        console.log('🔄 Clearing old role cache and fetching fresh role...');
        
        // IMPORTANT: Wait a bit for session to be fully established
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // AUTO-ASSIGN ROLE FROM INVITATION (if email is confirmed)
        // IMPORTANT: Only call for invited users (check for invitation token or pending invitation)
        // Existing admins should NOT be affected by this logic
        if (data.user.email_confirmed_at) {
          // Check if this is an invited user (has invitation token or pending invitation)
          const invitationToken = sessionStorage.getItem('invitation_token') || localStorage.getItem('invitation_token');
          const invitationEmail = localStorage.getItem('invitation_email');
          
          // Only proceed if user has invitation token OR email matches invitation
          const isInvitedUser = invitationToken || 
            (invitationEmail && invitationEmail.toLowerCase() === email.toLowerCase());
          
          if (isInvitedUser) {
            console.log('✅ Email is confirmed and user has invitation, checking for pending invitations...');
            try {
              // Add timeout to prevent hanging
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Function call timeout')), 5000)
              );
              
              const functionPromise = supabase
                .rpc('auto_assign_role_from_invitation', {
                  p_user_id: data.user.id,
                  p_user_email: userEmail
                });
              
              const { data: autoAssignResult, error: autoAssignError } = await Promise.race([
                functionPromise,
                timeoutPromise
              ]) as any;
              
              if (!autoAssignError && autoAssignResult) {
                console.log('📋 Auto-assign result:', autoAssignResult);
                if (autoAssignResult.role_assigned) {
                  console.log(`✅ Role ${autoAssignResult.role_type} automatically assigned from invitation`);
                  toast.success(`${autoAssignResult.role_type === 'super_admin' ? 'Super Admin' : 'Clinic Admin'} access granted!`);
                  // Wait a bit for database to sync
                  await new Promise(resolve => setTimeout(resolve, 300));
                } else {
                  console.log('ℹ️ No role assigned (invitation may not be pending)');
                }
              } else if (autoAssignError) {
                // Don't log as error if function doesn't exist yet (migration not run)
                if (autoAssignError.code !== '42883' && autoAssignError.message?.includes('function') === false) {
                  console.error('❌ Error in auto-assign function:', autoAssignError);
                } else {
                  console.log('ℹ️ Auto-assign function not available yet (migration may not be run)');
                }
              }

              // Also check for clinic admin invitation (doctor role)
              try {
                const doctorFunctionPromise = supabase
                  .rpc('auto_assign_doctor_role_from_invitation', {
                    p_user_id: data.user.id,
                    p_user_email: userEmail
                  });
                
                const { data: doctorAssignResult, error: doctorAssignError } = await Promise.race([
                  doctorFunctionPromise,
                  timeoutPromise
                ]) as any;
                
                if (!doctorAssignError && doctorAssignResult) {
                  console.log('📋 Doctor auto-assign result:', doctorAssignResult);
                  if (doctorAssignResult.role_assigned) {
                    console.log('✅ Doctor role automatically assigned from clinic invitation');
                    toast.success('Doctor access granted!');
                    // Wait a bit for database to sync
                    await new Promise(resolve => setTimeout(resolve, 300));
                  }
                } else if (doctorAssignError) {
                  // Don't log as error if function doesn't exist yet
                  if (doctorAssignError.code !== '42883' && doctorAssignError.message?.includes('function') === false) {
                    console.error('❌ Error in doctor auto-assign function:', doctorAssignError);
                  } else {
                    console.log('ℹ️ Doctor auto-assign function not available yet (migration may not be run)');
                  }
                }
              } catch (doctorAssignErr: any) {
                if (doctorAssignErr?.message === 'Function call timeout') {
                  console.warn('⚠️ Doctor auto-assign function call timed out, continuing...');
                } else {
                  console.log('ℹ️ Doctor auto-assign function call failed (this is okay if migration not run):', doctorAssignErr);
                }
              }
            } catch (autoAssignErr: any) {
              // Handle timeout or other errors
              if (autoAssignErr?.message === 'Function call timeout') {
                console.warn('⚠️ Auto-assign function call timed out, continuing with role fetch...');
              } else {
                console.log('ℹ️ Auto-assign function call failed (this is okay if migration not run):', autoAssignErr);
              }
            }
          } else {
            // Not an invited user - skip auto-assign (existing admins won't be affected)
            console.log('ℹ️ Not an invited user, skipping auto-assign');
          }
        }
        
        // Declare role variable early so it can be updated by invitation flow
        let role: UserRole = 'patient';
        
        // Check for invitation token (check both sessionStorage and localStorage)
        // Also check if email matches invitation email
        let invitationToken = sessionStorage.getItem('invitation_token') || localStorage.getItem('invitation_token');
        const invitationEmail = localStorage.getItem('invitation_email');
        
        // If we have invitation token, use it
        // If no token but email matches invitation email, try to find invitation by email
        if (!invitationToken && invitationEmail && invitationEmail.toLowerCase() === email.toLowerCase()) {
          console.log('🔍 No invitation token found, but email matches invitation email. Searching for invitation...');
          // Try to find invitation by email
          const { data: emailInvitations } = await supabase
            .from('super_admin_invitations')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (emailInvitations && emailInvitations.length > 0) {
            invitationToken = emailInvitations[0].invitation_token;
            console.log('✅ Found invitation by email, using token:', invitationToken);
            // Save token for future use
            sessionStorage.setItem('invitation_token', invitationToken);
            localStorage.setItem('invitation_token', invitationToken);
          }
        }
        
        if (invitationToken) {
          console.log('🔗 Invitation token found, checking and assigning role...');
          console.log('🔗 Token:', invitationToken);
          console.log('🔗 Email:', email.toLowerCase());
          
          try {
            // Verify invitation exists and is valid
            // Try exact match first
            let { data: invitationData, error: inviteError } = await supabase
              .from('super_admin_invitations')
              .select('*')
              .eq('invitation_token', invitationToken)
              .eq('email', email.toLowerCase())
              .eq('status', 'pending')
              .maybeSingle();

            // If not found, try case-insensitive email match
            if (inviteError || !invitationData) {
              console.log('⚠️ Exact match failed, trying case-insensitive email match...');
              const { data: allInvitations } = await supabase
                .from('super_admin_invitations')
                .select('*')
                .eq('invitation_token', invitationToken)
                .eq('status', 'pending');
              
              if (allInvitations && allInvitations.length > 0) {
                // Find matching email (case-insensitive)
                invitationData = allInvitations.find(inv => 
                  inv.email?.toLowerCase() === email.toLowerCase()
                );
                if (invitationData) {
                  inviteError = null;
                  console.log('✅ Found invitation with case-insensitive email match');
                }
              }
            }

            if (!inviteError && invitationData) {
              console.log('✅ Invitation found:', invitationData);
              // Check if invitation is expired
              if (new Date(invitationData.expires_at) >= new Date()) {
                const roleType = invitationData.role_type || 'super_admin';
                
                // Validate role_type
                if (['super_admin', 'clinic_admin'].includes(roleType)) {
                  console.log('🔄 Assigning role from invitation during signIn:', roleType);
                  console.log('🔄 User ID:', data.user.id);
                  
                  // Assign role using upsert (will update if exists, insert if not)
                  const { data: roleData, error: roleError } = await supabase
                    .from('user_roles')
                    .upsert({
                      user_id: data.user.id,
                      role_type: roleType,
                      is_active: true,
                    }, {
                      onConflict: 'user_id'
                    })
                    .select();

                  console.log('📋 Role assignment result:', { roleData, roleError });

                  if (!roleError && roleData && roleData.length > 0) {
                    console.log(`✅ Role ${roleType} assigned successfully during signIn`);
                    console.log('📋 Assigned role data:', roleData);
                    
                    // Update invitation status - try by ID first, then by email
                    let updateError = null;
                    let updateSuccess = false;
                    
                    // Try updating by invitation ID first
                    const { error: updateByIdError } = await supabase
                      .from('super_admin_invitations')
                      .update({
                        status: 'accepted',
                        accepted_at: new Date().toISOString(),
                        accepted_by: data.user.id,
                      })
                      .eq('id', invitationData.id)
                      .eq('status', 'pending'); // Only update if still pending

                    if (updateByIdError) {
                      console.warn('⚠️ Failed to update invitation by ID, trying by email...', updateByIdError);
                      console.warn('⚠️ Invitation ID:', invitationData.id);
                      console.warn('⚠️ User email:', data.user.email);
                      
                      // Fallback: Try updating by email
                      const { error: updateByEmailError } = await supabase
                        .from('super_admin_invitations')
                        .update({
                          status: 'accepted',
                          accepted_at: new Date().toISOString(),
                          accepted_by: data.user.id,
                        })
                        .eq('email', data.user.email?.toLowerCase())
                        .eq('status', 'pending'); // Only update if still pending

                      if (updateByEmailError) {
                        updateError = updateByEmailError;
                        console.error('❌ Error updating invitation status by email:', updateByEmailError);
                        console.error('❌ Update error details:', JSON.stringify(updateByEmailError, null, 2));
                        console.error('❌ User ID:', data.user.id);
                        console.error('❌ User email:', data.user.email);
                        // Don't fail the whole flow if status update fails - role is already assigned
                        toast.warning('Role assigned but failed to update invitation status. This is okay.');
                      } else {
                        updateSuccess = true;
                        console.log('✅ Invitation status updated to accepted (by email)');
                        console.log('✅ Updated invitation email:', data.user.email);
                      }
                    } else {
                      updateSuccess = true;
                      console.log('✅ Invitation status updated to accepted (by ID)');
                      console.log('✅ Updated invitation ID:', invitationData.id);
                    }

                    // Clear invitation token from both storages
                    sessionStorage.removeItem('invitation_token');
                    localStorage.removeItem('invitation_token');
                    localStorage.removeItem('invitation_email');
                    
                    const roleDisplayName = roleType === 'super_admin' ? 'Super Admin' : 'Clinic Admin';
                    toast.success(`${roleDisplayName} access granted!`);
                    
                    // IMPORTANT: Force refresh userRole immediately after assignment
                    console.log('🔄 Forcing immediate role refresh after assignment...');
                    // Wait longer for database to sync
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Try fetching role multiple times
                    let freshRole: UserRole = 'patient';
                    for (let i = 0; i < 3; i++) {
                      freshRole = await fetchUserRole(data.user.id, email);
                      console.log(`🔄 Role fetch attempt ${i + 1}:`, freshRole);
                      
                      if (freshRole === roleType || freshRole === 'super_admin' || freshRole === 'clinic_admin') {
                        console.log('✅ Got correct role:', freshRole);
                        break;
                      }
                      
                      // If still patient, check DB directly
                      if (freshRole === 'patient' && i < 2) {
                        console.log('⚠️ Still patient, checking DB directly...');
                        const { data: directCheck } = await supabase
                          .from('user_roles')
                          .select('role_type, is_active')
                          .eq('user_id', data.user.id)
                          .eq('is_active', true)
                          .maybeSingle();
                        
                        if (directCheck?.role_type) {
                          if (directCheck.role_type === 'super_admin') {
                            freshRole = 'super_admin';
                          } else if (directCheck.role_type === 'clinic_admin') {
                            freshRole = 'clinic_admin';
                          }
                          console.log('✅ Got role from direct check:', freshRole);
                          break;
                        }
                      }
                      
                      if (i < 2) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                      }
                    }
                    
                    console.log('✅ Final fresh role after assignment:', freshRole);
                    setUserRole(freshRole);
                    localStorage.setItem('userRole', freshRole);
                    
                    // IMPORTANT: Update the role variable that will be used for redirect
                    role = freshRole;
                  } else {
                    console.error('❌ Error assigning role during signIn:', roleError);
                    console.error('❌ Error details:', JSON.stringify(roleError, null, 2));
                    
                    if (roleError?.code === '42501') {
                      toast.error('Permission denied. Please check RLS policies for user_roles table.');
                    } else {
                      toast.error(`Failed to assign ${roleType} role: ${roleError?.message || 'Unknown error'}`);
                    }
                  }
                } else {
                  console.error('❌ Invalid role_type in invitation:', roleType);
                  toast.error('Invalid invitation role type. Please contact support.');
                  sessionStorage.removeItem('invitation_token');
                }
              } else {
                console.log('⚠️ Invitation expired');
                toast.error('This invitation has expired. Please request a new one.');
                sessionStorage.removeItem('invitation_token');
              }
            } else {
              console.log('⚠️ Invalid invitation token or not found');
              console.log('⚠️ Invite error:', inviteError);
              console.log('⚠️ Invitation data:', invitationData);
              console.log('⚠️ Attempting to find invitation by email as fallback...');
              
              // FALLBACK: Try to find invitation by email if token is missing
              // This handles cases where email confirmation link expires and token is lost
              if (email) {
                try {
                  const { data: emailInvitations, error: emailInviteError } = await supabase
                    .from('super_admin_invitations')
                    .select('*')
                    .eq('email', email.toLowerCase())
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false })
                    .limit(1);
                  
                  if (!emailInviteError && emailInvitations && emailInvitations.length > 0) {
                    const foundInvitation = emailInvitations[0];
                    console.log('✅ Found invitation by email (fallback):', foundInvitation);
                    
                    // Check if invitation is expired
                    if (new Date(foundInvitation.expires_at) >= new Date()) {
                      const roleType = foundInvitation.role_type || 'super_admin';
                      
                      if (['super_admin', 'clinic_admin'].includes(roleType)) {
                        console.log('🔄 Assigning role from email-matched invitation:', roleType);
                        console.log('🔄 User ID:', data.user.id);
                        
                        // Assign role
                        const { data: roleData, error: roleError } = await supabase
                          .from('user_roles')
                          .upsert({
                            user_id: data.user.id,
                            role_type: roleType,
                            is_active: true,
                          }, {
                            onConflict: 'user_id'
                          })
                          .select();
                        
                        console.log('📋 Role assignment result (email fallback):', { roleData, roleError });
                        
                        if (!roleError && roleData && roleData.length > 0) {
                          console.log(`✅ Role ${roleType} assigned successfully from email match`);
                          
                          // Update invitation status
                          const { error: updateError } = await supabase
                            .from('super_admin_invitations')
                            .update({
                              status: 'accepted',
                              accepted_at: new Date().toISOString(),
                              accepted_by: data.user.id,
                            })
                            .eq('id', foundInvitation.id);
                          
                          if (updateError) {
                            console.error('⚠️ Error updating invitation status:', updateError);
                          } else {
                            console.log('✅ Invitation status updated to accepted (email fallback)');
                          }
                          
                          // Clear tokens
                          sessionStorage.removeItem('invitation_token');
                          localStorage.removeItem('invitation_token');
                          localStorage.removeItem('invitation_email');
                          
                          // Refresh role
                          await new Promise(resolve => setTimeout(resolve, 1000));
                          let freshRole: UserRole = 'patient';
                          for (let i = 0; i < 3; i++) {
                            freshRole = await fetchUserRole(data.user.id, email);
                            console.log(`🔄 Role fetch attempt ${i + 1} (email fallback):`, freshRole);
                            
                            if (freshRole === roleType || freshRole === 'super_admin' || freshRole === 'clinic_admin') {
                              console.log('✅ Got correct role:', freshRole);
                              break;
                            }
                            
                            if (i < 2) {
                              await new Promise(resolve => setTimeout(resolve, 500));
                            }
                          }
                          
                          setUserRole(freshRole);
                          localStorage.setItem('userRole', freshRole);
                          role = freshRole;
                          
                          const roleDisplayName = roleType === 'super_admin' ? 'Super Admin' : 'Clinic Admin';
                          toast.success(`${roleDisplayName} access granted!`);
                        } else {
                          console.error('❌ Error assigning role (email fallback):', roleError);
                        }
                      }
                    } else {
                      console.log('⚠️ Found invitation but it has expired');
                    }
                  } else {
                    console.log('⚠️ No invitation found by email either');
                  }
                } catch (emailFallbackError) {
                  console.error('❌ Error in email fallback:', emailFallbackError);
                }
              }
              
              // Don't remove token yet - might be a temporary issue
              // sessionStorage.removeItem('invitation_token');
            }
          } catch (inviteErr: any) {
            console.error('❌ Error processing invitation during signIn:', inviteErr);
            console.error('❌ Error details:', JSON.stringify(inviteErr, null, 2));
            // Don't remove token on error - might be recoverable
          }
        } else {
          console.log('ℹ️ No invitation token found in sessionStorage or localStorage');
          console.log('🔍 Checking if user has pending invitation by email...');
          console.log('🔍 User email:', email);
          
          // FALLBACK: If no token found, check if user has pending invitation by email
          // This handles cases where email confirmation link expires and token is lost
          if (email) {
            try {
              const { data: emailInvitations, error: emailInviteError } = await supabase
                .from('super_admin_invitations')
                .select('*')
                .eq('email', email.toLowerCase())
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1);
              
              if (!emailInviteError && emailInvitations && emailInvitations.length > 0) {
                const foundInvitation = emailInvitations[0];
                console.log('✅ Found pending invitation by email:', foundInvitation);
                
                // Check if invitation is expired
                if (new Date(foundInvitation.expires_at) >= new Date()) {
                  const roleType = foundInvitation.role_type || 'super_admin';
                  
                  if (['super_admin', 'clinic_admin'].includes(roleType)) {
                    console.log('🔄 Assigning role from email-matched invitation (no token):', roleType);
                    console.log('🔄 User ID:', data.user.id);
                    
                    // Assign role
                    const { data: roleData, error: roleError } = await supabase
                      .from('user_roles')
                      .upsert({
                        user_id: data.user.id,
                        role_type: roleType,
                        is_active: true,
                      }, {
                        onConflict: 'user_id'
                      })
                      .select();
                    
                    console.log('📋 Role assignment result (email match, no token):', { roleData, roleError });
                    
                    if (!roleError && roleData && roleData.length > 0) {
                      console.log(`✅ Role ${roleType} assigned successfully from email match (no token)`);
                      
                      // Update invitation status
                      const { error: updateError } = await supabase
                        .from('super_admin_invitations')
                        .update({
                          status: 'accepted',
                          accepted_at: new Date().toISOString(),
                          accepted_by: data.user.id,
                        })
                        .eq('id', foundInvitation.id);
                      
                      if (updateError) {
                        console.error('⚠️ Error updating invitation status:', updateError);
                      } else {
                        console.log('✅ Invitation status updated to accepted (email match, no token)');
                      }
                      
                      // Refresh role
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      let freshRole: UserRole = 'patient';
                      for (let i = 0; i < 3; i++) {
                        freshRole = await fetchUserRole(data.user.id, email);
                        console.log(`🔄 Role fetch attempt ${i + 1} (email match, no token):`, freshRole);
                        
                        if (freshRole === roleType || freshRole === 'super_admin' || freshRole === 'clinic_admin') {
                          console.log('✅ Got correct role:', freshRole);
                          break;
                        }
                        
                        if (i < 2) {
                          await new Promise(resolve => setTimeout(resolve, 500));
                        }
                      }
                      
                      setUserRole(freshRole);
                      localStorage.setItem('userRole', freshRole);
                      role = freshRole;
                      
                      const roleDisplayName = roleType === 'super_admin' ? 'Super Admin' : 'Clinic Admin';
                      toast.success(`${roleDisplayName} access granted!`);
                    } else {
                      console.error('❌ Error assigning role (email match, no token):', roleError);
                    }
                  }
                } else {
                  console.log('⚠️ Found invitation but it has expired');
                }
              } else {
                console.log('ℹ️ No pending invitation found by email');
              }
            } catch (emailCheckError) {
              console.error('❌ Error checking invitation by email:', emailCheckError);
            }
          }
        }
        
        // Fetch user role from database (fully dynamic, no hardcoded emails)
        // IMPORTANT: Wait a bit if invitation role was just assigned
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try multiple times if needed (RLS policy might need a moment)
        // Note: role variable is already declared above (before invitation flow)
        // Only fetch if role is still 'patient' (not updated by invitation flow)
        if (role === 'patient') {
          let attempts = 0;
          const maxAttempts = 5; // Increased attempts for invitation flow
          
          while (attempts < maxAttempts) {
            try {
              role = await fetchUserRole(data.user.id, userEmail);
              console.log(`👤 User role determined from DB (attempt ${attempts + 1}):`, role, 'for:', userEmail);
              
              // If we got a valid role (not default patient), break
              if (role && role !== 'patient') {
                console.log('✅ Got valid role, breaking loop:', role);
                break;
              }
              
              // If still patient, check if user actually has a role in DB
              if (role === 'patient' && attempts < maxAttempts - 1) {
                console.log('⚠️ Got patient role, checking DB directly...');
                const { data: directRole, error: directError } = await supabase
                  .from('user_roles')
                  .select('role_type, is_active')
                  .eq('user_id', data.user.id)
                  .eq('is_active', true)
                  .maybeSingle();
                
                console.log('📋 Direct DB query result:', { directRole, directError });
                
                if (!directError && directRole?.role_type) {
                  if (directRole.role_type === 'super_admin') {
                    role = 'super_admin';
                    console.log('✅ Found super_admin role in DB');
                  } else if (directRole.role_type === 'clinic_admin') {
                    role = 'clinic_admin';
                    console.log('✅ Found clinic_admin role in DB');
                  } else if (directRole.role_type === 'public_user') {
                    role = 'patient';
                    console.log('✅ Found public_user role in DB');
                  }
                  setUserRole(role);
                  localStorage.setItem('userRole', role);
                  console.log('✅ Role set from direct query:', role);
                  break;
                } else if (directError) {
                  console.error('❌ Direct query error:', directError);
                }
              }
            } catch (fetchError) {
              console.error(`❌ Error fetching role (attempt ${attempts + 1}):`, fetchError);
            }
            
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } // End of if (role === 'patient')
        
        // Set the role in state and localStorage
        setUserRole(role);
        localStorage.setItem('userRole', role);
        console.log('✅ Final role set:', role, 'for:', userEmail);
        console.log('📋 Role details - Context:', role, 'LocalStorage:', localStorage.getItem('userRole'));
        
        // IMPORTANT: Double-check role from localStorage before redirect
        // This ensures we use the role that was just assigned via invitation
        await new Promise(resolve => setTimeout(resolve, 200));
        const finalRoleCheck = localStorage.getItem('userRole') as UserRole | null;
        const effectiveRole = finalRoleCheck || role;
        console.log('🔍 Final role check before redirect - DB role:', role, 'LocalStorage role:', finalRoleCheck, 'Effective:', effectiveRole);
        
        // Check for pending booking and redirect accordingly
        const pendingBooking = sessionStorage.getItem('pendingBooking');
        if (pendingBooking) {
          const bookingData = JSON.parse(pendingBooking);
          sessionStorage.removeItem('pendingBooking');
          window.location.href = bookingData.returnTo || '/';
        } else {
          // Redirect based on effective role (prioritize localStorage if it has admin role)
          if (effectiveRole === 'super_admin') {
            console.log('🚀 Redirecting to super admin dashboard for:', userEmail, 'Role:', effectiveRole);
            window.location.href = '/admin/dashboard';
          } else if (effectiveRole === 'clinic_admin') {
            // Check if clinic exists before redirecting
            const { data: clinic, error: clinicError } = await supabase
              .from('clinics')
              .select('id, status')
              .eq('clinic_admin_id', data.user.id)
              .maybeSingle();
            
            console.log('🏥 Clinic check result:', { clinic, clinicError });
            
            // If no clinic exists or status is pending, redirect to onboarding
            if (!clinic || clinic.status === 'pending') {
              console.log('🚀 Redirecting clinic admin to onboarding (no clinic or pending)');
              window.location.href = '/clinic-admin/onboarding';
            } else {
              console.log('🚀 Redirecting to clinic admin dashboard for:', userEmail, 'Role:', effectiveRole);
              window.location.href = '/clinic-admin/dashboard';
            }
          } else if (effectiveRole === 'doctor') {
            console.log('🚀 Redirecting to doctor appointments for:', userEmail, 'Role:', effectiveRole);
            window.location.href = '/doctor/appointments';
          } else {
            console.log('🚀 Redirecting to patient homepage for:', userEmail, 'Role:', effectiveRole);
            console.log('⚠️ WARNING: User has patient role. If invitation was sent, check console logs above for role assignment errors.');
            window.location.href = '/';
          }
        }
      }
      
      return { error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Signed out successfully');
        window.location.href = '/';
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateProfile = async (fullName: string) => {
    try {
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('user_id', user.id);

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success('Profile updated successfully');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      if (!user?.email) throw new Error('No user email found');

      // First verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        toast.error('Current password is incorrect');
        return { error: verifyError };
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success('Password updated successfully');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      if (!user) throw new Error('No user logged in');

      // Update password (for password reset scenarios)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success('Password updated successfully');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const deleteAccount = async () => {
    try {
      if (!user) throw new Error('No user logged in');

      // Delete profile first
      await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      // Note: Deleting the auth user is typically done via admin API
      // For now, we'll just sign out and show a message
      await signOut();
      toast.success('Account deletion initiated. Please contact support to complete the process.');
      
      return { error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const resendConfirmation = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      toast.success('Confirmation email resent! Please check your inbox.');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      toast.success('Password reset email sent! Please check your inbox.');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message);
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    userRole,
    isSuperAdmin: userRole === 'super_admin',
    isClinicAdmin: userRole === 'clinic_admin',
    signUp,
    signIn,
    signOut,
    updateProfile,
    changePassword,
    updatePassword,
    deleteAccount,
    resendConfirmation,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

