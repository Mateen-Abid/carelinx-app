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
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Upload, Mountain, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CarelinxIcon from '@/assets/carelinx-icon.svg';
import LanguageToggle from '@/components/LanguageToggle';

type OnboardingStep = 'clinic-info' | 'contact-details' | 'operating-hours';

const daysOfWeek = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const convertToDatabaseTime = (displayTime: string): string | null => {
  if (!displayTime) return null;
  const [time, period] = displayTime.split(' ');
  const [hours, minutes] = time.split(':');
  let hour24 = parseInt(hours, 10);

  if (period === 'PM' && hour24 !== 12) {
    hour24 += 12;
  } else if (period === 'AM' && hour24 === 12) {
    hour24 = 0;
  }

  return `${hour24.toString().padStart(2, '0')}:${minutes}:00`;
};

const convertToDisplayTime = (dbTime: string | null): string => {
  if (!dbTime) return '';
  const [hours, minutes] = dbTime.split(':');
  const hour = parseInt(hours, 10);
  const minute = (minutes || '00').padStart(2, '0');
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour.toString().padStart(2, '0')}:${minute} ${period}`;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_LOGO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

const dbTimeToMinutes = (dbTime: string | null): number | null => {
  if (!dbTime) return null;
  const [hours, minutes] = dbTime.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const normalizePhoneNumber = (value: string) => value.replace(/\D/g, '').slice(0, 10);

const ClinicOnboarding = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar' || i18n.language.startsWith('ar');
  
  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('clinic-info');
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null); // Store clinic ID after Step 1

  // Step 1: Clinic Information
  const [clinicInfo, setClinicInfo] = useState({
    logo: null as File | null,
    logoPreview: null as string | null,
    logoRemoved: false,
    name: '',
    specialties: [] as string[],
    description: '',
  });

  // Available specialties from super admin
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);

  // Step 2: Contact Details
  const [contactDetails, setContactDetails] = useState({
    email: user?.email || '',
    phone: '',
    city: '',
    district: '',
    street: '',
    addressDetails: '',
    country: 'Saudi Arabia',
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

  // Check if user should access this page and restore incomplete onboarding
  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      if (authLoading) return;

      const storedRole = localStorage.getItem('userRole');
      const effectiveRole = userRole || storedRole;

      if (!user) {
        if (isMounted) setCheckingAccess(false);
        return;
      }

      if (effectiveRole && effectiveRole !== 'clinic_admin') {
        navigate('/', { replace: true });
        return;
      }

      try {
        const { clinic, operatingHours: hoursData } = await api.clinicAdmin.getClinic();
        if (!isMounted) return;

        if (clinic?.status === 'active') {
          navigate('/clinic-admin/dashboard', { replace: true });
          return;
        }

        if (clinic) {
          setClinicId(clinic.id);
          setClinicInfo((prev) => ({
            ...prev,
            name: clinic.name || '',
            specialties: Array.isArray(clinic.specialties) ? clinic.specialties : [],
            description: clinic.description || '',
            logoPreview: clinic.logo_url || prev.logoPreview,
            logoRemoved: false,
          }));
          setContactDetails((prev) => ({
            ...prev,
            email: clinic.contact_email || clinic.email || user?.email || prev.email,
            phone: clinic.contact_phone || '',
            city: clinic.city || '',
            district: clinic.district || '',
            street: clinic.street || '',
            addressDetails: clinic.address_details || clinic.address || '',
            country: clinic.country || 'Saudi Arabia',
          }));

          if (Array.isArray(hoursData) && hoursData.length > 0) {
            setOperatingHours((prev) => {
              const next = { ...prev };
              hoursData.forEach((hour: {
                day_of_week: number;
                opening_time: string | null;
                closing_time: string | null;
                is_closed: boolean;
              }) => {
                next[hour.day_of_week] = {
                  opening: convertToDisplayTime(hour.opening_time),
                  closing: convertToDisplayTime(hour.closing_time),
                  isClosed: !!hour.is_closed,
                };
              });
              return next;
            });
          }
        }
      } catch (error) {
        console.error('ClinicOnboarding: no existing clinic yet', error);
      } finally {
        if (isMounted) setCheckingAccess(false);
      }
    };

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [user, userRole, authLoading, navigate]);

  // Fetch super admin specialties through the backend (client has no Supabase session)
  useEffect(() => {
    const fetchSuperAdminSpecialties = async () => {
      try {
        setLoadingSpecialties(true);
        const { specialties } = await api.services.getSpecialties();
        setAvailableSpecialties((specialties || []).map((s: { name: string }) => s.name));
      } catch (error) {
        console.error('Error fetching super admin specialties:', error);
      } finally {
        setLoadingSpecialties(false);
      }
    };

    fetchSuperAdminSpecialties();
  }, []);

  // Update contactDetails email when user changes
  useEffect(() => {
    if (user?.email) {
      setContactDetails((prev) => (prev.email ? prev : { ...prev, email: user.email || '' }));
    }
  }, [user?.email]);

  // NOW we can have conditional returns after all hooks are declared
  if (checkingAccess || authLoading) {
    return (
      <ProtectedRoute allowedRoles={['clinic_admin']}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center relative">
          <div className="absolute top-4 end-4">
            <LanguageToggle variant="onLight" />
          </div>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{t('Loading...')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">{t('Checking access...')}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Time slots for operating hours (display format)
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour.toString().padStart(2, '0')}:${minute} ${period}`;
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const isAllowedType = ALLOWED_LOGO_TYPES.includes(file.type) || ALLOWED_LOGO_EXTENSIONS.includes(extension);
    if (!isAllowedType) {
      toast.error(t('Please upload a JPG, PNG, WEBP, or GIF image'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('Image size must be less than 5MB'));
      return;
    }

    setClinicInfo((prev) => {
      if (prev.logoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.logoPreview);
      }
      return {
        ...prev,
        logo: file,
        logoPreview: URL.createObjectURL(file),
        logoRemoved: false,
      };
    });
  };

  const handleRemoveLogo = () => {
    setClinicInfo((prev) => {
      if (prev.logoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.logoPreview);
      }
      return {
        ...prev,
        logo: null,
        logoPreview: null,
        logoRemoved: true,
      };
    });
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
      // Convert file to base64 and upload through backend API.
      // This avoids frontend storage RLS failures in onboarding.
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);

      const base64File = await base64Promise;
      const { logo_url } = await api.clinicAdmin.uploadLogo({
        file: base64File,
        fileName: file.name,
        fileType: file.type,
      });

      console.log('✅ Logo uploaded successfully:', logo_url);
      return logo_url;
    } catch (error) {
      console.error('❌ Error in uploadLogoToStorage:', error);
      toast.error(t('Failed to upload logo: {{message}}', { message: getErrorMessage(error) || t('Unknown error') }));
      return null;
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 'clinic-info') {
      if (!clinicInfo.name.trim()) {
        toast.error(t('Please enter clinic name'));
        return;
      }
      if (clinicInfo.specialties.length === 0) {
        toast.error(t('Please select at least one specialty'));
        return;
      }
      if (!clinicInfo.description.trim()) {
        toast.error(t('Please enter clinic description'));
        return;
      }

      setLoading(true);
      try {
        let currentClinicId = clinicId;
        const clinicPayload = {
          name: clinicInfo.name.trim(),
          description: clinicInfo.description.trim(),
          specialties: clinicInfo.specialties,
        };

        // Save clinic first so later steps and logo attach to a real record
        if (currentClinicId) {
          await api.clinicAdmin.updateClinic(clinicPayload);
        } else {
          const { clinic } = await api.clinicAdmin.createClinic({
            ...clinicPayload,
            email: user?.email || contactDetails.email || '',
            address: '',
          });
          currentClinicId = clinic.id;
          setClinicId(clinic.id);
        }

        if (clinicInfo.logo) {
          const logoUrl = await uploadLogoToStorage(clinicInfo.logo);
          if (!logoUrl) {
            toast.error(t('Logo upload failed. Please try a JPG or PNG under 5MB.'));
            return;
          }
          await api.clinicAdmin.updateClinic({ logo_url: logoUrl });
          setClinicInfo((prev) => ({ ...prev, logo: null, logoPreview: logoUrl, logoRemoved: false }));
        } else if (clinicInfo.logoRemoved) {
          await api.clinicAdmin.updateClinic({ logo_url: null });
        }

        toast.success(t('Clinic information saved!'));
        setCurrentStep('contact-details');
      } catch (error) {
        console.error('Error saving clinic info:', error);
        toast.error(t('Failed to save clinic information: {{message}}', { message: getErrorMessage(error) }));
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 'contact-details') {
      // Validate Step 2
      if (!contactDetails.email.trim()) {
        toast.error(t('Please enter clinic email'));
        return;
      }
      if (!contactDetails.phone.trim()) {
        toast.error(t('Please enter phone number'));
        return;
      }
      if (normalizePhoneNumber(contactDetails.phone).length !== 10) {
        toast.error(t('Phone number must be 10 digits'));
        return;
      }
      if (!contactDetails.city.trim()) {
        toast.error(t('Please enter city'));
        return;
      }
      if (!contactDetails.district.trim()) {
        toast.error(t('Please enter district'));
        return;
      }
      if (!contactDetails.street.trim()) {
        toast.error(t('Please enter street'));
        return;
      }
      if (!contactDetails.addressDetails.trim()) {
        toast.error(t('Please enter address details'));
        return;
      }
      if (!clinicId) {
        toast.error(t('Clinic not found. Please go back and complete Step 1.'));
        return;
      }

      setLoading(true);
      try {
        const fullAddress = [
          contactDetails.street.trim(),
          contactDetails.district.trim(),
          contactDetails.city.trim(),
          contactDetails.addressDetails.trim(),
        ].filter(Boolean).join(', ');

        await api.clinicAdmin.updateClinic({
          email: contactDetails.email,
          contact_phone: normalizePhoneNumber(contactDetails.phone),
          contact_email: contactDetails.email,
          city: contactDetails.city.trim(),
          district: contactDetails.district.trim(),
          street: contactDetails.street.trim(),
          address_details: contactDetails.addressDetails.trim(),
          address: fullAddress,
          country: 'Saudi Arabia',
        });

        toast.success(t('Contact details saved!'));
        setCurrentStep('operating-hours');
      } catch (error) {
        console.error('Error saving contact details:', error);
        toast.error(t('Failed to save contact details: {{message}}', { message: getErrorMessage(error) }));
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 'operating-hours') {
      // Validate Step 3 - at least one day should have hours
      const hasHours = Object.values(operatingHours).some(
        hours => !hours.isClosed && hours.opening && hours.closing
      );

      if (!hasHours) {
        toast.error(t('Please set operating hours for at least one day'));
        return;
      }

      const invalidHours = daysOfWeek.find((day) => {
        const hours = operatingHours[day.value];
        if (hours.isClosed || !hours.opening || !hours.closing) return false;
        const openingMinutes = dbTimeToMinutes(convertToDatabaseTime(hours.opening));
        const closingMinutes = dbTimeToMinutes(convertToDatabaseTime(hours.closing));
        return openingMinutes === null || closingMinutes === null || closingMinutes <= openingMinutes;
      });

      if (invalidHours) {
        toast.error(t('Closing time must be after opening time'));
        return;
      }

      if (!clinicId) {
        toast.error(t('Clinic not found. Please start over.'));
        return;
      }

      setLoading(true);
      try {
        // Convert display time to database time and prepare hours
        const hoursToInsert = daysOfWeek.map(day => ({
          day_of_week: day.value,
          opening_time: operatingHours[day.value].isClosed 
            ? null 
            : convertToDatabaseTime(operatingHours[day.value].opening),
          closing_time: operatingHours[day.value].isClosed 
            ? null 
            : convertToDatabaseTime(operatingHours[day.value].closing),
          is_closed: operatingHours[day.value].isClosed,
        }));

        // Update operating hours via backend
        await api.clinicAdmin.updateOperatingHours(hoursToInsert);

        // Activate clinic
        await api.clinicAdmin.updateClinic({ status: 'active' });

        toast.success(t('Clinic onboarding completed successfully!'));
        
        // Redirect to dashboard
        setTimeout(() => {
          navigate('/clinic-admin/dashboard', { replace: true });
        }, 1500);
      } catch (error) {
        console.error('Error saving operating hours:', error);
        toast.error(t('Failed to save operating hours: {{message}}', { message: getErrorMessage(error) }));
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
          {/* Logo + language switcher */}
          <div className="relative mb-6">
            <div className="flex justify-center">
              <div className="flex items-center gap-2">
                <img
                  src={CarelinxIcon}
                  alt="Carelinx icon"
                  className="h-8 w-8"
                />
                <span className="text-2xl font-bold leading-none">
                  <span className="text-[#0C2243] dark:text-white">care</span>
                  <span className="text-[#00FFA2]">linx</span>
                </span>
              </div>
            </div>
            <div className="absolute top-0 end-0">
              <LanguageToggle variant="onLight" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-6">
            {t('Clinic Onboarding')}
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
                {t('CLINIC INFORMATION')}
              </h2>

              {/* Clinic Logo */}
              <div>
                <Label className="text-gray-700 dark:text-gray-300 mb-2 block">
                  {t('Clinic Logo')}
                </Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-lg bg-[#00FFA2] border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {clinicInfo.logoPreview ? (
                      <img
                        src={clinicInfo.logoPreview}
                        alt={t('Clinic logo preview')}
                        className="max-h-full max-w-full object-contain p-1.5"
                      />
                    ) : clinicInfo.name.trim() ? (
                      <span className="text-[#0C2243] text-xl font-bold">
                        {clinicInfo.name.trim().charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <Mountain className="w-7 h-7 text-[#0C2243]/50" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="file"
                      id="clinic-onboarding-logo"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      onChange={handleLogoUpload}
                      className="sr-only"
                    />
                    <Button
                      asChild
                      variant="outline"
                      className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                    >
                      <label htmlFor="clinic-onboarding-logo">
                        <Upload className="w-4 h-4 me-2" />
                        {clinicInfo.logoPreview ? t('Change logo') : t('Upload logo')}
                      </label>
                    </Button>
                    {clinicInfo.logoPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveLogo}
                        className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="w-4 h-4 me-2" />
                        {t('Remove logo')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Clinic Name */}
              <div>
                <Label htmlFor="name" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  {t('Clinic Name')}
                </Label>
                <Input
                  id="name"
                  placeholder={t('Enter clinic name')}
                  value={clinicInfo.name}
                  onChange={(e) =>
                    setClinicInfo((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Specialties */}
              <div>
                <Label htmlFor="specialties" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  {t('Specialties')}
                </Label>
                <Select
                  value=""
                  onValueChange={handleSpecialtySelect}
                >
                  <SelectTrigger
                    id="specialties"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                  >
                    <SelectValue placeholder={t('Select specialties')} />
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
                {loadingSpecialties && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('Loading specialties...')}</p>
                )}
                {!loadingSpecialties && availableSpecialties.length === 0 && (
                  <p className="text-sm text-red-500 mt-2">
                    {t('No specialties available yet. Please contact the platform admin.')}
                  </p>
                )}
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
                  {t('Description')}
                </Label>
                <Textarea
                  id="description"
                  placeholder={t('Enter clinic description')}
                  value={clinicInfo.description}
                  onChange={(e) =>
                    setClinicInfo((prev) => ({ ...prev, description: e.target.value }))
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
                {t('CONTACT DETAILS')}
              </h2>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  {t('Email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('Enter clinic email')}
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
                  {t('Phone')}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t('Enter phone number')}
                  value={contactDetails.phone}
                  onChange={(e) =>
                    setContactDetails(prev => ({ ...prev, phone: normalizePhoneNumber(e.target.value) }))
                  }
                  inputMode="numeric"
                  maxLength={10}
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* City */}
              <div>
                <Label htmlFor="city" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  {t('City')}
                </Label>
                <Input
                  id="city"
                  placeholder={t('Enter city')}
                  value={contactDetails.city}
                  onChange={(e) =>
                    setContactDetails((prev) => ({ ...prev, city: e.target.value }))
                  }
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* District */}
              <div>
                <Label htmlFor="district" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  {t('District')}
                </Label>
                <Input
                  id="district"
                  placeholder={t('Enter district')}
                  value={contactDetails.district}
                  onChange={(e) =>
                    setContactDetails((prev) => ({ ...prev, district: e.target.value }))
                  }
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Street */}
              <div>
                <Label htmlFor="street" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  {t('Street')}
                </Label>
                <Input
                  id="street"
                  placeholder={t('Enter street')}
                  value={contactDetails.street}
                  onChange={(e) =>
                    setContactDetails((prev) => ({ ...prev, street: e.target.value }))
                  }
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Address Details */}
              <div>
                <Label htmlFor="addressDetails" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  {t('Address Details')}
                </Label>
                <Textarea
                  id="addressDetails"
                  placeholder={t('Enter address details')}
                  value={contactDetails.addressDetails}
                  onChange={(e) =>
                    setContactDetails((prev) => ({ ...prev, addressDetails: e.target.value }))
                  }
                  rows={4}
                  className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Country (fixed) */}
              <div>
                <Label htmlFor="country" className="text-gray-700 dark:text-gray-300 mb-2 block">
                  {t('Country')}
                </Label>
                <Input
                  id="country"
                  value={t('Saudi Arabia')}
                  disabled
                  className="bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Step 3: Operating Hours */}
          {currentStep === 'operating-hours' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white uppercase">
                {t('OPERATING HOURS')}
              </h2>

              <div className="space-y-4">
                {daysOfWeek.map((day) => (
                  <div
                    key={day.value}
                    className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="w-28 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t(day.label)}
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
                          <SelectValue placeholder={t('Select time')} />
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
                          <SelectValue placeholder={t('Select time')} />
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
                      {operatingHours[day.value].isClosed ? t('Closed') : t('Open')}
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
              {isRtl ? <ArrowRight className="w-4 h-4 ms-0 me-2" /> : <ArrowLeft className="w-4 h-4 me-2" />}
              {t('Previous')}
            </Button>
            <Button
              onClick={handleNextStep}
              disabled={loading}
              className="bg-[#0C2243] dark:bg-[#00FFA2] text-white dark:text-[#0C2243] hover:bg-[#0a1a35] dark:hover:bg-[#00e68a] px-8 py-2 rounded-lg font-medium"
            >
              {loading ? t('Saving...') : currentStep === 'operating-hours' ? t('Complete') : t('Next')}
              {!loading && currentStep !== 'operating-hours' && (
                isRtl ? <ArrowLeft className="w-4 h-4 ms-2" /> : <ArrowRight className="w-4 h-4 ms-2" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default ClinicOnboarding;
