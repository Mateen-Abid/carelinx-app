import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Key, LogOut, Plus, Info, ArrowRight, X, Download, Copy } from 'lucide-react';
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
import { api } from '@/services/api';
import { toast } from 'sonner';
import { exportToExcel } from '@/utils/excelExport';
import { useTableSort } from '@/hooks/useTableSort';
import { TableSortHeader } from '@/components/ui/TableSortHeader';

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
  const [showInvitationLinkModal, setShowInvitationLinkModal] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string>('');
  const [invitedUserEmail, setInvitedUserEmail] = useState<string>('');
  
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
    role: 'Admin', // Default to Admin
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
    if (!user) return;
    const fetchAllSettings = async () => {
      try {
        await Promise.all([
          fetchTeamMembers(),
          fetchSettings(),
          fetchProfile(),
        ]);
      } catch (error: any) {
        console.error('❌ Error in Settings page useEffect:', error);
        setHasError(true);
        setErrorMessage(error?.message || 'An error occurred loading the settings page');
      }
    };
    fetchAllSettings();
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
      console.log('🔍 Fetching team members from backend...');
      
      const response = await api.adminSettings.getTeamMembers();
      console.log('📥 Full response from backend:', response);
      
      const mappedMembers = response.teamMembers || response.team_members || [];
      console.log('✅ Team members extracted:', mappedMembers?.length || 0);
      console.log('📋 Team members data:', mappedMembers);
      
      setTeamMembers(mappedMembers);
      
      if (!mappedMembers || mappedMembers.length === 0) {
        console.log('ℹ️ No team members found');
      }
    } catch (error: any) {
      console.error('❌ Error fetching team members:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      toast.error(error.message || 'Failed to load team members');
      setTeamMembers([]);
    } finally {
      setLoadingTeamMembers(false);
    }
  };

  const fetchSettings = async () => {
    try {
      if (!user) return;

      console.log('🔍 Fetching admin settings from backend...');
      const { settings } = await api.adminSettings.getSettings();

      if (settings) {
        setAppointmentDuration(settings.appointment_duration || '30 Minutes');
        setTimezone(settings.timezone || 'UTC - 5');
        setDateFormat(settings.date_format || 'DD/MM/YYYY');
        setLanguage(settings.language || 'English (US)');
        setAppointmentAlerts(settings.appointment_alerts ?? true);
        setDoctorScheduleUpdates(settings.doctor_schedule_updates ?? false);
        setPatientReminders(settings.patient_reminders ?? true);
        setSystemUpdates(settings.system_updates ?? false);
        console.log('✅ Settings fetched from backend');
      }
    } catch (error) {
      console.error('❌ Error fetching settings:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      if (!user) return;

      console.log('🔍 Fetching profile from backend...');
      const { profile } = await api.adminSettings.getProfile();

      if (profile) {
        setProfileData({
          fullName: profile.fullName || 'Dr. Adebayo',
          email: profile.email || user.email || 'admin@lushcare.com',
        });

        setJoinedDate(profile.joinedDate || '');
        setUserRole(profile.role || 'Super Admin');
        console.log('✅ Profile fetched from backend');
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

      // Send invitation via backend API (secure - no API keys exposed)
      if (newTeamMember.access_level && newTeamMember.email) {
        try {
          // Only allow super_admin or clinic_admin roles for invitations
          if (newTeamMember.access_level !== 'super_admin' && newTeamMember.access_level !== 'clinic_admin') {
            toast.error('Invitations can only be sent for Super Admin or Clinic Admin roles');
            return;
          }

          console.log('📤 Sending invitation via backend API (secure - no API keys exposed)...');
          
          // Call backend API - API keys are handled server-side
          const response = await api.invitations.sendInvitation({
            email: newTeamMember.email.trim(),
            name: newTeamMember.name.trim(),
            role_type: newTeamMember.access_level,
            app_url: window.location.origin,
          });

          invitationData = response;
          
          // Log full response for debugging
          console.log('📦 Backend API Response:', JSON.stringify(response, null, 2));
          
          // Extract invitation URL from response (try multiple possible field names)
          const invitationUrl = response?.invitation_url || 
                               response?.test_url || 
                               response?.invitationUrl ||
                               response?.data?.invitation_url;
          
          if (invitationUrl) {
            console.log('');
            console.log('═══════════════════════════════════════════════════════');
            console.log('🔗 INVITATION LINK GENERATED:');
            console.log('═══════════════════════════════════════════════════════');
            console.log(invitationUrl);
            console.log('═══════════════════════════════════════════════════════');
            console.log('📧 Email:', newTeamMember.email);
            console.log('👤 Role:', newTeamMember.access_level);
            console.log('💡 Copy the link above and share it with the user');
            console.log('═══════════════════════════════════════════════════════');
            console.log('');
            
            // Show invitation link in modal
            setInvitationLink(invitationUrl);
            setInvitedUserEmail(newTeamMember.email);
            setShowInvitationLinkModal(true);
            
            toast.success(`Invitation sent to ${newTeamMember.email}!`);
          } else {
            console.error('⚠️ No invitation URL found in response!');
            console.log('📦 Full response object:', response);
            toast.warning(`Invitation created but URL not found. Check console for details.`);
          }
        } catch (error: any) {
          console.error('❌ Error sending invitation:', error);
          
          // Handle different error types
          const errorMessage = error.message || String(error);
          
          if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
            toast.error('Session expired. Please sign in again.');
          } else if (errorMessage.includes('403') || errorMessage.includes('Only super admin')) {
            toast.error('Access denied. Only super admin can send invitations.');
          } else if (errorMessage.includes('already exists')) {
            toast.error('A user or invitation with this email already exists.');
          } else {
            toast.error(`Failed to send invitation: ${errorMessage}`);
          }
          return;
        }
      }

      // Reset form
      setNewTeamMember({
        name: '',
        role: 'Admin', // Default to Admin
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

      console.log('💾 Saving admin settings via backend...');
      const settingsData = {
        appointment_duration: appointmentDuration,
        timezone: timezone,
        date_format: dateFormat,
        language: language,
        appointment_alerts: appointmentAlerts,
        doctor_schedule_updates: doctorScheduleUpdates,
        patient_reminders: patientReminders,
        system_updates: systemUpdates,
      };

      await api.adminSettings.saveSettings(settingsData);

      console.log('✅ Settings saved successfully');
      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('❌ Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    }
  };

  const handleEditProfile = async () => {
    try {
      if (!profileData.fullName.trim()) {
        toast.error('Name cannot be empty');
        return;
      }

      console.log('💾 Saving profile changes:', profileData.fullName);

      const { error } = await updateProfile(profileData.fullName);

      if (error) {
        return; // Error already handled in updateProfile
      }

      // Close modal
      setShowEditProfileModal(false);
      
      // Refresh profile data from backend to reflect changes
      console.log('🔄 Refreshing profile data...');
      await fetchProfile();
      
      console.log('✅ Profile updated and refreshed');
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

  // Use table sort hook for column sorting
  const { sortedData: sortedTeamMembers, handleSort, getSortDirection } = useTableSort<TeamMember>(
    teamMembers
  );

  const handleExportToExcel = () => {
    const exportData = sortedTeamMembers.map((member) => ({
      'Name': member.name,
      'Email': member.email || 'N/A',
      'Role': member.role,
      'Access Level': member.access_level ? 
        (member.access_level === 'super_admin' ? 'Super Admin' : 
         member.access_level === 'clinic_admin' ? 'Clinic Admin' : 
         'Public User') : 'No Access',
      'Permissions': member.permissions,
      'Status': member.status,
      'Created At': member.created_at ? new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
    }));

    exportToExcel(exportData, 'Team_Members');
    toast.success('Team members data exported successfully!');
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
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleExportToExcel}
                      variant="outline"
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium px-6"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export to Excel
                    </Button>
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
                        <TableSortHeader
                          sortDirection={getSortDirection('name')}
                          onSort={() => handleSort('name')}
                        >
                          Name
                        </TableSortHeader>
                        <TableSortHeader
                          sortDirection={getSortDirection('email')}
                          onSort={() => handleSort('email')}
                        >
                          Email
                        </TableSortHeader>
                        <TableSortHeader
                          sortDirection={getSortDirection('role')}
                          onSort={() => handleSort('role')}
                        >
                          Role
                        </TableSortHeader>
                        <TableSortHeader
                          sortDirection={getSortDirection('access_level')}
                          onSort={() => handleSort('access_level')}
                        >
                          Access Level
                        </TableSortHeader>
                        <TableSortHeader
                          sortDirection={getSortDirection('permissions')}
                          onSort={() => handleSort('permissions')}
                        >
                          Permissions
                        </TableSortHeader>
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
                      ) : sortedTeamMembers.length > 0 ? (
                        sortedTeamMembers.map((member) => (
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
                    role: 'Admin', // Default to Admin
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

        {/* Invitation Link Modal */}
        <Dialog open={showInvitationLinkModal} onOpenChange={setShowInvitationLinkModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Invitation Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Share this link with the team member:
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
                  <strong>Note:</strong> An invitation email has been sent to <strong>{invitedUserEmail}</strong>. 
                  You can also share this link directly with the team member if they didn't receive the email.
                </p>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                onClick={() => {
                  setShowInvitationLinkModal(false);
                  setInvitationLink('');
                  setInvitedUserEmail('');
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

export default AdminSettings;
