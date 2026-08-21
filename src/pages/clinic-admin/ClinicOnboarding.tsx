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
import { Upload, Image as ImageIcon, ArrowLeft, ArrowRight, Trash2, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { user, userRole, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar' || i18n.language.startsWith('ar');
  
  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('clinic-info');
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
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
    0: { opening: '', closing: '', isClosed: true }, // Sunday
    1: { opening: '', closing: '', isClosed: true }, // Monday
    2: { opening: '', closing: '', isClosed: true }, // Tuesday
    3: { opening: '', closing: '', isClosed: true }, // Wednesday
    4: { opening: '', closing: '', isClosed: true }, // Thursday
    5: { opening: '', closing: '', isClosed: true }, // Friday
    6: { opening: '', closing: '', isClosed: true }, // Saturday
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

          // Resume at the first incomplete step
          const hasClinicInfo = Boolean(
            clinic.name &&
            Array.isArray(clinic.specialties) &&
            clinic.specialties.length > 0 &&
            clinic.description
          );
          const hasContactDetails = Boolean(
            clinic.contact_phone &&
            clinic.city &&
            clinic.district &&
            clinic.street &&
            (clinic.address_details || clinic.address)
          );
          if (!hasClinicInfo) {
            setCurrentStep('clinic-info');
          } else if (!hasContactDetails) {
            setCurrentStep('contact-details');
          } else {
            setCurrentStep('operating-hours');
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

  const handleRemoveLogo = async () => {
    const preview = clinicInfo.logoPreview;
    const shouldDeleteSavedLogo = Boolean(preview && !preview.startsWith('blob:'));

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

    if (!shouldDeleteSavedLogo) return;

    try {
      await api.clinicAdmin.removeLogo();
      toast.success(t('Logo removed'));
    } catch (error) {
      console.error('❌ Error removing logo:', error);
      toast.error(t('Failed to remove logo'));
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

  const handleDayOpenToggle = (dayValue: number) => {
    const hours = operatingHours[dayValue];

    if (hours.isClosed) {
      if (!hours.opening || !hours.closing) {
        toast.error(t('Please select opening and closing time'));
        return;
      }

      const openingMinutes = dbTimeToMinutes(convertToDatabaseTime(hours.opening));
      const closingMinutes = dbTimeToMinutes(convertToDatabaseTime(hours.closing));
      if (openingMinutes === null || closingMinutes === null || closingMinutes <= openingMinutes) {
        toast.error(t('Closing time must be after opening time'));
        return;
      }

      setOperatingHours((prev) => ({
        ...prev,
        [dayValue]: { ...prev[dayValue], isClosed: false },
      }));
      toast.success(t('{{day}} hours set', { day: t(daysOfWeek.find((day) => day.value === dayValue)?.label || '') }));
      return;
    }

    setOperatingHours((prev) => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], isClosed: true },
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
        (hours) => !hours.isClosed && hours.opening && hours.closing
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

  const saveDraftProgress = async () => {
    // Best-effort save so leaving mid-flow keeps what the user already entered
    try {
      if (currentStep === 'clinic-info' && clinicInfo.name.trim()) {
        const email = user?.email || contactDetails.email || '';
        if (!email) return;

        const clinicPayload = {
          name: clinicInfo.name.trim(),
          description: clinicInfo.description.trim() || '',
          specialties: clinicInfo.specialties,
        };

        if (clinicId) {
          await api.clinicAdmin.updateClinic(clinicPayload);
        } else {
          const { clinic } = await api.clinicAdmin.createClinic({
            ...clinicPayload,
            email,
            address: '',
          });
          setClinicId(clinic.id);

          if (clinicInfo.logo) {
            const logoUrl = await uploadLogoToStorage(clinicInfo.logo);
            if (logoUrl) {
              await api.clinicAdmin.updateClinic({ logo_url: logoUrl });
            }
          }
        }
        return;
      }

      if (!clinicId) return;

      if (currentStep === 'contact-details') {
        const payload: Record<string, string> = {
          country: 'Saudi Arabia',
        };
        if (contactDetails.email.trim()) {
          payload.email = contactDetails.email.trim();
          payload.contact_email = contactDetails.email.trim();
        }
        const phone = normalizePhoneNumber(contactDetails.phone);
        if (phone) payload.contact_phone = phone;
        if (contactDetails.city.trim()) payload.city = contactDetails.city.trim();
        if (contactDetails.district.trim()) payload.district = contactDetails.district.trim();
        if (contactDetails.street.trim()) payload.street = contactDetails.street.trim();
        if (contactDetails.addressDetails.trim()) {
          payload.address_details = contactDetails.addressDetails.trim();
        }
        const fullAddress = [
          contactDetails.street.trim(),
          contactDetails.district.trim(),
          contactDetails.city.trim(),
          contactDetails.addressDetails.trim(),
        ].filter(Boolean).join(', ');
        if (fullAddress) payload.address = fullAddress;

        await api.clinicAdmin.updateClinic(payload);
        return;
      }

      if (currentStep === 'operating-hours') {
        const hasAnyHours = Object.values(operatingHours).some(
          (hours) => !hours.isClosed && hours.opening && hours.closing
        );
        if (!hasAnyHours) return;

        const hoursToInsert = daysOfWeek.map((day) => ({
          day_of_week: day.value,
          opening_time: operatingHours[day.value].isClosed
            ? null
            : convertToDatabaseTime(operatingHours[day.value].opening),
          closing_time: operatingHours[day.value].isClosed
            ? null
            : convertToDatabaseTime(operatingHours[day.value].closing),
          is_closed: operatingHours[day.value].isClosed,
        }));
        await api.clinicAdmin.updateOperatingHours(hoursToInsert);
      }
    } catch (error) {
      console.error('ClinicOnboarding: draft save before sign out failed', error);
    }
  };

  const handleSignOut = async () => {
    if (signingOut || loading) return;
    setSigningOut(true);
    try {
      await saveDraftProgress();
      await signOut();
      navigate('/auth?mode=login', { replace: true });
    } catch (error) {
      console.error('ClinicOnboarding: sign out failed', error);
      toast.error(t('Failed to sign out'));
    } finally {
      setSigningOut(false);
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
        <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8" dir={isRtl ? 'rtl' : 'ltr'}>
          {/* Logo + language switcher + sign out — same SVG wordmark as dashboard */}
          <div className="relative mb-6 min-h-12">
            <div className="flex justify-center px-24" dir="ltr">
              <svg
                width="431"
                height="115"
                viewBox="0 0 431 115"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-auto sm:h-12"
                aria-label="Carelinx"
              >
                <circle cx="60.315" cy="95.1645" r="15.3474" transform="rotate(-15.4716 60.315 95.1645)" fill="#00FFA2"/>
                <path d="M50.6471 14.1592C58.3393 6.33935 70.9144 6.23586 78.7343 13.9281C86.5542 21.6203 86.6577 34.1954 78.9655 42.0153C73.8288 47.2371 66.5154 49.0173 59.8942 47.3335C56.1372 46.378 51.854 46.6327 49.1354 49.3963C46.4169 52.16 46.2328 56.4468 47.25 60.1876C49.0426 66.7801 47.3831 74.1219 42.2464 79.3438C34.5542 87.1637 21.9791 87.2672 14.1592 79.575C6.33929 71.8828 6.23579 59.3077 13.928 51.4878C18.8792 46.4544 25.8529 44.6186 32.2797 46.0005C36.1682 46.8366 40.5399 46.5204 43.3292 43.6849C46.1184 40.8493 46.3626 36.473 45.4626 32.5987C43.9752 26.1956 45.696 19.1926 50.6471 14.1592Z" fill="#00FFA2"/>
                <path d="M116.256 76.464C111.899 72.0493 109.72 66.746 109.72 60.554C109.72 54.362 111.899 49.0873 116.256 44.73C120.671 40.3727 125.974 38.194 132.166 38.194C136.237 38.194 139.992 39.226 143.432 41.29C146.872 43.2967 149.567 45.9913 151.516 49.374L140.68 55.652C139.419 51.8107 137.584 48.8293 135.176 46.708C132.768 44.5867 130.417 43.87 128.124 44.558C125.372 45.3607 123.509 47.912 122.534 52.212C121.387 57.2573 121.903 62.1307 124.082 66.832C126.891 72.7947 131.593 75.8907 138.186 76.12C142.945 76.292 148.391 74.8587 154.526 71.82C152.634 75.088 149.481 77.7827 145.066 79.904C140.709 81.968 136.409 83 132.166 83C125.974 83 120.671 80.8213 116.256 76.464ZM189.493 64.768V63.306C175.962 62.9047 169.197 65.1407 169.197 70.014C169.197 72.1927 170.888 73.7693 174.271 74.744C177.654 75.6613 181.036 75.2887 184.419 73.626C187.802 71.9633 189.493 69.0107 189.493 64.768ZM201.791 83C196.344 83 192.245 83 189.493 83V73.454C187.773 76.206 185.537 78.4993 182.785 80.334C180.033 82.1113 176.765 83 172.981 83C167.878 83 163.922 82.1113 161.113 80.334C158.304 78.4993 156.899 75.8047 156.899 72.25C156.899 70.4153 157.329 68.7527 158.189 67.262C159.049 65.714 160.138 64.4527 161.457 63.478C162.833 62.446 164.496 61.5573 166.445 60.812C168.452 60.0667 170.372 59.4933 172.207 59.092C174.099 58.6333 176.192 58.2893 178.485 58.06C180.778 57.7733 182.728 57.6013 184.333 57.544C185.938 57.4293 187.63 57.372 189.407 57.372C189.407 48.6573 186.139 44.3 179.603 44.3C178.8 44.3 178.026 44.4433 177.281 44.73C176.593 44.9593 175.991 45.246 175.475 45.59C175.016 45.8767 174.529 46.364 174.013 47.052C173.554 47.74 173.182 48.3133 172.895 48.772C172.608 49.2307 172.293 49.9187 171.949 50.836C171.605 51.7533 171.347 52.4413 171.175 52.9C171.06 53.3013 170.86 54.018 170.573 55.05C170.286 56.0247 170.114 56.6267 170.057 56.856C167.706 55.48 164.152 53.416 159.393 50.664C164.324 42.3507 171.06 38.194 179.603 38.194C186.655 38.194 192.073 40.2867 195.857 44.472C199.698 48.6573 201.619 54.3333 201.619 61.5C201.619 64.8253 201.648 68.7527 201.705 73.282C201.762 77.754 201.791 80.9933 201.791 83ZM207.814 38.194H220.112V47.74C221.717 44.7587 223.752 42.408 226.218 40.688C228.74 38.968 231.492 38.108 234.474 38.108C237.627 38.108 240.264 39.1113 242.386 41.118C244.564 43.0673 246.198 45.7907 247.288 49.288L236.28 55.566C236.05 52.0113 235.448 49.2593 234.474 47.31C233.499 45.3033 231.951 44.3 229.83 44.3C227.078 44.3 224.756 45.8767 222.864 49.03C221.029 52.1833 220.112 56.0247 220.112 60.554V83H207.814V38.194ZM261.959 57.544C266.259 57.544 269.757 57.286 272.451 56.77C275.203 56.1967 277.067 55.5087 278.041 54.706C279.016 53.9033 279.446 52.986 279.331 51.954C279.217 49.8327 277.955 47.912 275.547 46.192C273.197 44.4147 270.703 43.87 268.065 44.558C266.173 45.074 264.654 46.5647 263.507 49.03C262.418 51.4953 261.902 54.3333 261.959 57.544ZM256.197 76.464C251.84 72.0493 249.661 66.746 249.661 60.554C249.661 54.362 251.84 49.0873 256.197 44.73C260.612 40.3727 265.915 38.194 272.107 38.194C274.401 38.194 276.665 38.4807 278.901 39.054C281.137 39.6273 283.23 40.4873 285.179 41.634C287.129 42.7233 288.677 44.2427 289.823 46.192C291.027 48.1413 291.629 50.3487 291.629 52.814C291.629 54.3047 291.113 55.6807 290.081 56.942C289.107 58.2033 287.53 59.35 285.351 60.382C283.23 61.414 280.249 62.2167 276.407 62.79C272.566 63.3633 268.037 63.65 262.819 63.65C263.45 65.714 264.281 67.5773 265.313 69.24C266.403 70.8453 267.836 72.2787 269.613 73.54C271.448 74.744 273.512 75.5467 275.805 75.948C278.099 76.3493 280.851 76.2347 284.061 75.604C287.272 74.916 290.741 73.6547 294.467 71.82C292.575 75.088 289.451 77.7827 285.093 79.904C280.736 81.968 276.407 83 272.107 83C265.915 83 260.612 80.8213 256.197 76.464ZM310.859 83H298.561V22.8H310.859V83ZM318.739 32.604C317.535 31.4573 316.933 30.11 316.933 28.562C316.933 26.9567 317.535 25.6093 318.739 24.52C319.943 23.3733 321.376 22.8 323.039 22.8C324.759 22.8 326.221 23.3733 327.425 24.52C328.629 25.6093 329.231 26.9567 329.231 28.562C329.231 30.11 328.629 31.4573 327.425 32.604C326.221 33.6933 324.759 34.238 323.039 34.238C321.376 34.238 319.943 33.6933 318.739 32.604ZM316.933 38.194H329.231V83H316.933V38.194ZM335.305 38.194H347.603V47.912C349.209 44.9307 351.301 42.5513 353.881 40.774C356.519 38.9967 359.328 38.108 362.309 38.108C367.24 38.108 371.425 40.3153 374.865 44.73C378.363 49.0873 380.111 54.362 380.111 60.554V83H367.813V60.554C367.813 56.082 366.81 52.2693 364.803 49.116C362.854 45.9053 360.475 44.3 357.665 44.3C354.913 44.3 352.534 45.8767 350.527 49.116C348.578 52.2693 347.603 56.082 347.603 60.554V83H335.305V38.194ZM400.888 62.876L384.204 38.194H398.738L408.886 53.158L421.27 38.194H429.01L412.326 58.318L429.01 83H414.476L404.328 68.036L391.944 83H384.204L400.888 62.876Z" className="fill-[#0C2243] dark:fill-white"/>
              </svg>
            </div>
            <div className="absolute top-0 start-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut || loading}
                className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <LogOut className="w-4 h-4 me-1.5" />
                {signingOut ? t('Saving...') : t('Sign Out')}
              </Button>
            </div>
            <div className="absolute top-0 end-0">
              <LanguageToggle variant="onLight" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
            {t('Clinic Onboarding')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            {t('You can sign out anytime. Your progress is saved and will be restored when you log in again.')}
          </p>

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
                  <div className="relative w-16 h-16 rounded-lg bg-white border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {clinicInfo.logoPreview ? (
                      <img
                        src={clinicInfo.logoPreview}
                        alt={t('Clinic logo preview')}
                        className="max-h-full max-w-full object-contain p-1.5"
                      />
                    ) : (
                      <ImageIcon className="w-7 h-7 text-[#0C2243]/50" />
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
                          {t(specialty)}
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
                  <div className="flex flex-wrap gap-2 mt-2 justify-start">
                    {clinicInfo.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="px-3 py-1 bg-[#0C2243] dark:bg-[#00FFA2] text-white dark:text-[#0C2243] rounded-full text-sm inline-flex items-center gap-2"
                      >
                        {t(specialty)}
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('Select opening and closing time, then click Open for each working day.')}
              </p>

              <div className="space-y-4">
                {daysOfWeek.map((day) => (
                  <div
                    key={day.value}
                    className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="min-w-28 shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300 text-start">
                      {t(day.label)}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <Select
                        value={operatingHours[day.value].opening}
                        disabled={!operatingHours[day.value].isClosed}
                        onValueChange={(value) =>
                          setOperatingHours(prev => ({
                            ...prev,
                            [day.value]: { ...prev[day.value], opening: value },
                          }))
                        }
                      >
                        <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white disabled:opacity-70">
                          <SelectValue placeholder={t('Opening')} />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 max-h-[300px]">
                          {timeSlots.map((time) => (
                            <SelectItem
                              key={`${day.value}-open-${time}`}
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
                        disabled={!operatingHours[day.value].isClosed}
                        onValueChange={(value) =>
                          setOperatingHours(prev => ({
                            ...prev,
                            [day.value]: { ...prev[day.value], closing: value },
                          }))
                        }
                      >
                        <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white disabled:opacity-70">
                          <SelectValue placeholder={t('Closing')} />
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
                      onClick={() => handleDayOpenToggle(day.value)}
                      className={`${
                        operatingHours[day.value].isClosed
                          ? 'bg-[#0C2243] hover:bg-[#0a1a35] text-white border-[#0C2243]'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {operatingHours[day.value].isClosed ? t('Open') : t('Closed')}
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
