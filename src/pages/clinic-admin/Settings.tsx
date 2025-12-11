import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClinicAdminSidebar from '@/components/clinic-admin/ClinicAdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Key, LogOut, ArrowRight } from 'lucide-react';
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

const ClinicAdminSettings = () => {
  const { user, signOut, updateProfile, changePassword } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  // Error boundary state
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Notification settings state
  const [appointmentAlerts, setAppointmentAlerts] = useState(true);
  const [doctorScheduleUpdates, setDoctorScheduleUpdates] = useState(false);
  const [patientReminders, setPatientReminders] = useState(true);
  const [systemUpdates, setSystemUpdates] = useState(false);

  // Modal states
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  

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

  // Fetch profile data
  useEffect(() => {
    try {
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
      </div>
    </ProtectedRoute>
  );
};

export default ClinicAdminSettings;
