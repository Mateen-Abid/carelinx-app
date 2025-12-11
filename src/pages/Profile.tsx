import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { User, Settings, LogOut, ChevronDown, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import FrameIcon from '../assets/Frame 2085662670.svg';
import { AuthPromptModal } from '@/components/AuthPromptModal';

interface Profile {
  full_name: string;
  email: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  government_id?: string;
}

const Profile = () => {
  const { user, signOut, updateProfile, changePassword, deleteAccount } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showContactSupport, setShowContactSupport] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showProfileUpdated, setShowProfileUpdated] = useState(false);

  // Show auth prompt if not logged in
  useEffect(() => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      if (!user) return;
      
      setLoadingProfile(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, gender, date_of_birth, phone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      }
      
      // Initialize profile with user's email, or use fetched data if it exists
      let profileData: Profile = {
        full_name: data?.full_name || '',
        email: data?.email || user.email || '',
        phone: data?.phone || '',
        gender: data?.gender || '',
        date_of_birth: '',
        government_id: ''
      };
      
      // Format date_of_birth for display if it exists
      if (data?.date_of_birth) {
        try {
          const date = new Date(data.date_of_birth);
          if (!isNaN(date.getTime())) {
            profileData.date_of_birth = format(date, 'd MMM yyyy'); // Format as "8 Jan 1998"
          }
        } catch (e) {
          // Keep empty if parsing fails
        }
      }
      
      // Load government_id from localStorage (not stored in database)
      const localProfile = localStorage.getItem('userProfile');
      if (localProfile) {
        try {
          const additionalFields = JSON.parse(localProfile);
          if (additionalFields.government_id) {
            profileData.government_id = additionalFields.government_id;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      setProfile(profileData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load profile');
      // Initialize with just email if fetch fails
      if (user) {
        setProfile({
          full_name: '',
          email: user.email || '',
          phone: '',
          gender: '',
          date_of_birth: '',
          government_id: ''
        });
      }
    } finally {
      setLoadingProfile(false);
    }
  };


  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    const { error } = await changePassword(currentPassword, newPassword);
    
    if (!error) {
      setCurrentPassword('');
      setNewPassword('');
    }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    const { error } = await deleteAccount();
    if (!error) {
      navigate('/auth');
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const formattedDate = format(date, 'd MMM yyyy');
    setProfile(prev => prev ? { ...prev, date_of_birth: formattedDate } : null);
    setShowDatePicker(false);
  };

  const handleProfileUpdate = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      // Prepare date_of_birth for database (convert from display format to ISO format)
      let dateOfBirthForDB = null;
      if (profile.date_of_birth) {
        // If it's in "8 Jan 1998" format, convert it
        const dateStr = profile.date_of_birth;
        if (dateStr.includes(' ')) {
          // Parse "8 Jan 1998" format
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            dateOfBirthForDB = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
          }
        } else {
          // Already in ISO format
          dateOfBirthForDB = dateStr;
        }
      }
      
      // Update profile in Supabase (including gender, date_of_birth, and phone if columns exist)
      const updateData: any = {
        full_name: profile.full_name
      };
      
      // Add optional fields if they exist
      if (profile.gender) {
        updateData.gender = profile.gender;
      }
      if (dateOfBirthForDB) {
        updateData.date_of_birth = dateOfBirthForDB;
      }
      if (profile.phone) {
        updateData.phone = profile.phone;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
      } else {
        // Still store government_id in localStorage (not in database)
        if (profile.government_id) {
          const localProfile = localStorage.getItem('userProfile');
          const additionalFields = localProfile ? JSON.parse(localProfile) : {};
          localStorage.setItem('userProfile', JSON.stringify({
            ...additionalFields,
            government_id: profile.government_id
          }));
        }
        
        setShowProfileUpdated(true);
        toast.success('Profile updated successfully');
        // Refresh profile data
        fetchProfile();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">Loading profile...</div>
        </div>
      </div>
    );
  }

  // Show auth prompt modal if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
        <Header />
        <AuthPromptModal
          isOpen={showAuthPrompt}
          onClose={() => {
            setShowAuthPrompt(false);
            navigate('/');
          }}
          message="Please sign in to access your profile"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Header />
      
      {/* Blue Header Section */}
      <section className="bg-[#0C2243] text-white py-4 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Your Profile</h1>
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-[#0C2243]" />
            </div>
          </div>
        </div>
      </section>

      {/* Profile Form Section */}
      <section className="py-4 px-4 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <form className="space-y-4">
            {/* Full Name */}
            <div>
              <Label htmlFor="fullName" className="text-sm font-medium text-gray-900 mb-2 block">
                Full Name*
              </Label>
              <Input
                id="fullName"
                type="text"
                value={profile?.full_name || ''}
                onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                className="bg-gray-100 border-0 rounded-lg px-4 py-3 text-gray-900"
                placeholder="Muhammad Ali"
              />
            </div>

            {/* Phone Number */}
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-900 mb-2 block">
                Phone number*
              </Label>
              <Input
                id="phone"
                type="tel"
                value={profile?.phone || ''}
                onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                className="bg-gray-100 border-0 rounded-lg px-4 py-3 text-gray-600"
                placeholder="966 - 5xxxxxxxxx"
              />
        </div>

            {/* Email */}
                  <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-900 mb-2 block">
                      Your Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ''}
                      disabled
                className="bg-gray-100 border-0 rounded-lg px-4 py-3 text-gray-600"
                placeholder="olivia@untitledui.com"
              />
            </div>

            {/* Gender and Date of Birth Row */}
            <div className="flex gap-4">
              {/* Gender */}
              <div className="flex-1">
                <Label htmlFor="gender" className="text-sm font-medium text-gray-900 mb-2 block">
                  Gender
                </Label>
                <div className="relative">
                  <select
                    id="gender"
                    value={profile?.gender || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, gender: e.target.value } : null)}
                    className="bg-gray-100 border-0 rounded-lg px-4 py-3 text-gray-900 pr-10 appearance-none cursor-pointer w-full"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                    <span className="text-gray-500">♂</span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Date of Birth */}
              <div className="flex-1">
                <Label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-900 mb-2 block">
                  Date of Birth
                </Label>
                <div className="relative">
                  <Input
                    id="dateOfBirth"
                    type="text"
                    value={profile?.date_of_birth || ''}
                    readOnly
                    onClick={() => setShowDatePicker(true)}
                    className="bg-gray-100 border-0 rounded-lg px-4 py-3 text-gray-900 pr-10 cursor-pointer"
                    placeholder="8 Jan 1998"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                </div>
              </div>
                  </div>
                  
            {/* Government ID */}
                  <div>
              <Label htmlFor="governmentId" className="text-sm font-medium text-gray-900 mb-2 block">
                Government ID
                    </Label>
                    <Input
                id="governmentId"
                      type="text"
                value={profile?.government_id || ''}
                onChange={(e) => setProfile(prev => prev ? { ...prev, government_id: e.target.value } : null)}
                className="bg-gray-100 border-0 rounded-lg px-4 py-3 text-gray-600"
                placeholder="XXXXXXXXXX"
                    />
                  </div>

            {/* Update Button */}
            <div className="pt-4">
              <Button
                type="button"
                onClick={handleProfileUpdate}
                disabled={loading}
                className="w-full bg-[#0C2243] hover:bg-[#0C2243]/90 text-white rounded-lg py-3 text-sm font-medium"
              >
                {loading ? 'Updating...' : 'Update'}
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full bg-white border border-gray-300 text-[#0C2243] hover:bg-gray-50 rounded-full py-3"
                onClick={() => setShowContactSupport(true)}
              >
                Contact Support
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full bg-white border border-gray-300 text-[#0C2243] hover:bg-gray-50 rounded-full py-3"
                onClick={() => {
                  setCurrentPassword('');
                  setNewPassword('');
                  setShowChangePassword(true);
                }}
              >
                Change Password
                  </Button>
            </div>
                </form>
        </div>
      </section>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-auto m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Select Date of Birth</h3>
              <button
                onClick={() => setShowDatePicker(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Simple Date Picker */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  value={selectedDate?.getFullYear() || new Date().getFullYear() - 25}
                  onChange={(e) => {
                    const year = parseInt(e.target.value);
                    const currentDate = selectedDate || new Date();
                    setSelectedDate(new Date(year, currentDate.getMonth(), currentDate.getDate()));
                  }}
                >
                  {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  value={selectedDate?.getMonth() || 0}
                  onChange={(e) => {
                    const month = parseInt(e.target.value);
                    const currentDate = selectedDate || new Date();
                    setSelectedDate(new Date(currentDate.getFullYear(), month, currentDate.getDate()));
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => i).map(month => (
                    <option key={month} value={month}>
                      {new Date(0, month).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  value={selectedDate?.getDate() || 1}
                  onChange={(e) => {
                    const day = parseInt(e.target.value);
                    const currentDate = selectedDate || new Date();
                    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                  }}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDatePicker(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const date = selectedDate || new Date();
                  handleDateSelect(date);
                }}
                className="flex-1 bg-[#0C2243] hover:bg-[#0C2243]/90"
              >
                Select Date
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Support Modal */}
      {showContactSupport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-xs w-full mx-4 py-6 px-5">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14">
                <img
                  src={FrameIcon}
                  alt="Help Icon"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-bold text-gray-900 text-center mb-6">
              Need Help?
            </h3>
            
            {/* Body Text */}
            <div className="text-center mb-8">
              <p className="text-sm text-gray-600 mb-2">
                Our support team is here for you. Please reach out via email:
              </p>
              <a 
                href="mailto:support@domain.com"
                className="text-sm text-blue-600 underline hover:text-blue-800 transition-colors"
              >
                support@domain.com
              </a>
              <p className="text-sm text-gray-600 mt-2">
                We'll get back to you as soon as possible.
              </p>
            </div>
            
            {/* Cancel Button */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowContactSupport(false)}
                className="bg-white border border-[#0C2243] text-[#0C2243] hover:bg-gray-50 rounded-lg px-8 py-2"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-auto m-4">
            {/* Title */}
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Change Password
            </h3>
            
            {/* Form */}
            <form onSubmit={handlePasswordChange} className="space-y-6">
              {/* Current Password */}
                  <div>
                <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-900 mb-2 block">
                      Current Password
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholder="**********"
                    />
                  </div>
                  
              {/* New Password */}
                  <div>
                <Label htmlFor="newPassword" className="text-sm font-medium text-gray-900 mb-2 block">
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  placeholder="***********"
                    />
                  </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                  }}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg py-3"
                >
                  Cancel
                  </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#0C2243] hover:bg-[#0C2243]/90 text-white rounded-lg py-3"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                  </Button>
          </div>
                </form>
        </div>
          </div>
      )}

      {/* Profile Updated Modal */}
      {showProfileUpdated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-auto m-4">
            {/* Title */}
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-6">
              Profile Updated
            </h3>
            
            {/* Body Text */}
            <div className="text-center mb-8">
              <p className="text-gray-600">
                Your profile has been successfully updated.
              </p>
            </div>
            
            {/* OK Button */}
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={() => setShowProfileUpdated(false)}
                className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white rounded-lg px-8 py-2"
              >
                OK
                    </Button>
          </div>
        </div>
      </div>
      )}

      {/* Bottom Navigation - Mobile Only */}
      <BottomNavigation 
        viewMode="services" 
        onViewModeChange={() => {}} 
      />
    </div>
  );
};

export default Profile;