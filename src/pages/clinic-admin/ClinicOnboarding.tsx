import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Upload, Mountain, ArrowLeft, ArrowRight } from 'lucide-react';

type OnboardingStep = 'clinic-info' | 'contact-details' | 'operating-hours';

const ClinicOnboarding = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  
  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('clinic-info');
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null); // Store clinic ID after Step 1

  // Step 1: Clinic Information
  const [clinicInfo, setClinicInfo] = useState({
    logo: null as File | null,
    logoPreview: null as string | null,
    name: '',
    specialties: [] as string[],
    description: '',
  });

  // Step 2: Contact Details
  const [contactDetails, setContactDetails] = useState({
    email: user?.email || '',
    phone: '',
    address: '',
    country: '',
  });

  // Step 3: Operating Hours
  const [operatingHours, setOperatingHours] = useState<{
    [key: number]: { opening: string; closing: string; isClosed: boolean }
  }>({
    0: { opening: '', closing: '', isClosed: false }, // Sunday
    1: { opening: '', closing: '', isClosed: false }, // Monday
    2: { opening: '', closing: '', isClosed: false }, // Tuesday
    3: { opening: '', closing: '', isClosed: false }, // Wednesday
    4: { opening: '', closing: '', isClosed: false }, // Thursday
    5: { opening: '', closing: '', isClosed: false }, // Friday
    6: { opening: '', closing: '', isClosed: false }, // Saturday
  });

  // Debug logging
  useEffect(() => {
    console.log('🔍 ClinicOnboarding Component Mounted');
    console.log('👤 User:', user?.id, user?.email);
    console.log('🎭 UserRole:', userRole);
    console.log('💾 localStorage role:', localStorage.getItem('userRole'));
  }, []);

  // Check if user should access this page
  useEffect(() => {
    let isMounted = true;
    
    const checkAccess = async () => {
      try {
        console.log('🔍 ClinicOnboarding: Checking access...', { user: user?.id, userRole });
        
        // Wait a bit for userRole to load if user exists but role doesn't
        if (user && !userRole) {
          console.log('⏳ Waiting for userRole to load...');
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        if (!isMounted) return;

        if (!user) {
          console.log('❌ ClinicOnboarding: No user, redirecting to auth');
          navigate('/auth', { replace: true });
          return;
        }

        // Check localStorage as fallback for role
        const storedRole = localStorage.getItem('userRole');
        const effectiveRole = userRole || storedRole;
        
        console.log('👤 Effective role:', effectiveRole, 'from userRole:', userRole, 'from localStorage:', storedRole);

        if (effectiveRole !== 'clinic_admin') {
          console.log('❌ ClinicOnboarding: User is not clinic_admin, role:', effectiveRole);
          navigate('/', { replace: true });
          return;
        }

        // Check if clinic already exists and is active
        console.log('🔍 ClinicOnboarding: Checking for existing clinic...');
        const { data: clinic, error } = await supabase
          .from('clinics')
          .select('id, name, status')
          .eq('clinic_admin_id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        console.log('📋 ClinicOnboarding: Clinic check result:', { clinic, error });

        if (error) {
          console.error('❌ ClinicOnboarding: Error checking clinic:', error);
          // Still allow access - might be RLS issue, but user should be able to create clinic
          if (isMounted) setCheckingAccess(false);
          return;
        }

        // If clinic exists and is active, redirect to dashboard
        if (clinic && clinic.status === 'active') {
          console.log('✅ ClinicOnboarding: Clinic already active, redirecting to dashboard');
          navigate('/clinic-admin/dashboard', { replace: true });
          return;
        }

        // If clinic exists but pending, load it
        if (clinic && clinic.status === 'pending') {
          setClinicId(clinic.id);
        }

        // Allow access if no clinic or status is pending
        console.log('✅ ClinicOnboarding: Access granted - no clinic or pending status');
        if (isMounted) setCheckingAccess(false);
      } catch (error) {
        console.error('❌ ClinicOnboarding: Error in checkAccess:', error);
        // On error, still allow access (better UX)
        if (isMounted) setCheckingAccess(false);
      }
    };

    // Always try to check access, even if user/userRole not loaded yet
    checkAccess();

    // Timeout fallback - if still checking after 5 seconds, allow access
    const timeout = setTimeout(() => {
      if (isMounted && checkingAccess) {
        console.log('⏰ Timeout: Allowing access after 5 seconds');
        setCheckingAccess(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [user, userRole, navigate, checkingAccess]);

  // Update contactDetails email when user changes
  useEffect(() => {
    if (user?.email && !contactDetails.email) {
      setContactDetails(prev => ({ ...prev, email: user.email || '' }));
    }
  }, [user?.email]);

  // NOW we can have conditional returns after all hooks are declared
  if (checkingAccess) {
    return (
      <ProtectedRoute allowedRoles={['clinic_admin']}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Checking access...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Available specialties
  const availableSpecialties = [
    'Cardiology',
    'Dermatology',
    'Dental',
    'Endocrinology',
    'Gastroenterology',
    'General Practice',
    'Gynecology',
    'Neurology',
    'Oncology',
    'Orthopedics',
    'Pediatrics',
    'Psychiatry',
    'Pulmonology',
    'Urology',
  ];

  // Countries list
  const countries = [
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'France',
    'Italy',
    'Spain',
    'Netherlands',
    'Belgium',
    'Switzerland',
    'Austria',
    'Sweden',
    'Norway',
    'Denmark',
    'Finland',
    'Poland',
    'Portugal',
    'Greece',
    'Ireland',
    'New Zealand',
    'Japan',
    'South Korea',
    'Singapore',
    'Malaysia',
    'Thailand',
    'India',
    'China',
    'United Arab Emirates',
    'Saudi Arabia',
    'South Africa',
    'Brazil',
    'Mexico',
    'Argentina',
    'Chile',
    'Other',
  ];

  // Time slots for operating hours (display format)
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour.toString().padStart(2, '0')}:${minute} ${period}`;
  });

  // Convert display time (12-hour) to database time (24-hour HH:MM:SS)
  const convertToDatabaseTime = (displayTime: string): string | null => {
    if (!displayTime) return null;
    const [time, period] = displayTime.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes}:00`;
  };

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setClinicInfo(prev => ({
        ...prev,
        logo: file,
        logoPreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleSpecialtySelect = (value: string) => {
    setClinicInfo(prev => {
      if (prev.specialties.includes(value)) {
        return prev;
      }
      return { ...prev, specialties: [...prev.specialties, value] };
    });
  };

  const handleSpecialtyRemove = (value: string) => {
    setClinicInfo(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== value),
    }));
  };

  const uploadLogoToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      const filePath = `clinic-logos/${fileName}`;

      console.log('📤 Uploading logo to storage...', { filePath, bucket: 'clinic-assets' });

      const { data, error } = await supabase.storage
        .from('clinic-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('❌ Error uploading logo:', error);
        
        // Provide more specific error messages
        if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
          toast.error('Storage bucket not found. Please create "clinic-assets" bucket in Supabase Storage.');
          console.error('💡 Solution: Create a storage bucket named "clinic-assets" in Supabase Dashboard → Storage');
        } else if (error.message?.includes('new row violates row-level security')) {
          toast.error('Permission denied. Please check storage bucket policies.');
          console.error('💡 Solution: Update storage bucket policies to allow authenticated users to upload');
        } else {
          toast.error(`Failed to upload logo: ${error.message || 'Unknown error'}`);
        }
        return null;
      }

      if (!data) {
        console.error('❌ No data returned from upload');
        toast.error('Failed to upload logo: No data returned');
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('clinic-assets')
        .getPublicUrl(filePath);

      console.log('✅ Logo uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error: any) {
      console.error('❌ Error in uploadLogoToStorage:', error);
      toast.error(`Failed to upload logo: ${error.message || 'Unknown error'}`);
      return null;
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 'clinic-info') {
      // Validate Step 1
      if (!clinicInfo.name.trim()) {
        toast.error('Please enter clinic name');
        return;
      }
      if (clinicInfo.specialties.length === 0) {
        toast.error('Please select at least one specialty');
        return;
      }
      if (!clinicInfo.description.trim()) {
        toast.error('Please enter clinic description');
        return;
      }

      setLoading(true);
      try {
        let logoUrl = null;

        // Upload logo if provided (but don't block if it fails - make it optional)
        if (clinicInfo.logo) {
          console.log('📤 Attempting to upload logo...');
          logoUrl = await uploadLogoToStorage(clinicInfo.logo);
          if (!logoUrl) {
            // Logo upload failed, but allow user to continue without logo
            console.warn('⚠️ Logo upload failed, but continuing without logo');
            toast.warning('Logo upload failed. You can continue without a logo or try again later.');
            // Don't return - allow them to proceed without logo
          }
        }

        // Create or update clinic in database
        if (clinicId) {
          // Update existing clinic
          const { error } = await supabase
            .from('clinics')
            .update({
              name: clinicInfo.name,
              description: clinicInfo.description,
              specialties: clinicInfo.specialties,
              logo_url: logoUrl || undefined,
            })
            .eq('id', clinicId);

          if (error) throw error;
        } else {
          // Create new clinic
          const { data: clinic, error } = await supabase
            .from('clinics')
            .insert({
              name: clinicInfo.name,
              email: user?.email || '',
              address: '', // Will be filled in Step 2
              description: clinicInfo.description,
              specialties: clinicInfo.specialties,
              logo_url: logoUrl,
              clinic_admin_id: user?.id,
              status: 'pending',
            })
            .select()
            .single();

          if (error) throw error;
          setClinicId(clinic.id);
        }

        toast.success('Clinic information saved!');
        setCurrentStep('contact-details');
      } catch (error: any) {
        console.error('Error saving clinic info:', error);
        toast.error('Failed to save clinic information: ' + error.message);
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 'contact-details') {
      // Validate Step 2
      if (!contactDetails.email.trim()) {
        toast.error('Please enter clinic email');
        return;
      }
      if (!contactDetails.phone.trim()) {
        toast.error('Please enter phone number');
        return;
      }
      if (!contactDetails.address.trim()) {
        toast.error('Please enter clinic address');
        return;
      }
      if (!contactDetails.country) {
        toast.error('Please select country');
        return;
      }

      if (!clinicId) {
        toast.error('Clinic not found. Please go back and complete Step 1.');
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase
          .from('clinics')
          .update({
            email: contactDetails.email,
            contact_phone: contactDetails.phone,
            contact_email: contactDetails.email,
            address: contactDetails.address,
            country: contactDetails.country,
          })
          .eq('id', clinicId);

        if (error) throw error;

        toast.success('Contact details saved!');
        setCurrentStep('operating-hours');
      } catch (error: any) {
        console.error('Error saving contact details:', error);
        toast.error('Failed to save contact details: ' + error.message);
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 'operating-hours') {
      // Validate Step 3 - at least one day should have hours
      const hasHours = Object.values(operatingHours).some(
        hours => !hours.isClosed && hours.opening && hours.closing
      );

      if (!hasHours) {
        toast.error('Please set operating hours for at least one day');
        return;
      }

      if (!clinicId) {
        toast.error('Clinic not found. Please start over.');
        return;
      }

      setLoading(true);
      try {
        // Delete existing operating hours
        await supabase
          .from('clinic_operating_hours')
          .delete()
          .eq('clinic_id', clinicId);

        // Insert new operating hours (convert display time to database time)
        const hoursToInsert = daysOfWeek.map(day => ({
          clinic_id: clinicId,
          day_of_week: day.value,
          opening_time: operatingHours[day.value].isClosed 
            ? null 
            : convertToDatabaseTime(operatingHours[day.value].opening),
          closing_time: operatingHours[day.value].isClosed 
            ? null 
            : convertToDatabaseTime(operatingHours[day.value].closing),
          is_closed: operatingHours[day.value].isClosed,
        }));

        const { error: hoursError } = await supabase
          .from('clinic_operating_hours')
          .insert(hoursToInsert);

        if (hoursError) throw hoursError;

        // Activate clinic
        const { error: updateError } = await supabase
          .from('clinics')
          .update({ status: 'active' })
          .eq('id', clinicId);

        if (updateError) throw updateError;

        toast.success('Clinic onboarding completed successfully!');
        
        // Redirect to dashboard
        setTimeout(() => {
          navigate('/clinic-admin/dashboard', { replace: true });
        }, 1500);
      } catch (error: any) {
        console.error('Error saving operating hours:', error);
        toast.error('Failed to save operating hours: ' + error.message);
        setLoading(false);
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'contact-details') {
      setCurrentStep('clinic-info');
    } else if (currentStep === 'operating-hours') {
      setCurrentStep('contact-details');
    }
  };

  const getStepNumber = (step: OnboardingStep): number => {
    const steps: OnboardingStep[] = ['clinic-info', 'contact-details', 'operating-hours'];
    return steps.indexOf(step) + 1;
  };

  const getTotalSteps = (): number => 3;

  // Render the page - ProtectedRoute will handle access control
  return (
    <ProtectedRoute allowedRoles={['clinic_admin']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#00FFA2] rounded-full"></div>
                <div className="w-3 h-3 bg-[#00FFA2] rounded-full"></div>
              </div>
              <span className="text-2xl font-bold">
                <span className="text-[#0C2243] dark:text-white">care</span>
                <span className="text-[#00FFA2]">linx</span>
              </span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Clinic Onboarding
          </h1>

          {/* Progress Indicator */}
          <div className="flex gap-2 mb-8 justify-center">
            {[1, 2, 3].map((step) => {
              const stepIndex = step - 1;
              const steps: OnboardingStep[] = ['clinic-info', 'contact-details', 'operating-hours'];
              const isActive = steps.indexOf(currentStep) >= stepIndex;
              
              return (
                <div
                  key={step}
                  className={`h-1 flex-1 rounded ${
                    isActive
                      ? 'bg-[#0C2243] dark:bg-[#00FFA2]'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              );
            })}
          </div>

          {/* Step 1: Clinic Information */}
          {currentStep === 'clinic-info' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white uppercase">
                CLINIC INFORMATION
              </h2>

              {/* Clinic Logo */}
              <div>
                <Label htmlFor="logo" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  Clinic Logo
                </Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-700">
                    {clinicInfo.logoPreview ? (
                      <img
                        src={clinicInfo.logoPreview}
                        alt="Clinic logo preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Mountain className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      id="logo"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo')?.click()}
                      className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload logo
                    </Button>
                  </div>
                </div>
              </div>

              {/* Clinic Name */}
              <div>
                <Label htmlFor="name" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  Clinic Name
                </Label>
                <Input
                  id="name"
                  placeholder="Enter clinic name"
                  value={clinicInfo.name}
                  onChange={(e) =>
                    setClinicInfo(prev => ({ ...prev, name: e.target.value }))
                  }
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Specialties */}
              <div>
                <Label htmlFor="specialties" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  Specialties
                </Label>
                <Select
                  value=""
                  onValueChange={handleSpecialtySelect}
                >
                  <SelectTrigger
                    id="specialties"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  >
                    <SelectValue placeholder="Select specialties" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800">
                    {availableSpecialties
                      .filter(specialty => !clinicInfo.specialties.includes(specialty))
                      .map((specialty) => (
                        <SelectItem
                          key={specialty}
                          value={specialty}
                          className="dark:text-white cursor-pointer"
                        >
                          {specialty}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {clinicInfo.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {clinicInfo.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="px-3 py-1 bg-[#0C2243] dark:bg-[#00FFA2] text-white dark:text-[#0C2243] rounded-full text-sm flex items-center gap-2"
                      >
                        {specialty}
                        <button
                          type="button"
                          onClick={() => handleSpecialtyRemove(specialty)}
                          className="hover:opacity-70 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Enter clinic description"
                  value={clinicInfo.description}
                  onChange={(e) =>
                    setClinicInfo(prev => ({ ...prev, description: e.target.value }))
                  }
                  rows={4}
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>
          )}

          {/* Step 2: Contact Details */}
          {currentStep === 'contact-details' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white uppercase">
                CONTACT DETAILS
              </h2>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter clinic email"
                  value={contactDetails.email}
                  onChange={(e) =>
                    setContactDetails(prev => ({ ...prev, email: e.target.value }))
                  }
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={contactDetails.phone}
                  onChange={(e) =>
                    setContactDetails(prev => ({ ...prev, phone: e.target.value }))
                  }
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  Address
                </Label>
                <Input
                  id="address"
                  placeholder="Enter clinic address"
                  value={contactDetails.address}
                  onChange={(e) =>
                    setContactDetails(prev => ({ ...prev, address: e.target.value }))
                  }
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Country */}
              <div>
                <Label htmlFor="country" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  Country
                </Label>
                <Select
                  value={contactDetails.country}
                  onValueChange={(value) =>
                    setContactDetails(prev => ({ ...prev, country: value }))
                  }
                >
                  <SelectTrigger
                    id="country"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  >
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 max-h-[300px]">
                    {countries.map((country) => (
                      <SelectItem
                        key={country}
                        value={country}
                        className="dark:text-white cursor-pointer"
                      >
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Operating Hours */}
          {currentStep === 'operating-hours' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white uppercase">
                OPERATING HOURS
              </h2>

              <div className="space-y-4">
                {daysOfWeek.map((day) => (
                  <div
                    key={day.value}
                    className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {day.label}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <Select
                        value={operatingHours[day.value].opening}
                        onValueChange={(value) =>
                          setOperatingHours(prev => ({
                            ...prev,
                            [day.value]: { ...prev[day.value], opening: value },
                          }))
                        }
                        disabled={operatingHours[day.value].isClosed}
                      >
                        <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 max-h-[300px]">
                          {timeSlots.map((time) => (
                            <SelectItem
                              key={time}
                              value={time}
                              className="dark:text-white cursor-pointer"
                            >
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={operatingHours[day.value].closing}
                        onValueChange={(value) =>
                          setOperatingHours(prev => ({
                            ...prev,
                            [day.value]: { ...prev[day.value], closing: value },
                          }))
                        }
                        disabled={operatingHours[day.value].isClosed}
                      >
                        <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 max-h-[300px]">
                          {timeSlots.map((time) => (
                            <SelectItem
                              key={time}
                              value={time}
                              className="dark:text-white cursor-pointer"
                            >
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setOperatingHours(prev => ({
                          ...prev,
                          [day.value]: {
                            ...prev[day.value],
                            isClosed: !prev[day.value].isClosed,
                            opening: !prev[day.value].isClosed ? prev[day.value].opening : '',
                            closing: !prev[day.value].isClosed ? prev[day.value].closing : '',
                          },
                        }))
                      }
                      className={`${
                        operatingHours[day.value].isClosed
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {operatingHours[day.value].isClosed ? 'Closed' : 'Open'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            <Button
              onClick={handlePreviousStep}
              disabled={currentStep === 'clinic-info' || loading}
              variant="outline"
              className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={handleNextStep}
              disabled={loading}
              className="bg-[#0C2243] dark:bg-[#00FFA2] text-white dark:text-[#0C2243] hover:bg-[#0a1a35] dark:hover:bg-[#00e68a] px-8 py-2 rounded-lg font-medium"
            >
              {loading ? 'Saving...' : currentStep === 'operating-hours' ? 'Complete' : 'Next'}
              {!loading && currentStep !== 'operating-hours' && (
                <ArrowRight className="w-4 h-4 ml-2" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default ClinicOnboarding;
