import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const InviteAcceptance = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      // First try to fetch from super_admin_invitations
      let data: any = null;
      let fetchError: any = null;
      let invitationType: 'super_admin' | 'clinic_admin' = 'super_admin';

      const { data: superAdminData, error: superAdminError } = await supabase
        .from('super_admin_invitations')
        .select('*')
        .eq('invitation_token', token)
        .maybeSingle();

      if (superAdminData) {
        data = superAdminData;
        invitationType = 'super_admin';
      } else if (superAdminError && superAdminError.code !== 'PGRST116') {
        // If error is not "not found", try clinic_admin_invitations
        console.log('🔍 Not found in super_admin_invitations, checking clinic_admin_invitations...');
        
        const { data: clinicAdminData, error: clinicAdminError } = await supabase
          .from('clinic_admin_invitations')
          .select('*')
          .eq('invitation_token', token)
          .maybeSingle();

        if (clinicAdminData) {
          data = clinicAdminData;
          invitationType = 'clinic_admin';
          // Add role_type for doctor invitations
          data.role_type = 'doctor';
        } else if (clinicAdminError) {
          fetchError = clinicAdminError;
        }
      } else {
        // Not found in super_admin_invitations, try clinic_admin_invitations
        console.log('🔍 Not found in super_admin_invitations, checking clinic_admin_invitations...');
        
        const { data: clinicAdminData, error: clinicAdminError } = await supabase
          .from('clinic_admin_invitations')
          .select('*')
          .eq('invitation_token', token)
          .maybeSingle();

        if (clinicAdminData) {
          data = clinicAdminData;
          invitationType = 'clinic_admin';
          // Add role_type for doctor invitations
          data.role_type = 'doctor';
        } else if (clinicAdminError) {
          fetchError = clinicAdminError;
        }
      }

      if (fetchError || !data) {
        console.error('❌ Error fetching invitation:', fetchError);
        setError('Invitation not found or invalid');
        setLoading(false);
        return;
      }

      // Check if invitation is expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }

      // Check if invitation is already accepted
      if (data.status === 'accepted') {
        setError('This invitation has already been accepted');
        setLoading(false);
        return;
      }

      // Check if invitation is cancelled
      if (data.status === 'cancelled') {
        setError('This invitation has been cancelled');
        setLoading(false);
        return;
      }

      setInvitation(data);
      setLoading(false);
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError('Failed to load invitation');
      setLoading(false);
    }
  };

  const handleAcceptInvitation = () => {
    // Navigate to signup page with invitation token and email pre-filled
    navigate(`/auth?mode=signup&invite=${token}&email=${encodeURIComponent(invitation.email)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#00FFA2]" />
            <p className="text-gray-600 dark:text-gray-400">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <Button
              onClick={() => navigate('/auth')}
              className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A202C] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-[#00FFA2]" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You've been invited!</h2>
            <p className="text-gray-600 dark:text-gray-400">
              You've been invited to join CareLinix as a {
                invitation.role_type === 'super_admin' ? 'Super Admin' : 
                invitation.role_type === 'doctor' ? 'Doctor' : 
                'Clinic Admin'
              }.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Name:</span>
                <span className="ml-2 text-sm text-gray-900 dark:text-white">{invitation.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email:</span>
                <span className="ml-2 text-sm text-gray-900 dark:text-white">{invitation.email}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Role:</span>
                <span className="ml-2 text-sm text-gray-900 dark:text-white">
                  {invitation.role_type === 'super_admin' ? 'Super Admin' : 
                   invitation.role_type === 'doctor' ? 'Doctor' : 
                   'Clinic Admin'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleAcceptInvitation}
              className="w-full bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243] font-medium"
            >
              Accept Invitation & Sign Up
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/auth')}
              className="w-full border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            >
              Already have an account? Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteAcceptance;

