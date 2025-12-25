import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Key, LogOut, Plus, Info, ArrowRight, X } from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  description?: string;
  status: 'active' | 'inactive' | 'on-leave';
  permissions: 'Full Access' | 'Limited Access';
  access_level?: 'super_admin' | 'clinic_admin' | 'public_user' | null;
  email?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

const AdminSettings = () => {
  const { user, signOut, updateProfile, changePassword } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  // Error boundary state
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Settings state
  const [appointmentDuration, setAppointmentDuration] = useState('30 Minutes');
  const [timezone, setTimezone] = useState('UTC - 5');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [language, setLanguage] = useState('English (US)');
  
  // Notification settings state
  const [appointmentAlerts, setAppointmentAlerts] = useState(true);
  const [doctorScheduleUpdates, setDoctorScheduleUpdates] = useState(false);
  const [patientReminders, setPatientReminders] = useState(true);
  const [systemUpdates, setSystemUpdates] = useState(false);

  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(true);

  // Modal states
  const [showAddTeamMemberModal, setShowAddTeamMemberModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  
  // Add team member form state
  const [newTeamMember, setNewTeamMember] = useState<{
    name: string;
    role: string;
    description: string;
    status: 'active' | 'inactive' | 'on-leave';
    access_level: 'super_admin' | 'clinic_admin' | 'public_user' | '';
    email: string;
  }>({
    name: '',
    role: '',
    description: '',
    status: 'active',
    access_level: '',
    email: '',
  });

  // Edit profile form state
  const [profileData, setProfileData] = useState({
    fullName: 'Dr. Adebayo',
    email: user?.email || 'admin@lushcare.com',
  });

  // User role and joined date
  const [userRole, setUserRole] = useState<string>('Super Admin');
  const [joinedDate, setJoinedDate] = useState<string>('');

  // Change password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch team members from database
  useEffect(() => {
    try {
      fetchTeamMembers();
      fetchSettings();
      fetchProfile();
    } catch (error: any) {
      console.error('❌ Error in Settings page useEffect:', error);
      setHasError(true);
      setErrorMessage(error?.message || 'An error occurred loading the settings page');
    }
  }, [user]);
  
  // Error boundary - show error message if something went wrong
  if (hasError) {
    return (
      <ProtectedRoute allowedRoles={['super_admin']}>
        <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`}>
          <AdminSidebar isDarkMode={isDarkMode} onDarkModeToggle={toggleDarkMode} />
          <main className="flex-1 bg-[#F7F7F7] dark:bg-gray-900 min-h-screen overflow-y-auto">
            <div className="p-8">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Settings</h2>
                <p className="text-red-600 dark:text-red-300">{errorMessage}</p>
                <Button
                  onClick={() => {
                    setHasError(false);
                    setErrorMessage('');
                    window.location.reload();
                  }}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                >
                  Reload Page
                </Button>
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  const fetchTeamMembers = async () => {
    try {
      setLoadingTeamMembers(true);
      console.log('🔍 Fetching team members from super_admin_invitations...');
      console.log('👤 Current user:', user?.id, user?.email);
      
      // Fetch from super_admin_invitations table (dynamic - shows only what's in DB)
      const { data, error } = await supabase
        .from('super_admin_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching invitations:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        
        if (error.code === '42501') {
          console.error('⚠️ RLS Policy Error: User may not have permission to view invitations');
          toast.error('Permission denied. Please check RLS policies.');
        } else if (error.code === '42P01') {
          console.error('⚠️ Table does not exist');
        } else {
          toast.error(`Failed to load team members: ${error.message}`);
        }
        setTeamMembers([]);
        return;
      }

      // Map invitations data to TeamMember format
      const mappedMembers: TeamMember[] = (data || []).map((invitation: any) => {
        // Determine role based on role_type
        const roleName = invitation.role_type === 'super_admin' ? 'Super Admin' : 
                        invitation.role_type === 'clinic_admin' ? 'Clinic Admin' : 
                        'Admin';
        
        // Determine status based on invitation status
        let memberStatus: 'active' | 'inactive' | 'on-leave' = 'active';
        if (invitation.status === 'pending') {
          memberStatus = 'active'; // Pending invitations are considered active
        } else if (invitation.status === 'accepted') {
          memberStatus = 'active';
        } else if (invitation.status === 'expired' || invitation.status === 'cancelled') {
          memberStatus = 'inactive';
        }
        
        // Determine permissions based on access level
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

      console.log('✅ Team members fetched from invitations:', mappedMembers.length);
      console.log('📋 Mapped team members data:', mappedMembers);
      setTeamMembers(mappedMembers);
      
      if (mappedMembers.length === 0) {
        console.log('ℹ️ No invitations found in database');
      }
    } catch (error: any) {
      console.error('❌ Exception fetching team members:', error);
      if (error?.code !== '42P01' && !error?.message?.includes('does not exist')) {
        toast.error('Failed to load team members');
      }
      setTeamMembers([]);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const fetchSettings = async () => {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching settings:', error);
        return;
      }

      if (data) {
        setAppointmentDuration(data.appointment_duration || '30 Minutes');
        setTimezone(data.timezone || 'UTC - 5');
        setDateFormat(data.date_format || 'DD/MM/YYYY');
        setLanguage(data.language || 'English (US)');
        setAppointmentAlerts(data.appointment_alerts ?? true);
        setDoctorScheduleUpdates(data.doctor_schedule_updates ?? false);
        setPatientReminders(data.patient_reminders ?? true);
        setSystemUpdates(data.system_updates ?? false);
      }
    } catch (error) {
      console.error('❌ Error fetching settings:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      if (!user) return;

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, created_at, role')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
        return;
      }

      if (profileData) {
        setProfileData({
          fullName: profileData.full_name || 'Dr. Adebayo',
          email: profileData.email || user.email || 'admin@lushcare.com',
        });

        // Format joined date
        if (profileData.created_at) {
          const joinedDateObj = new Date(profileData.created_at);
          const formattedDate = joinedDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          setJoinedDate(formattedDate);
        }
      }

      // Fetch user role from user_roles table
      const { data: userRoleData, error: userRoleError } = await supabase
        .from('user_roles')
        .select('role_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRoleError && userRoleData?.role_type) {
        // Map role_type to display name
        const roleDisplayName = 
          userRoleData.role_type === 'super_admin' ? 'Super Admin' :
          userRoleData.role_type === 'clinic_admin' ? 'Clinic Administrator' :
          userRoleData.role_type === 'public_user' ? 'Public User' :
          'User';
        setUserRole(roleDisplayName);
      } else {
        // Fallback: Check profiles.role (legacy)
        if (profileData && 'role' in profileData && profileData.role) {
          const roleDisplayName = 
            profileData.role === 'super_admin' ? 'Super Admin' :
            profileData.role === 'clinic_admin' ? 'Clinic Administrator' :
            profileData.role === 'patient' ? 'Patient' :
            'User';
          setUserRole(roleDisplayName);
        } else {
          // Default to Super Admin if no role found (since this is super admin settings page)
          setUserRole('Super Admin');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
    }
  };

  const handleAddTeamMember = async () => {
    try {
      if (!newTeamMember.name || !newTeamMember.role || !newTeamMember.access_level) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Email is required when access level is selected
      if (!newTeamMember.email) {
        toast.error('Email is required for system access');
        return;
      }

      let invitationData: any = null;

      // Send invitation via edge function (access_level is now required)
      if (newTeamMember.access_level && newTeamMember.email) {
        try {
          // Get current session for authorization
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast.error('Session expired. Please login again.');
            return;
          }

          // Only allow super_admin or clinic_admin roles for invitations
          if (newTeamMember.access_level !== 'super_admin' && newTeamMember.access_level !== 'clinic_admin') {
            toast.error('Invitations can only be sent for Super Admin or Clinic Admin roles');
            return;
          }

          // Get current app URL (for invitation link)
          const appUrl = window.location.origin;

          // Prepare request body
          const requestBody = {
            email: newTeamMember.email,
            name: newTeamMember.name,
            role_type: newTeamMember.access_level,
            app_url: appUrl,
          };

          // Log request body for debugging
          console.log('📤 Sending invitation request:', requestBody);
          console.log('📤 Access level:', newTeamMember.access_level);
          console.log('📤 Email:', newTeamMember.email);

          // Call edge function to send invitation
          const { data: functionData, error: functionError } = await supabase.functions.invoke('send-invitation', {
            body: requestBody,
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (functionError) {
            console.error('❌ Error calling edge function:', functionError);
            console.error('Full error details:', JSON.stringify(functionError, null, 2));
            
            // Check for different error types
            const errorMessage = functionError.message || String(functionError);
            
            if (errorMessage.includes('Function not found') || 
                errorMessage.includes('404') || 
                errorMessage.includes('Failed to send a request')) {
              toast.error('Edge function not deployed. Please deploy the function first. Check console for instructions.');
              console.error('📝 DEPLOYMENT REQUIRED:');
              console.error('1. Make sure you have Supabase CLI installed: npm install -g supabase');
              console.error('2. Login to Supabase: supabase login');
              console.error('3. Link your project: supabase link --project-ref YOUR_PROJECT_REF');
              console.error('4. Deploy the function: supabase functions deploy send-invitation');
            } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
              toast.error('Unauthorized. Please check your session and try again.');
            } else if (errorMessage.includes('403')) {
              toast.error('Access denied. Only super admin can send invitations.');
            } else {
              toast.error(`Failed to send invitation: ${errorMessage}`);
            }
            return;
          }

          if (functionData?.error) {
            console.error('❌ Edge function error:', functionData.error);
            toast.error(`Failed to send invitation: ${functionData.error}`);
            return;
          }

          invitationData = functionData;
          console.log('✅ Invitation sent successfully:', functionData);
          
          // Show success message with invitation URL for testing
          toast.success(`Invitation sent to ${newTeamMember.email}!`);
          
          // For testing: log the invitation URL
          if (functionData?.test_url) {
            console.log('🔗 Invitation URL (for testing):', functionData.test_url);
            toast.info(`Invitation URL: ${functionData.test_url}`, { duration: 10000 });
          }
        } catch (error: any) {
          console.error('❌ Error sending invitation:', error);
          toast.error('Failed to send invitation. Please try again.');
          return;
        }
      }

      // Determine permissions based on role
      const permissions = newTeamMember.role.toLowerCase().includes('admin') 
        ? 'Full Access' 
        : 'Limited Access';

      // Always add team member to database (for tracking purposes)
      // This ensures the team member appears in the list even if invitation fails
      try {
        const { data, error } = await supabase
          .from('team_members')
          .insert({
            name: newTeamMember.name,
            role: newTeamMember.role,
            description: newTeamMember.description || null,
            status: newTeamMember.status,
            permissions: permissions,
            access_level: newTeamMember.access_level as 'super_admin' | 'clinic_admin' | 'public_user',
            email: newTeamMember.email,
            user_id: invitationData?.user_id || null, // Use user_id from invitation if available
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error adding team member:', error);
          console.error('❌ Error code:', error.code);
          console.error('❌ Error message:', error.message);
          console.error('❌ Error details:', JSON.stringify(error, null, 2));
          console.error('📝 Attempted insert data:', {
            name: newTeamMember.name,
            role: newTeamMember.role,
            description: newTeamMember.description || null,
            status: newTeamMember.status,
            permissions: permissions,
            access_level: newTeamMember.access_level,
            email: newTeamMember.email,
            user_id: invitationData?.user_id || null,
          });
          
          // Show detailed error message
          if (error.code === '42501') {
            toast.error('Permission denied. Please check RLS policies. Error: ' + error.message);
            console.error('⚠️ RLS Policy Error: User may not have permission to insert team members');
          } else if (error.code === '23503') {
            toast.error('Foreign key constraint error. Please check user_id reference.');
          } else if (error.code === '23514') {
            toast.error('Check constraint violation. Please check field values.');
          } else {
            toast.error(`Failed to add team member: ${error.message}`);
          }
          
          // Show appropriate error message
          if (invitationData) {
            toast.warning('Invitation sent but failed to add to team members list. The invitation is still valid.');
            console.log('⚠️ Team member not added to database, but invitation was sent successfully');
          } else {
            return;
          }
        } else {
          console.log('✅ Team member added successfully:', data);
          console.log('📋 Added team member data:', JSON.stringify(data, null, 2));
          if (invitationData) {
            toast.success(`Invitation sent and team member added successfully!`);
          } else {
            toast.success('Team member added successfully!');
          }
        }
      } catch (dbError: any) {
        console.error('❌ Exception adding team member:', dbError);
        console.error('❌ Exception details:', JSON.stringify(dbError, null, 2));
        if (invitationData) {
          toast.warning('Invitation sent but failed to add to team members list. The invitation is still valid.');
        } else {
          toast.error('Failed to add team member. Please try again.');
          return;
        }
      }
      
      // Reset form
      setNewTeamMember({
        name: '',
        role: '',
        description: '',
        status: 'active',
        access_level: '' as const,
        email: '',
      });
      setShowAddTeamMemberModal(false);
      
      // Always refresh team members list (even if insert failed, to show current state)
      console.log('🔄 Refreshing team members list...');
      setTimeout(() => {
        fetchTeamMembers();
      }, 500); // Small delay to ensure database has updated
    } catch (error) {
      console.error('❌ Error adding team member:', error);
      toast.error('Failed to add team member');
    }
  };

  const handleSaveChanges = async () => {
    try {
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const settingsData = {
        user_id: user.id,
        appointment_duration: appointmentDuration,
        timezone: timezone,
        date_format: dateFormat,
        language: language,
        appointment_alerts: appointmentAlerts,
        doctor_schedule_updates: doctorScheduleUpdates,
        patient_reminders: patientReminders,
        system_updates: systemUpdates,
      };

      let error;
      if (existingSettings) {
        // Update existing settings
        const { error: updateError } = await supabase
          .from('admin_settings')
          .update(settingsData)
          .eq('user_id', user.id);
        error = updateError;
      } else {
        // Insert new settings
        const { error: insertError } = await supabase
          .from('admin_settings')
          .insert(settingsData);
        error = insertError;
      }

      if (error) {
        console.error('❌ Error saving settings:', error);
        toast.error('Failed to save settings');
        return;
      }

      console.log('✅ Settings saved successfully');
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleEditProfile = async () => {
    try {
      if (!profileData.fullName.trim()) {
        toast.error('Name cannot be empty');
        return;
      }

      const { error } = await updateProfile(profileData.fullName);

      if (error) {
        return; // Error already handled in updateProfile
      }

      setShowEditProfileModal(false);
      fetchProfile();
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    try {
      if (!passwordData.currentPassword || !passwordData.newPassword) {
        toast.error('Please fill in all password fields');
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }

      const { error } = await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (error) {
        return; // Error already handled in changePassword
      }

      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowChangePasswordModal(false);
    } catch (error: any) {
      console.error('❌ Error changing password:', error);
      toast.error('Failed to change password');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`}>
        <AdminSidebar isDarkMode={isDarkMode} onDarkModeToggle={toggleDarkMode} />
        
        <main className="flex-1 bg-[#F7F7F7] dark:bg-gray-900 min-h-screen overflow-y-auto">
          <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <Button
                onClick={handleSaveChanges}
                className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243] font-medium px-6"
              >
                Save Changes
              </Button>
            </div>

            <div className="space-y-6">
              {/* Account Settings Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Account Settings</h2>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowEditProfileModal(true)}
                      className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243] border-[#00FFA2]"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowChangePasswordModal(true)}
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      Change Password
                    </Button>
                    <Button
                      variant="outline"
                      onClick={signOut}
                      className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Name - </span>
                    <span className="text-base font-semibold text-gray-900 dark:text-white">{profileData.fullName}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Email - </span>
                    <span className="text-base font-semibold text-gray-900 dark:text-white">{profileData.email}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Role - </span>
                    <span className="text-base font-semibold text-gray-900 dark:text-white">{userRole}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Joined - </span>
                    <span className="text-base font-semibold text-gray-900 dark:text-white">{joinedDate || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Team Members Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Team members</h2>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddTeamMemberModal(true)}
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Team member
                  </Button>
                </div>

                {/* Team Members Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Role</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Access Level</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Permissions</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTeamMembers ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            Loading...
                          </td>
                        </tr>
                      ) : teamMembers.length > 0 ? (
                        teamMembers.map((member) => (
                          <tr
                            key={member.id}
                            className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <td className="py-4 px-6">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-sm text-gray-600 dark:text-gray-400">{member.email || 'N/A'}</span>
                            </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{member.role}</span>
                          </td>
                          <td className="py-4 px-6">
                            {member.access_level ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                member.access_level === 'super_admin' 
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                  : member.access_level === 'clinic_admin'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              }`}>
                                {member.access_level === 'super_admin' ? 'Super Admin' : 
                                 member.access_level === 'clinic_admin' ? 'Clinic Admin' : 
                                 'Public User'}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">No Access</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{member.permissions}</span>
                          </td>
                            <td className="py-4 px-6">
                              <button
                                className="text-gray-600 dark:text-gray-400 hover:text-[#0C2243] dark:hover:text-[#00FFA2] transition-colors"
                                aria-label="View team member info"
                              >
                                <Info className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            No team members found. Click "Add Team member" to add one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Add Team Member Modal */}
        <Dialog open={showAddTeamMemberModal} onOpenChange={setShowAddTeamMemberModal}>
          <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Add Team member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 overflow-y-auto flex-1 px-1 pb-4 min-h-0">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Team member Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter Team member Name"
                  value={newTeamMember.name}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg"
                />
              </div>

              <div>
                <Label htmlFor="role" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role Name
                </Label>
                <Select value={newTeamMember.role} onValueChange={(value) => setNewTeamMember({ ...newTeamMember, role: value })}>
                  <SelectTrigger className="mt-1 w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Doctor">Doctor</SelectItem>
                    <SelectItem value="Nurse">Nurse</SelectItem>
                    <SelectItem value="Contributor">Contributor</SelectItem>
                    <SelectItem value="Billing Specialist">Billing Specialist</SelectItem>
                    <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pb-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe team member role"
                  value={newTeamMember.description}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, description: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg min-h-[100px] resize-y w-full focus:ring-2 focus:ring-[#0C2243] focus:border-[#0C2243]"
                  style={{ minHeight: '100px' }}
                />
              </div>

              <div>
                <Label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </Label>
                <Select value={newTeamMember.status} onValueChange={(value: any) => setNewTeamMember({ ...newTeamMember, status: value })}>
                  <SelectTrigger className="mt-1 w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg">
                    <SelectValue placeholder="Select team member status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on-leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="access_level" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  System Access Level <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={newTeamMember.access_level || ''} 
                  onValueChange={(value: string) => {
                    setNewTeamMember({ 
                      ...newTeamMember, 
                      access_level: value as 'super_admin' | 'clinic_admin'
                    });
                  }}
                >
                  <SelectTrigger className="mt-1 w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg">
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="clinic_admin">Clinic Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {newTeamMember.access_level === 'super_admin' && 'Full access to all admin pages and settings. An invitation email will be sent.'}
                  {newTeamMember.access_level === 'clinic_admin' && 'Access to clinic admin pages. An invitation email will be sent.'}
                  {(!newTeamMember.access_level || newTeamMember.access_level === '') && 'Please select an access level'}
                </p>
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email to send invitation"
                  value={newTeamMember.email}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, email: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  An invitation email will be sent to this address. User will create their password during signup.
                </p>
              </div>
            </div>
            <DialogFooter className="mt-6 flex-shrink-0 border-t border-gray-200 dark:border-gray-700 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddTeamMemberModal(false);
                  setNewTeamMember({ 
                    name: '', 
                    role: '', 
                    description: '', 
                    status: 'active',
                    access_level: '' as const,
                    email: '',
                  });
                }}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTeamMember}
                className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white"
              >
                Add Team member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Profile Modal */}
        <Dialog open={showEditProfileModal} onOpenChange={setShowEditProfileModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  disabled
                  className="mt-1 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => setShowEditProfileModal(false)}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditProfile}
                className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Password Modal */}
        <Dialog open={showChangePasswordModal} onOpenChange={setShowChangePasswordModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Change Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Password
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg"
                />
              </div>
              <div>
                <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white"
              >
                Change Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default AdminSettings;
