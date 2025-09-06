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
import { User, Settings, LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  full_name: string;
  email: string;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const { user, signOut, updateProfile, changePassword, deleteAccount } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth?message=Please sign in to access your profile');
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    const { error } = await updateProfile(profile.full_name);
    
    if (!error) {
      toast.success('Profile updated successfully');
    }
    setLoading(false);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 pb-20 sm:pb-8">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Your Profile</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage your personal information and keep your details up to date.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User size={16} />
                <span className="truncate">{profile?.full_name || 'Loading...'}</span>
              </div>
              <span className="text-muted-foreground text-xs sm:text-sm truncate">{profile?.email}</span>
            </div>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="flex-1 sm:flex-none">
                <Settings size={16} />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} className="flex-1 sm:flex-none">
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4 sm:space-y-6">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">
                      Your Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="mt-1 bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This can't be changed.
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="fullName" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={profile?.full_name || ''}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                      className="mt-1"
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                    {loading ? 'Updating...' : 'Update Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Change Password</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4 sm:space-y-6">
                  <div>
                    <Label htmlFor="currentPassword" className="text-sm font-medium">
                      Current Password
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="newPassword" className="text-sm font-medium">
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="mt-1"
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                    {loading ? 'Changing...' : 'Change Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Delete Account */}
          <div>
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive text-lg sm:text-xl">Delete Account</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Deleting your account will remove all your information from our database. This cannot be undone.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="mx-4 max-w-md sm:mx-auto sm:max-w-lg">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and remove your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="w-full sm:w-auto bg-destructive hover:bg-destructive/90">
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNavigation 
        viewMode="services" 
        onViewModeChange={() => {}} 
      />
    </div>
  );
};

export default Profile;