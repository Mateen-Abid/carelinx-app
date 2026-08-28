import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClinicAdminSidebar from '@/components/clinic-admin/ClinicAdminSidebar';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, X, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { localizedCatalogName, localizedStoredText, type CatalogName } from '@/utils/localizedContent';

interface Clinic {
  id: string;
  name: string;
  name_ar?: string | null;
  email: string;
  contact_phone: string | null;
  contact_email: string | null;
  address: string;
  city?: string | null;
  district?: string | null;
  street?: string | null;
  address_details?: string | null;
  logo_url: string | null;
  description: string | null;
  description_ar?: string | null;
  specialties: string[] | null;
  registration_date: string;
  status: string;
}

interface OperatingHours {
  day_of_week: number;
  opening_time: string | null;
  closing_time: string | null;
  is_closed: boolean;
}

const daysOfWeek = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
];

const normalizePhoneNumber = (value: string) => value.replace(/\D/g, '').slice(0, 10);

const ClinicAdminClinicProfile = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [operatingHours, setOperatingHours] = useState<OperatingHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingClinic, setCheckingClinic] = useState(true);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isEditHoursModalOpen, setIsEditHoursModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);
  const [specialtyCatalog, setSpecialtyCatalog] = useState<CatalogName[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [clinicLoaded, setClinicLoaded] = useState(false);
  
  // Edit Profile Form State
  const [editProfileForm, setEditProfileForm] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    specialties: [] as string[],
    email: '',
    phone: '',
    city: '',
    district: '',
    street: '',
    addressDetails: '',
  });

  // Edit Hours Form State
  const [editHoursForm, setEditHoursForm] = useState<{
    [key: number]: { opening: string; closing: string; isClosed: boolean }
  }>({});

  // Fetch super admin specialties
  useEffect(() => {
    const fetchSuperAdminSpecialties = async () => {
      try {
        setLoadingSpecialties(true);
        
        const { specialties } = await api.adminServices.getSpecialties();
        const catalog = (specialties || []) as CatalogName[];
        setSpecialtyCatalog(catalog);
        setAvailableSpecialties(catalog.map((s) => s.name));
      } catch (error) {
        console.error('Error fetching super admin specialties:', error);
      } finally {
        setLoadingSpecialties(false);
      }
    };

    fetchSuperAdminSpecialties();
  }, []);

  useEffect(() => {
    const checkClinicExists = async () => {
      if (!user) return;

      try {
        const { clinic: clinicData, operatingHours: hoursData } = await api.clinicAdmin.getClinic();

        if (!clinicData || clinicData.status === 'pending') {
          navigate('/clinic-admin/onboarding', { replace: true });
          return;
        }

        setClinic(clinicData);
        setOperatingHours(hoursData || []);
        setClinicLoaded(true);
        setLoading(false);
        setCheckingClinic(false);
      } catch (error) {
        console.error('Error in checkClinicExists:', error);
        setCheckingClinic(false);
      }
    };

    checkClinicExists();
  }, [user, navigate]);

  useEffect(() => {
    if (user && !checkingClinic && !clinicLoaded) {
      fetchClinicData();
    }
  }, [user, checkingClinic, clinicLoaded]);

  // Note: Real-time subscriptions removed - data refreshed on save/load

  const fetchClinicData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch clinic data via backend
      const { clinic: clinicData, operatingHours: hoursData } = await api.clinicAdmin.getClinic();

      if (clinicData) {
        setClinic(clinicData);
        setOperatingHours(hoursData || []);
      }
    } catch (error) {
      console.error('Error fetching clinic data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Time slots for operating hours (display format)
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour.toString().padStart(2, '0')}:${minute} ${period}`;
  });

  const formatTime = (time: string | null): string => {
    if (!time) return 'Closed';
    
    // Convert HH:MM:SS to HH:MM AM/PM format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const minute = parseInt(minutes);
    
    if (hour === 0) {
      return `12:${minute.toString().padStart(2, '0')} AM`;
    } else if (hour < 12) {
      return `${hour}:${minute.toString().padStart(2, '0')} AM`;
    } else if (hour === 12) {
      return `12:${minute.toString().padStart(2, '0')} PM`;
    } else {
      return `${hour - 12}:${minute.toString().padStart(2, '0')} PM`;
    }
  };

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

  // Convert database time (24-hour HH:MM:SS) to display time (12-hour)
  const convertToDisplayTime = (dbTime: string | null): string => {
    if (!dbTime) return '';
    const [hours, minutes] = dbTime.split(':');
    const hour = parseInt(hours);
    const minute = parseInt(minutes);
    
    if (hour === 0) {
      return `12:${minute.toString().padStart(2, '0')} AM`;
    } else if (hour < 12) {
      return `${hour}:${minute.toString().padStart(2, '0')} AM`;
    } else if (hour === 12) {
      return `12:${minute.toString().padStart(2, '0')} PM`;
    } else {
      return `${hour - 12}:${minute.toString().padStart(2, '0')} PM`;
    }
  };

  const displayTimeToMinutes = (displayTime: string): number | null => {
    if (!displayTime) return null;

    const [time, period] = displayTime.split(' ');
    if (!time || !period) return null;

    const [hours, minutes] = time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    let hour24 = hours % 12;
    if (period === 'PM') {
      hour24 += 12;
    }

    return hour24 * 60 + minutes;
  };

  const isClosingTimeAfterOpening = (opening: string, closing: string): boolean => {
    const openingMinutes = displayTimeToMinutes(opening);
    const closingMinutes = displayTimeToMinutes(closing);

    if (openingMinutes === null || closingMinutes === null) {
      return false;
    }

    return closingMinutes > openingMinutes;
  };

  const getClosingTimeOptions = (opening: string): string[] => {
    if (!opening) return timeSlots;

    const openingMinutes = displayTimeToMinutes(opening);
    if (openingMinutes === null) return timeSlots;

    return timeSlots.filter((time) => {
      const timeMinutes = displayTimeToMinutes(time);
      return timeMinutes !== null && timeMinutes > openingMinutes;
    });
  };

  const getDayHours = (dayValue: number): { opening: string; closing: string } => {
    const dayHours = operatingHours.find(h => h.day_of_week === dayValue);
    
    if (!dayHours || dayHours.is_closed) {
      return { opening: 'Closed', closing: 'Closed' };
    }
    
    return {
      opening: formatTime(dayHours.opening_time),
      closing: formatTime(dayHours.closing_time),
    };
  };

  const getClinicId = (): string => {
    // Generate a clinic ID like CLN-10245
    if (!clinic) return 'N/A';
    // Use first 5 characters of UUID and convert to number, then format
    const idNum = clinic.id.replace(/-/g, '').substring(0, 8);
    const num = parseInt(idNum, 16) % 100000;
    return `CLN-${num.toString().padStart(5, '0')}`;
  };

  const handleOpenEditProfile = () => {
    if (!clinic) return;
    
    setEditProfileForm({
      name: clinic.name,
      name_ar: clinic.name_ar || '',
      description: clinic.description || '',
      description_ar: clinic.description_ar || '',
      specialties: clinic.specialties || [],
      email: clinic.contact_email || clinic.email,
      phone: clinic.contact_phone || '',
      city: clinic.city || '',
      district: clinic.district || '',
      street: clinic.street || '',
      addressDetails: clinic.address_details || clinic.address || '',
    });
    setLogoFile(null);
    setLogoPreview(clinic.logo_url);
    setLogoRemoved(false);
    setIsEditProfileModalOpen(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
      toast.error(t('Please upload an image file'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('Image size must be less than 5MB'));
      return;
    }

    if (logoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setLogoRemoved(false);
  };

  const handleRemoveLogo = async () => {
    const preview = logoPreview;
    const shouldDeleteSavedLogo = Boolean(preview && !preview.startsWith('blob:'));

    if (logoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(null);
    setLogoPreview(null);
    setLogoRemoved(true);

    if (!shouldDeleteSavedLogo) return;

    try {
      await api.clinicAdmin.removeLogo();
      setClinic((prev) => (prev ? { ...prev, logo_url: null } : prev));
      toast.success(t('Logo removed'));
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error(t('Failed to remove logo'));
    }
  };

  const uploadLogoToStorage = async (file: File): Promise<string | null> => {
    try {
      // Convert file to base64 for backend upload
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:image/png;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);

      const base64File = await base64Promise;

      // Upload via backend API
      const { logo_url } = await api.clinicAdmin.uploadLogo({
        file: base64File,
        fileName: file.name,
        fileType: file.type,
      });

      return logo_url;
    } catch (error: any) {
      console.error('Error in uploadLogoToStorage:', error);
      toast.error(t('Failed to upload logo: {{message}}', { message: error.message || t('Unknown error') }));
      return null;
    }
  };

  const handleSaveProfile = async () => {
    if (!clinic) return;

    if (!editProfileForm.name.trim()) {
      toast.error(t('Please enter clinic name'));
      return;
    }
    if (!editProfileForm.city.trim()) {
      toast.error(t('Please enter city'));
      return;
    }
    if (!editProfileForm.district.trim()) {
      toast.error(t('Please enter district'));
      return;
    }
    if (!editProfileForm.street.trim()) {
      toast.error(t('Please enter street'));
      return;
    }
    if (!editProfileForm.addressDetails.trim()) {
      toast.error(t('Please enter address details'));
      return;
    }
    if (normalizePhoneNumber(editProfileForm.phone).length !== 10) {
      toast.error(t('Phone number must be 10 digits'));
      return;
    }

    setSavingProfile(true);
    try {
      let logoUrl = clinic.logo_url;

      if (logoFile) {
        logoUrl = await uploadLogoToStorage(logoFile);
        if (!logoUrl) {
          toast.error(t('Logo upload failed. Please try a JPG or PNG under 5MB.'));
          return;
        }
      } else if (logoRemoved) {
        logoUrl = null;
      }

      const fullAddress = [
        editProfileForm.street.trim(),
        editProfileForm.district.trim(),
        editProfileForm.city.trim(),
        editProfileForm.addressDetails.trim(),
      ].filter(Boolean).join(', ');

      await api.clinicAdmin.updateClinic({
        name: editProfileForm.name.trim(),
        name_ar: editProfileForm.name_ar.trim() || null,
        description: editProfileForm.description.trim() || null,
        description_ar: editProfileForm.description_ar.trim() || null,
        specialties: editProfileForm.specialties.length > 0 ? editProfileForm.specialties : null,
        contact_phone: normalizePhoneNumber(editProfileForm.phone) || null,
        city: editProfileForm.city.trim(),
        district: editProfileForm.district.trim(),
        street: editProfileForm.street.trim(),
        address_details: editProfileForm.addressDetails.trim(),
        address: fullAddress,
        logo_url: logoUrl,
      });

      toast.success(t('Clinic profile updated successfully'));
      setIsEditProfileModalOpen(false);
      await fetchClinicData();
    } catch (error: any) {
      console.error('Error updating clinic profile:', error);
      toast.error(t('Failed to update clinic profile: {{message}}', { message: error.message }));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOpenEditHours = () => {
    if (!clinic) return;

    // Initialize form with current hours or defaults
    const hoursForm: { [key: number]: { opening: string; closing: string; isClosed: boolean } } = {};
    
    daysOfWeek.forEach(day => {
      const dayHours = operatingHours.find(h => h.day_of_week === day.value);
      if (dayHours) {
        const opening = dayHours.is_closed ? '' : convertToDisplayTime(dayHours.opening_time);
        const closing = dayHours.is_closed ? '' : convertToDisplayTime(dayHours.closing_time);
        const hasValidRange = !opening || !closing || isClosingTimeAfterOpening(opening, closing);

        // Use the actual is_closed value from database
        hoursForm[day.value] = {
          opening,
          closing: hasValidRange ? closing : '',
          isClosed: dayHours.is_closed,
        };
      } else {
        // No hours set for this day - default to closed
        hoursForm[day.value] = {
          opening: '',
          closing: '',
          isClosed: true,
        };
      }
    });

    setEditHoursForm(hoursForm);
    setIsEditHoursModalOpen(true);
  };

  const handleSaveHours = async () => {
    if (!clinic) return;

    setSavingHours(true);
    try {
      for (const day of daysOfWeek) {
        const dayHours = editHoursForm[day.value] || { opening: '', closing: '', isClosed: true };
        const isClosed = dayHours.isClosed || !dayHours.opening || !dayHours.closing;

        if (!isClosed && !isClosingTimeAfterOpening(dayHours.opening, dayHours.closing)) {
          toast.error(t('Closing time must be after opening time'));
          setSavingHours(false);
          return;
        }
      }

      // Prepare operating hours data
      const hoursToInsert = daysOfWeek.map(day => {
        const dayHours = editHoursForm[day.value] || { opening: '', closing: '', isClosed: true };
        // Use isClosed from form, or check if times are empty
        const isClosed = dayHours.isClosed || !dayHours.opening || !dayHours.closing;
        
        return {
          day_of_week: day.value,
          opening_time: isClosed ? null : convertToDatabaseTime(dayHours.opening),
          closing_time: isClosed ? null : convertToDatabaseTime(dayHours.closing),
          is_closed: isClosed,
        };
      });

      // Update operating hours via backend
      await api.clinicAdmin.updateOperatingHours(hoursToInsert);

      toast.success(t('Operating hours updated successfully'));
      setIsEditHoursModalOpen(false);
      await fetchClinicData();
    } catch (error: any) {
      console.error('Error updating operating hours:', error);
      toast.error(t('Failed to update operating hours: {{message}}', { message: error.message }));
    } finally {
      setSavingHours(false);
    }
  };

  const handleSpecialtyAdd = (specialty: string) => {
    if (!editProfileForm.specialties.includes(specialty)) {
      setEditProfileForm(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty],
      }));
    }
  };

  const handleSpecialtyRemove = (specialty: string) => {
    setEditProfileForm(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty),
    }));
  };


  if (checkingClinic) {
    return (
      <ProtectedRoute allowedRoles={['clinic_admin']}>
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{t('Loading...')}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['clinic_admin']}>
      <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`}>
        <ClinicAdminSidebar isDarkMode={isDarkMode} onDarkModeToggle={toggleDarkMode} />
        
        <main className="flex-1 bg-[#F7F7F7] dark:bg-gray-900 min-h-screen overflow-y-auto">
          <div className="p-8">
            {/* Header */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              {t('Clinic Profile')}
            </h1>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">{t('Loading clinic profile...')}</p>
              </div>
            ) : clinic ? (
              <>
                {/* Clinic Header Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {clinic.logo_url ? (
                          <img
                            src={clinic.logo_url}
                            alt={localizedStoredText(clinic.name, clinic.name_ar, i18n.language)}
                            className="max-h-full max-w-full object-contain p-1.5"
                          />
                        ) : (
                          <ImageIcon className="w-7 h-7 text-[#0C2243]/50" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                          {localizedStoredText(clinic.name, clinic.name_ar, i18n.language)}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          {localizedStoredText(clinic.description, clinic.description_ar, i18n.language) || t('Healthcare & Diagnostics')}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleOpenEditProfile}
                      className="bg-[#00FFA2] hover:bg-[#00e68f] text-[#0C2243] px-6 py-2.5 rounded-lg font-medium flex items-center gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      {t('Edit Profile')}
                    </Button>
                  </div>

                  {/* Contact Information */}
                  <div className="flex flex-wrap gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('Email')}:</span>
                      <span className="text-sm text-gray-900 dark:text-white ml-2">
                        {clinic.contact_email || clinic.email}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('Phone')}:</span>
                      <span className="text-sm text-gray-900 dark:text-white ml-2">
                        {clinic.contact_phone || t('N/A')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('Address')}:</span>
                      <span className="text-sm text-gray-900 dark:text-white ml-2">
                        {clinic.address || t('N/A')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* General Information Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('General Information')}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">{t('Clinic Name')} -</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {localizedStoredText(clinic.name, clinic.name_ar, i18n.language)}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">{t('Description')} -</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {localizedStoredText(clinic.description, clinic.description_ar, i18n.language) || t('N/A')}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">{t('Specialties')} -</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {clinic.specialties && clinic.specialties.length > 0
                          ? clinic.specialties.map((specialty) => localizedCatalogName(specialty, i18n.language, specialtyCatalog, t)).join(', ')
                          : t('N/A')}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">{t('Registered Since')} -</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {format(new Date(clinic.registration_date), 'MMMM yyyy')}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">{t('City')} -</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {clinic.city || t('N/A')}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">{t('District')} -</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {clinic.district || t('N/A')}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">{t('Street')} -</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {clinic.street || t('N/A')}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">{t('Address Details')} -</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {clinic.address_details || t('N/A')}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">{t('Clinic ID')} -</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getClinicId()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Working Hours Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t('Working Hours')}
                    </h3>
                    <Button
                      onClick={handleOpenEditHours}
                      className="bg-[#00FFA2] hover:bg-[#00e68f] text-[#0C2243] px-6 py-2.5 rounded-lg font-medium flex items-center gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      {t('Edit Hours')}
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('Day')}
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('Opening')}
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('Closing')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {daysOfWeek.map((day) => {
                          const hours = getDayHours(day.value);
                          return (
                            <tr
                              key={day.value}
                              className="border-b border-gray-200 dark:border-gray-700"
                            >
                              <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                {t(day.label)}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                {hours.opening}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                {hours.closing}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">{t('No clinic data found')}</p>
              </div>
            )}
          </div>
        </main>

        {/* Edit Profile Modal */}
        <Dialog open={isEditProfileModalOpen} onOpenChange={setIsEditProfileModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('Edit Clinic Profile')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Clinic Logo */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  {t('Clinic Logo')}
                </Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200 dark:border-gray-700">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt={t('Clinic logo')}
                        className="max-h-full max-w-full object-contain p-1.5"
                      />
                    ) : (
                      <ImageIcon className="w-7 h-7 text-[#0C2243]/50" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      onChange={handleLogoUpload}
                      className="sr-only"
                    />
                    <Button
                      asChild
                      variant="outline"
                      className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
                    >
                      <label htmlFor="logo-upload">
                        <Upload className="w-4 h-4 mr-2" />
                        {logoPreview ? t('Change logo') : t('Upload logo')}
                      </label>
                    </Button>
                    {logoPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveLogo}
                        className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 px-4 py-2 rounded-md text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('Remove logo')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Clinic Name */}
              <div>
                <Label htmlFor="clinic-name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('Clinic name (English)')}
                </Label>
                <Input
                  id="clinic-name"
                  type="text"
                  value={editProfileForm.name}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                  className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder={t('Enter clinic name')}
                />
              </div>

              <div>
                <Label htmlFor="clinic-name-ar" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('Clinic name (Arabic)')}
                </Label>
                <Input
                  id="clinic-name-ar"
                  dir="rtl"
                  type="text"
                  value={editProfileForm.name_ar}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, name_ar: e.target.value })}
                  className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder={t('Enter clinic name')}
                />
              </div>

              {/* Specialties */}
              <div>
                <Label htmlFor="specialties" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('Specialties')}
                </Label>
                <div className="space-y-2">
                  {/* Selected Specialties as Tags */}
                  {editProfileForm.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 justify-start">
                      {editProfileForm.specialties.map((specialty) => (
                        <span
                          key={specialty}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium"
                        >
                          {localizedCatalogName(specialty, i18n.language, specialtyCatalog, t)}
                          <button
                            type="button"
                            onClick={() => handleSpecialtyRemove(specialty)}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Specialty Selector */}
                  <Select onValueChange={handleSpecialtyAdd}>
                    <SelectTrigger className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                      <SelectValue placeholder={t('Select a specialty')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSpecialties
                        .filter(s => !editProfileForm.specialties.includes(s))
                        .map((specialty) => (
                          <SelectItem key={specialty} value={specialty}>
                            {localizedCatalogName(specialty, i18n.language, specialtyCatalog, t)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('Email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={editProfileForm.email}
                  disabled
                  className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                  placeholder={t('Enter email')}
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('Phone')}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={editProfileForm.phone}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: normalizePhoneNumber(e.target.value) })}
                  inputMode="numeric"
                  maxLength={10}
                  className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder={t('Enter phone number')}
                />
              </div>

              {/* City */}
              <div>
                <Label htmlFor="city" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('City')}
                </Label>
                <Input
                  id="city"
                  type="text"
                  value={editProfileForm.city}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, city: e.target.value })}
                  className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder={t('Enter city')}
                />
              </div>

              {/* District */}
              <div>
                <Label htmlFor="district" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('District')}
                </Label>
                <Input
                  id="district"
                  type="text"
                  value={editProfileForm.district}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, district: e.target.value })}
                  className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder={t('Enter district')}
                />
              </div>

              {/* Street */}
              <div>
                <Label htmlFor="street" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('Street')}
                </Label>
                <Input
                  id="street"
                  type="text"
                  value={editProfileForm.street}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, street: e.target.value })}
                  className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder={t('Enter street')}
                />
              </div>

              {/* Address Details */}
              <div>
                <Label htmlFor="address-details" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('Address Details')}
                </Label>
                <Textarea
                  id="address-details"
                  value={editProfileForm.addressDetails}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, addressDetails: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder={t('Enter address details')}
                  rows={4}
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('Description (English)')}
                </Label>
                <Textarea
                  id="description"
                  value={editProfileForm.description}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder={t('Enter clinic description')}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="description-ar" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('Description (Arabic)')}
                </Label>
                <Textarea
                  id="description-ar"
                  dir="rtl"
                  value={editProfileForm.description_ar}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, description_ar: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder={t('Enter clinic description')}
                  rows={3}
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => setIsEditProfileModalOpen(false)}
                variant="outline"
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2.5 rounded-lg font-medium"
              >
                {t('Cancel')}
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="bg-[#0C2243] dark:bg-[#00FFA2] hover:bg-[#0a1a35] dark:hover:bg-[#00FFA2]/90 text-white dark:text-[#0C2243] px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingProfile ? t('Saving...') : t('Save Changes')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Hours Modal */}
        <Dialog open={isEditHoursModalOpen} onOpenChange={setIsEditHoursModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('Edit Hours')}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                        {t('Days')}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                        {t('Opening')}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                        {t('Closing')}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                        {t('Closed')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {daysOfWeek.map((day) => {
                      const dayHours = editHoursForm[day.value] || { opening: '', closing: '', isClosed: true };
                      return (
                        <tr key={day.value} className="border-b border-gray-200 dark:border-gray-700">
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {t(day.label)}
                          </td>
                          <td className="py-3 px-4">
                            <Select
                              value={dayHours.opening || ''}
                              disabled={dayHours.isClosed}
                              onValueChange={(value) => {
                                setEditHoursForm(prev => {
                                  const currentClosing = prev[day.value]?.closing || '';
                                  const nextClosing = isClosingTimeAfterOpening(value, currentClosing)
                                    ? currentClosing
                                    : '';

                                  return {
                                    ...prev,
                                    [day.value]: { 
                                      ...prev[day.value], 
                                      opening: value, 
                                      closing: nextClosing,
                                      isClosed: false 
                                    },
                                  };
                                });
                              }}
                            >
                              <SelectTrigger className="h-10 w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                                <SelectValue placeholder={t('Select time')} />
                              </SelectTrigger>
                              <SelectContent>
                                {timeSlots.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-4">
                            <Select
                              value={dayHours.closing || ''}
                              disabled={dayHours.isClosed}
                              onValueChange={(value) => {
                                setEditHoursForm(prev => ({
                                  ...prev,
                                  [day.value]: { 
                                    ...prev[day.value], 
                                    closing: value, 
                                    opening: prev[day.value]?.opening || '', 
                                    isClosed: false 
                                  },
                                }));
                              }}
                            >
                              <SelectTrigger className="h-10 w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                                <SelectValue placeholder={t('Select time')} />
                              </SelectTrigger>
                              <SelectContent>
                                {getClosingTimeOptions(dayHours.opening).map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`closed-${day.value}`}
                                checked={dayHours.isClosed}
                                onCheckedChange={(checked) => {
                                  setEditHoursForm(prev => ({
                                    ...prev,
                                    [day.value]: {
                                      ...prev[day.value],
                                      isClosed: checked === true,
                                      opening: checked === true ? '' : prev[day.value]?.opening || '',
                                      closing: checked === true ? '' : prev[day.value]?.closing || '',
                                    },
                                  }));
                                }}
                              />
                              <label
                                htmlFor={`closed-${day.value}`}
                                className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                              >
                                {t('Closed')}
                              </label>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => setIsEditHoursModalOpen(false)}
                variant="outline"
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2.5 rounded-lg font-medium"
              >
                {t('Cancel')}
              </Button>
              <Button
                onClick={handleSaveHours}
                disabled={savingHours}
                className="bg-[#0C2243] dark:bg-[#00FFA2] hover:bg-[#0a1a35] dark:hover:bg-[#00FFA2]/90 text-white dark:text-[#0C2243] px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingHours ? t('Saving...') : t('Save Changes')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default ClinicAdminClinicProfile;
