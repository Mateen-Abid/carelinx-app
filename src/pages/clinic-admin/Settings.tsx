import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClinicAdminSidebar from '@/components/clinic-admin/ClinicAdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Key, LogOut, ArrowRight, Plus, Info, Copy, Check } from 'lucide-react';
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
  email: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  created_at: string;
  doctor_id?: string | null;
}

const ClinicAdminSettings = () => {
  const { user, signOut, updateProfile, changePassword } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  // Error boundary state
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // General settings state
  const [defaultAppointmentDuration, setDefaultAppointmentDuration] = useState('30 Minutes');
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
  const [showInvitationLinkModal, setShowInvitationLinkModal] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string>('');
  const [invitedDoctorEmail, setInvitedDoctorEmail] = useState<string>('');

  // Add team member form state (for doctors only)
  const [newTeamMember, setNewTeamMember] = useState<{
    name: string;
    email: string;
    doctor_id: string;
  }>({
    name: '',
    email: '',
    doctor_id: '',
  });

  // Get clinic ID
  const [clinicId, setClinicId] = useState<string | null>(null);
  
  // Clinic doctors state (for dropdown)
  const [clinicDoctors, setClinicDoctors] = useState<Array<{ id: string; name: string; email: string | null }>>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  // Edit profile form state
  const [profileData, setProfileData] = useState({
    fullName: 'Dr. Adebayo',
    email: user?.email || 'admin@lushcare.com',
  });
  const [userRole, setUserRole] = useState<string>('Clinic Administrator');
  const [joinedDate, setJoinedDate] = useState<string>('May 2024');

  // Change password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const fetchTeamMembers = async () => {
    try {
      setLoadingTeamMembers(true);
      console.log('🔍 Fetching doctors from clinic_admin_invitations...');
      
      if (!user) {
        setTeamMembers([]);
        setLoadingTeamMembers(false);
        return;
      }

      // Get clinic ID first
      const { data: clinicData, error: clinicError } = await (supabase
        .from('clinics' as any)
        .select('id')
        .eq('clinic_admin_id', user.id)
        .eq('status', 'active')
        .single() as any);

      if (clinicError || !clinicData) {
        console.error('❌ Error fetching clinic:', clinicError);
        setTeamMembers([]);
        setLoadingTeamMembers(false);
        return;
      }

      setClinicId(clinicData.id);

      // Fetch clinic doctors for dropdown
      await fetchClinicDoctors(clinicData.id);

      // Fetch invitations (doctors) for this clinic
      const { data, error } = await (supabase
        .from('clinic_admin_invitations' as any)
        .select('*')
        .eq('clinic_id', clinicData.id)
        .order('created_at', { ascending: false }) as any);

      if (error) {
        console.error('❌ Error fetching doctor invitations:', error);
        if (error.code !== '42P01') {
          toast.error('Failed to load doctors');
        }
        setTeamMembers([]);
        return;
      }

      // Map invitations to TeamMember format
      const mappedMembers: TeamMember[] = (data || []).map((invitation: any) => ({
        id: invitation.id,
        name: invitation.name || invitation.email || 'N/A',
        email: invitation.email,
        status: invitation.status,
        created_at: invitation.created_at,
        doctor_id: invitation.doctor_id,
      }));

      console.log('✅ Doctors fetched:', mappedMembers.length);
      setTeamMembers(mappedMembers);
    } catch (error: any) {
      console.error('❌ Error fetching team members:', error);
      if (error?.code !== '42P01' && !error?.message?.includes('does not exist')) {
        toast.error('Failed to load doctors');
      }
      setTeamMembers([]);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const fetchClinicDoctors = async (clinicIdParam: string) => {
    try {
      setLoadingDoctors(true);
      console.log('🔍 Fetching clinic doctors for dropdown...');
      
      const { data: doctorsData, error: doctorsError } = await (supabase
        .from('doctors' as any)
        .select('id, name, email')
        .eq('clinic_id', clinicIdParam)
        .order('name', { ascending: true }) as any);

      if (doctorsError) {
        console.error('❌ Error fetching clinic doctors:', doctorsError);
        setClinicDoctors([]);
        return;
      }

      console.log('✅ Clinic doctors fetched:', doctorsData?.length || 0);
      setClinicDoctors(doctorsData || []);
    } catch (error) {
      console.error('❌ Error fetching clinic doctors:', error);
      setClinicDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Handle doctor selection from dropdown
  const handleDoctorSelect = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
    const selectedDoctor = clinicDoctors.find(d => d.id === doctorId);
    if (selectedDoctor) {
      setNewTeamMember({
        name: selectedDoctor.name,
        email: selectedDoctor.email || '',
        doctor_id: doctorId, // Store doctor_id for edge function
      });
    }
  };

  // Fetch profile data and team members
  useEffect(() => {
    try {
      fetchProfile();
      fetchTeamMembers();
    } catch (error: any) {
      console.error('❌ Error in Settings page useEffect:', error);
      setHasError(true);
      setErrorMessage(error?.message || 'An error occurred loading the settings page');
    }
  }, [user]);
  
  // Error boundary - show error message if something went wrong
  if (hasError) {
    return (
      <ProtectedRoute allowedRoles={['clinic_admin']}>
        <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`}>
          <ClinicAdminSidebar isDarkMode={isDarkMode} onDarkModeToggle={toggleDarkMode} />
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
        const profile = profileData as any;
        setProfileData({
          fullName: profile.full_name || 'Dr. Adebayo',
          email: profile.email || user.email || 'admin@lushcare.com',
        });

        // Format joined date
        if (profile.created_at) {
          const joinedDateObj = new Date(profile.created_at);
          const formattedDate = joinedDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          setJoinedDate(formattedDate);
        }
      }

      // Fetch admin settings (including general settings)
      const { data: settingsData, error: settingsError } = await (supabase
        .from('admin_settings' as any)
        .select('*')
        .eq('user_id', user.id)
        .single() as any);

      if (!settingsError && settingsData) {
        // Load general settings
        if (settingsData.default_appointment_duration) {
          setDefaultAppointmentDuration(settingsData.default_appointment_duration);
        }
        if (settingsData.timezone) {
          setTimezone(settingsData.timezone);
        }
        if (settingsData.date_format) {
          setDateFormat(settingsData.date_format);
        }
        if (settingsData.language) {
          setLanguage(settingsData.language);
        }
        
        // Load notification settings
        if (settingsData.appointment_alerts !== undefined) {
          setAppointmentAlerts(settingsData.appointment_alerts);
        }
        if (settingsData.doctor_schedule_updates !== undefined) {
          setDoctorScheduleUpdates(settingsData.doctor_schedule_updates);
        }
        if (settingsData.patient_reminders !== undefined) {
          setPatientReminders(settingsData.patient_reminders);
        }
        if (settingsData.system_updates !== undefined) {
          setSystemUpdates(settingsData.system_updates);
        }
      }

      // Fetch user role from user_roles table
      const { data: userRoleData, error: userRoleError } = await (supabase
        .from('user_roles' as any)
        .select('role_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single() as any);

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
          // Default to Clinic Administrator if no role found
          setUserRole('Clinic Administrator');
        }
      }
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
    }
  };

  const handleAddTeamMember = async () => {
    try {
      // Validate fields
      if (!selectedDoctorId || !newTeamMember.doctor_id) {
        toast.error('Please select a doctor from the dropdown');
        return;
      }

      if (!newTeamMember.email || !newTeamMember.email.trim()) {
        toast.error('Please enter email address for the doctor');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newTeamMember.email.trim())) {
        toast.error('Please enter a valid email address');
        return;
      }

      if (!clinicId) {
        toast.error('Clinic not found. Please refresh the page.');
        return;
      }

      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please login again.');
        return;
      }

      // Get current app URL (for invitation link)
      const appUrl = window.location.origin;

      // Prepare request body with trimmed values
      const requestBody = {
        email: newTeamMember.email.trim(),
        name: newTeamMember.name.trim(),
        doctor_id: newTeamMember.doctor_id, // Pass existing doctor_id
        app_url: appUrl,
      };

      console.log('📤 Sending doctor invitation request:', {
        email: requestBody.email,
        name: requestBody.name,
        app_url: requestBody.app_url,
        clinicId: clinicId,
        hasResendKey: !!requestBody.resend_api_key
      });

      // Call edge function to send doctor invitation
      let functionData: any = null;
      let functionError: any = null;
      
      try {
        const result = await supabase.functions.invoke('send-doctor-invitation', {
          body: requestBody,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        functionData = result.data;
        functionError = result.error;
      } catch (err: any) {
        console.error('❌ Exception calling edge function:', err);
        functionError = err;
      }

      if (functionError) {
        console.error('❌ Error calling edge function:', functionError);
        console.error('❌ Full error object:', JSON.stringify(functionError, null, 2));
        console.error('❌ Error name:', functionError.name);
        console.error('❌ Error message:', functionError.message);
        console.error('❌ Error context:', functionError.context);
        
        // Try to get error message from response
        let errorMessage = functionError.message || String(functionError);
        let errorDetails = '';
        
        // Check if there's a response with error details
        if (functionError.context) {
          console.error('❌ Error context exists:', functionError.context);
          if (functionError.context.body) {
            try {
              const errorBody = typeof functionError.context.body === 'string' 
                ? JSON.parse(functionError.context.body) 
                : functionError.context.body;
              errorMessage = errorBody.error || errorMessage;
              errorDetails = errorBody.received ? JSON.stringify(errorBody.received) : '';
              console.error('❌ Parsed error body:', errorBody);
            } catch (e) {
              console.error('Could not parse error body:', e);
            }
          }
        }
        
        // Try to get error from data if available
        if (functionData && functionData.error) {
          errorMessage = functionData.error;
          console.error('❌ Error from function data:', functionData.error);
        }
        
        console.error('❌ Final error message:', errorMessage);
        if (errorDetails) {
          console.error('❌ Error details:', errorDetails);
        }
        
        // Show user-friendly error message
        if (errorMessage.includes('Function not found') || 
            errorMessage.includes('404') || 
            errorMessage.includes('Failed to send a request')) {
          toast.error('Edge function not deployed. Please deploy the function first.');
          console.error('📝 DEPLOYMENT REQUIRED:');
          console.error('Deploy the function: supabase functions deploy send-doctor-invitation');
        } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
          toast.error('Unauthorized. Please check your session and try again.');
        } else if (errorMessage.includes('403')) {
          toast.error('Access denied. Only clinic admin can send doctor invitations.');
        } else if (errorMessage.includes('400') || errorMessage.includes('Missing required fields') || errorMessage.includes('Validation')) {
          toast.error(`Validation error: ${errorMessage}`);
        } else if (errorMessage.includes('Clinic not found')) {
          toast.error('Clinic not found or not active. Please check your clinic status.');
        } else {
          toast.error(`Failed to send invitation: ${errorMessage || 'Unknown error. Check console and Supabase logs.'}`);
          console.error('📝 Please check Supabase Dashboard → Edge Functions → send-doctor-invitation → Logs for detailed error');
        }
        return;
      }

      if (functionData?.error) {
        console.error('❌ Edge function error:', functionData.error);
        toast.error(`Failed to send invitation: ${functionData.error}`);
        return;
      }

      console.log('✅ Doctor invitation sent successfully:', functionData);
      toast.success(`Invitation sent to ${newTeamMember.email}!`);
      
      // Show invitation link in modal
      const invitationUrl = functionData?.invitation_url || functionData?.test_url;
      if (invitationUrl) {
        setInvitationLink(invitationUrl);
        setInvitedDoctorEmail(newTeamMember.email);
        setShowInvitationLinkModal(true);
        console.log('🔗 Invitation URL:', invitationUrl);
      }

      // Reset form
      setNewTeamMember({
        name: '',
        email: '',
        doctor_id: '',
      });
      setSelectedDoctorId('');
      setShowAddTeamMemberModal(false);
      
      // Refresh team members list
      fetchTeamMembers();
    } catch (error: any) {
      console.error('❌ Error adding team member:', error);
      toast.error('Failed to send invitation. Please try again.');
    }
  };

  const handleSaveChanges = async () => {
    try {
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // Check if settings exist
      const { data: existingSettings } = await (supabase
        .from('admin_settings' as any)
        .select('id')
        .eq('user_id', user.id)
        .single() as any);

      const settingsData = {
        user_id: user.id,
        default_appointment_duration: defaultAppointmentDuration,
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
        const { error: updateError } = await (supabase
          .from('admin_settings' as any)
          .update(settingsData)
          .eq('user_id', user.id) as any);
        error = updateError;
      } else {
        // Insert new settings
        const { error: insertError } = await (supabase
          .from('admin_settings' as any)
          .insert(settingsData) as any);
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
    <ProtectedRoute allowedRoles={['clinic_admin']}>
      <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`}>
        <ClinicAdminSidebar isDarkMode={isDarkMode} onDarkModeToggle={toggleDarkMode} />
        
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
                    <span className="text-base font-semibold text-gray-900 dark:text-white">{joinedDate}</span>
                  </div>
                </div>
              </div>

              {/* Team Members Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Team members</h2>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddTeamMemberModal(true)}
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Team member
                    </Button>
                  </div>
                </div>

                {/* Team Members Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTeamMembers ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-500 dark:text-gray-400">
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
                              <span className="text-sm text-gray-600 dark:text-gray-400">{member.email}</span>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                member.status === 'accepted' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : member.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : member.status === 'expired'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                              }`}>
                                {member.status === 'accepted' ? 'Accepted' : 
                                 member.status === 'pending' ? 'Pending' : 
                                 member.status === 'expired' ? 'Expired' : 
                                 'Cancelled'}
                              </span>
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
                          <td colSpan={4} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            No doctors found. Click "Add Team member" to invite a doctor.
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

        {/* Add Team Member Modal */}
        <Dialog open={showAddTeamMemberModal} onOpenChange={setShowAddTeamMemberModal}>
          <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Add Team member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 overflow-y-auto flex-1 px-1 pb-4 min-h-0">
              <div>
                <Label htmlFor="doctor" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Doctor <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={selectedDoctorId} 
                  onValueChange={handleDoctorSelect}
                  disabled={loadingDoctors}
                >
                  <SelectTrigger className="mt-1 w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg">
                    <SelectValue placeholder={loadingDoctors ? "Loading doctors..." : "Select a doctor from your clinic"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clinicDoctors.length === 0 ? (
                      <SelectItem value="no-doctors" disabled>
                        No doctors found in your clinic
                      </SelectItem>
                    ) : (
                      clinicDoctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select a doctor from your clinic to send invitation
                </p>
              </div>

              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Doctor Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Doctor name will be auto-filled"
                  value={newTeamMember.name}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg"
                  required
                  disabled={!!selectedDoctorId}
                />
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
                  {selectedDoctorId && !newTeamMember.email 
                    ? '⚠️ Please enter email address for this doctor'
                    : 'An invitation email will be sent to this address. Doctor will create their password during signup.'}
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
                    email: '',
                    doctor_id: '',
                  });
                  setSelectedDoctorId('');
                }}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTeamMember}
                className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white"
              >
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invitation Link Modal */}
        <Dialog open={showInvitationLinkModal} onOpenChange={setShowInvitationLinkModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Invitation Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Share this link with the doctor:
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={invitationLink}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(invitationLink);
                        toast.success('Link copied to clipboard!');
                      } catch (err) {
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = invitationLink;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        toast.success('Link copied to clipboard!');
                      }
                    }}
                    className="flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> An invitation email has been sent to <strong>{invitedDoctorEmail}</strong>. 
                  You can also share this link directly with the doctor.
                </p>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                onClick={() => {
                  setShowInvitationLinkModal(false);
                  setInvitationLink('');
                  setInvitedDoctorEmail('');
                }}
                className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default ClinicAdminSettings;
