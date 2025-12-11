import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Key, LogOut, Plus, Filter, Info, ArrowRight, X } from 'lucide-react';
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
    password: string;
  }>({
    name: '',
    role: '',
    description: '',
    status: 'active',
    access_level: '',
    email: '',
    password: '',
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
      console.log('🔍 Fetching team members from database...');
      
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching team members:', error);
        // Don't show toast on initial load if table doesn't exist yet
        if (error.code !== '42P01') {
          toast.error('Failed to load team members');
        }
        setTeamMembers([]);
        return;
      }

      console.log('✅ Team members fetched:', data?.length || 0);
      setTeamMembers(data || []);
    } catch (error: any) {
      console.error('❌ Error fetching team members:', error);
      // Don't show toast if it's just a missing table error
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
      if (!newTeamMember.name || !newTeamMember.role) {
        toast.error('Please fill in all required fields');
        return;
      }

      // If access level is selected, email and password are required
      if (newTeamMember.access_level && newTeamMember.access_level !== 'no-access' && (!newTeamMember.email || !newTeamMember.password)) {
        toast.error('Email and password are required when assigning system access');
        return;
      }

      let userId: string | null = null;

      // If access level is provided, create user account and assign role via edge function
      if (newTeamMember.access_level && newTeamMember.access_level !== 'no-access' && newTeamMember.email && newTeamMember.password) {
        try {
          // Get current session for authorization
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast.error('Session expired. Please login again.');
            return;
          }

          // Call edge function to create user account with role
          const { data: functionData, error: functionError } = await supabase.functions.invoke('super-processor', {
            body: {
              email: newTeamMember.email,
              password: newTeamMember.password,
              full_name: newTeamMember.name,
              access_level: newTeamMember.access_level,
            },
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
              console.error('3. Link your project: supabase link --project-ref flqignqyqpdgvztpqucd');
              console.error('4. Deploy the function: supabase functions deploy super-processor');
              console.error('   OR use the function name you created in Supabase Dashboard');
            } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
              toast.error('Unauthorized. Please check your session and try again.');
            } else if (errorMessage.includes('403')) {
              toast.error('Access denied. Only super admin can create team member accounts.');
            } else {
              toast.error(`Failed to create user account: ${errorMessage}`);
            }
            return;
          }

          if (functionData?.error) {
            console.error('❌ Edge function error:', functionData.error);
            toast.error(`Failed to create user account: ${functionData.error}`);
            return;
          }

          userId = functionData?.user_id;
          console.log('✅ User account created via edge function:', userId);
          toast.success(`User account created with ${newTeamMember.access_level} access`);
        } catch (error: any) {
          console.error('❌ Error setting up user access:', error);
          toast.error('Failed to create user account. Please try again.');
          return;
        }
      }

      // Determine permissions based on role
      const permissions = newTeamMember.role.toLowerCase().includes('admin') 
        ? 'Full Access' 
        : 'Limited Access';

      // Add team member to database
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          name: newTeamMember.name,
          role: newTeamMember.role,
          description: newTeamMember.description || null,
          status: newTeamMember.status,
          permissions: permissions,
          access_level: (newTeamMember.access_level && newTeamMember.access_level !== 'no-access') ? newTeamMember.access_level as 'super_admin' | 'clinic_admin' | 'public_user' : null,
          email: (newTeamMember.access_level && newTeamMember.access_level !== 'no-access') ? newTeamMember.email : null,
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding team member:', error);
        toast.error('Failed to add team member');
        return;
      }

      console.log('✅ Team member added:', data);
      toast.success('Team member added successfully');
      
      // Reset form
      setNewTeamMember({
        name: '',
        role: '',
        description: '',
        status: 'active',
        access_level: '' as const,
        email: '',
        password: '',
      });
      setShowAddTeamMemberModal(false);
      
      // Refresh team members list
      fetchTeamMembers();
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

              {/* General Settings Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">General Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Default Appointment Duration
                    </label>
                    <Select value={appointmentDuration} onValueChange={setAppointmentDuration}>
                      <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15 Minutes">15 Minutes</SelectItem>
                        <SelectItem value="30 Minutes">30 Minutes</SelectItem>
                        <SelectItem value="45 Minutes">45 Minutes</SelectItem>
                        <SelectItem value="60 Minutes">60 Minutes</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Set average length of bookings.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timezone</label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC - 5">UTC - 5</SelectItem>
                        <SelectItem value="UTC - 4">UTC - 4</SelectItem>
                        <SelectItem value="UTC - 3">UTC - 3</SelectItem>
                        <SelectItem value="UTC + 0">UTC + 0</SelectItem>
                        <SelectItem value="UTC + 1">UTC + 1</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Define clinic's default timezone.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Format</label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Choose how dates are displayed.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Language</label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English (US)">English (US)</SelectItem>
                        <SelectItem value="English (UK)">English (UK)</SelectItem>
                        <SelectItem value="Spanish">Spanish</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="Arabic">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Default interface language.</p>
                  </div>
                </div>
              </div>

              {/* Notification Settings Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Notification Settings</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Appointment Alerts</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Notify admin for new bookings.</p>
                    </div>
                    <button
                      onClick={() => setAppointmentAlerts(!appointmentAlerts)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        appointmentAlerts ? 'bg-[#00FFA2]' : 'bg-[#0C2243]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          appointmentAlerts ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Doctor Schedule Updates</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Alert when doctors change availability.</p>
                    </div>
                    <button
                      onClick={() => setDoctorScheduleUpdates(!doctorScheduleUpdates)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        doctorScheduleUpdates ? 'bg-[#00FFA2]' : 'bg-[#0C2243]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          doctorScheduleUpdates ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Patient Reminders</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Send email/SMS reminders before appointments.</p>
                    </div>
                    <button
                      onClick={() => setPatientReminders(!patientReminders)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        patientReminders ? 'bg-[#00FFA2]' : 'bg-[#0C2243]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          patientReminders ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">System Updates</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Notify for Carelinx maintenance updates.</p>
                    </div>
                    <button
                      onClick={() => setSystemUpdates(!systemUpdates)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        systemUpdates ? 'bg-[#00FFA2]' : 'bg-[#0C2243]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          systemUpdates ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
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
                    <Button
                      variant="outline"
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>

                {/* Team Members Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Role</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Access Level</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Permissions</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTeamMembers ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
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
                          <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
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
          <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Add Team member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 overflow-y-auto flex-1 pr-2">
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

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe team member role"
                  value={newTeamMember.description}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, description: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg min-h-[100px]"
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
                  System Access Level <span className="text-gray-400 text-xs">(Optional)</span>
                </Label>
                <Select 
                  value={newTeamMember.access_level === '' ? 'no-access' : newTeamMember.access_level || 'no-access'} 
                  onValueChange={(value: string) => {
                    const accessLevel = value === 'no-access' ? '' : value;
                    setNewTeamMember({ 
                      ...newTeamMember, 
                      access_level: accessLevel as 'super_admin' | 'clinic_admin' | 'public_user' | '', 
                      email: accessLevel ? '' : newTeamMember.email, 
                      password: accessLevel ? '' : newTeamMember.password 
                    });
                  }}
                >
                  <SelectTrigger className="mt-1 w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg">
                    <SelectValue placeholder="Select access level (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-access">No System Access</SelectItem>
                    <SelectItem value="super_admin">Super Admin (Admin Pages)</SelectItem>
                    <SelectItem value="clinic_admin">Clinic Admin (Clinic Admin Pages)</SelectItem>
                    <SelectItem value="public_user">Public User (Booking Pages)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {newTeamMember.access_level === 'super_admin' && 'Full access to all admin pages and settings'}
                  {newTeamMember.access_level === 'clinic_admin' && 'Access to clinic admin pages (to be created)'}
                  {newTeamMember.access_level === 'public_user' && 'Access to appointment booking pages'}
                  {(!newTeamMember.access_level || newTeamMember.access_level === '') && 'Team member will not have system login access'}
                </p>
              </div>

              {newTeamMember.access_level && newTeamMember.access_level !== 'no-access' && (
                <>
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter email for system access"
                      value={newTeamMember.email}
                      onChange={(e) => setNewTeamMember({ ...newTeamMember, email: e.target.value })}
                      className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Used for login to the system</p>
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password (min 6 characters)"
                      value={newTeamMember.password}
                      onChange={(e) => setNewTeamMember({ ...newTeamMember, password: e.target.value })}
                      className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg"
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 6 characters</p>
                  </div>
                </>
              )}
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
                    password: '',
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
