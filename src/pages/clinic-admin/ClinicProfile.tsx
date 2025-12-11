import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClinicAdminSidebar from '@/components/clinic-admin/ClinicAdminSidebar';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { Pencil, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Clinic {
  id: string;
  name: string;
  email: string;
  contact_phone: string | null;
  contact_email: string | null;
  address: string;
  logo_url: string | null;
  description: string | null;
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

const ClinicAdminClinicProfile = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();
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
  
  // Edit Profile Form State
  const [editProfileForm, setEditProfileForm] = useState({
    name: '',
    description: '',
    specialties: [] as string[],
    email: '',
    phone: '',
    address: '',
  });

  // Edit Hours Form State
  const [editHoursForm, setEditHoursForm] = useState<{
    [key: number]: { opening: string; closing: string; isClosed: boolean }
  }>({});

  useEffect(() => {
    const checkClinicExists = async () => {
      if (!user) return;

      try {
        const { data: clinicData, error } = await supabase
          .from('clinics')
          .select('id, name, status, logo_url')
          .eq('clinic_admin_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking clinic:', error);
          setCheckingClinic(false);
          return;
        }

        if (!clinicData || clinicData.status === 'pending') {
          navigate('/clinic-admin/onboarding', { replace: true });
          return;
        }

        setCheckingClinic(false);
      } catch (error) {
        console.error('Error in checkClinicExists:', error);
        setCheckingClinic(false);
      }
    };

    checkClinicExists();
  }, [user, navigate]);

  useEffect(() => {
    if (user && !checkingClinic) {
      fetchClinicData();
    }
  }, [user, checkingClinic]);

  // Real-time subscription for clinic operating hours
  useEffect(() => {
    if (!clinic?.id) return;

    const hoursChannel = supabase
      .channel('clinic-operating-hours-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clinic_operating_hours',
          filter: `clinic_id=eq.${clinic.id}`,
        },
        (payload) => {
          console.log('🔄 Operating hours change detected:', payload.eventType);
          fetchClinicData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(hoursChannel);
    };
  }, [clinic?.id]);

  const fetchClinicData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch clinic data
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .select('id, name, email, contact_phone, contact_email, address, logo_url, description, specialties, registration_date, status')
        .eq('clinic_admin_id', user.id)
        .maybeSingle();

      if (clinicError) {
        console.error('Error fetching clinic:', clinicError);
        return;
      }

      if (clinicData) {
        setClinic(clinicData);

        // Fetch operating hours
        const { data: hoursData, error: hoursError } = await supabase
          .from('clinic_operating_hours')
          .select('day_of_week, opening_time, closing_time, is_closed')
          .eq('clinic_id', clinicData.id)
          .order('day_of_week', { ascending: true });

        if (hoursError) {
          console.error('Error fetching operating hours:', hoursError);
        } else {
          setOperatingHours(hoursData || []);
        }
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
      description: clinic.description || '',
      specialties: clinic.specialties || [],
      email: clinic.contact_email || clinic.email,
      phone: clinic.contact_phone || '',
      address: clinic.address || '',
    });
    setLogoFile(null);
    setLogoPreview(clinic.logo_url);
    setIsEditProfileModalOpen(true);
  };

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

      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const uploadLogoToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      const filePath = `clinic-logos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('clinic-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Error uploading logo:', error);
        if (error.message?.includes('Bucket not found')) {
          toast.error('Storage bucket not found. Please create "clinic-assets" bucket in Supabase Storage.');
        } else {
          toast.error(`Failed to upload logo: ${error.message || 'Unknown error'}`);
        }
        return null;
      }

      if (!data) return null;

      const { data: { publicUrl } } = supabase.storage
        .from('clinic-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Error in uploadLogoToStorage:', error);
      toast.error('Failed to upload logo');
      return null;
    }
  };

  const handleSaveProfile = async () => {
    if (!clinic) return;

    setSavingProfile(true);
    try {
      let logoUrl = clinic.logo_url;

      // Upload logo if a new one was selected
      if (logoFile) {
        logoUrl = await uploadLogoToStorage(logoFile);
        if (!logoUrl) {
          // Logo upload failed, but allow user to continue without logo
          console.warn('Logo upload failed, but continuing without logo');
        }
      }

      const { error } = await supabase
        .from('clinics')
        .update({
          name: editProfileForm.name,
          description: editProfileForm.description || null,
          specialties: editProfileForm.specialties.length > 0 ? editProfileForm.specialties : null,
          contact_email: editProfileForm.email,
          contact_phone: editProfileForm.phone || null,
          address: editProfileForm.address,
          logo_url: logoUrl || undefined,
        })
        .eq('id', clinic.id);

      if (error) throw error;

      toast.success('Clinic profile updated successfully');
      setIsEditProfileModalOpen(false);
      await fetchClinicData();
    } catch (error: any) {
      console.error('Error updating clinic profile:', error);
      toast.error('Failed to update clinic profile: ' + error.message);
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
        // Use the actual is_closed value from database
        hoursForm[day.value] = {
          opening: dayHours.is_closed ? '' : convertToDisplayTime(dayHours.opening_time),
          closing: dayHours.is_closed ? '' : convertToDisplayTime(dayHours.closing_time),
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
      // Delete existing operating hours
      await supabase
        .from('clinic_operating_hours')
        .delete()
        .eq('clinic_id', clinic.id);

      // Insert new operating hours
      const hoursToInsert = daysOfWeek.map(day => {
        const dayHours = editHoursForm[day.value] || { opening: '', closing: '', isClosed: true };
        // Use isClosed from form, or check if times are empty
        const isClosed = dayHours.isClosed || !dayHours.opening || !dayHours.closing;
        
        return {
          clinic_id: clinic.id,
          day_of_week: day.value,
          opening_time: isClosed ? null : convertToDatabaseTime(dayHours.opening),
          closing_time: isClosed ? null : convertToDatabaseTime(dayHours.closing),
          is_closed: isClosed,
        };
      });

      const { error } = await supabase
        .from('clinic_operating_hours')
        .insert(hoursToInsert);

      if (error) throw error;

      toast.success('Operating hours updated successfully');
      setIsEditHoursModalOpen(false);
      await fetchClinicData();
    } catch (error: any) {
      console.error('Error updating operating hours:', error);
      toast.error('Failed to update operating hours: ' + error.message);
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

  const availableSpecialties = [
    'Cardiology', 'Dentistry', 'Pediatrics', 'Orthopedics', 'Neurology',
    'Dermatology', 'Ophthalmology', 'Psychiatry', 'Oncology', 'Gastroenterology',
    'Endocrinology', 'Rheumatology', 'Urology', 'Gynecology', 'General Practice',
  ];

  if (checkingClinic) {
    return (
      <ProtectedRoute allowedRoles={['clinic_admin']}>
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
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
              Clinic Profile
            </h1>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading clinic profile...</p>
              </div>
            ) : clinic ? (
              <>
                {/* Clinic Header Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-[#00FFA2] rounded-lg flex items-center justify-center flex-shrink-0">
                        {clinic.logo_url ? (
                          <img
                            src={clinic.logo_url}
                            alt={clinic.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-white rounded"></div>
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                          {clinic.name}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          {clinic.description || 'Healthcare & Diagnostics'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleOpenEditProfile}
                      className="bg-[#00FFA2] hover:bg-[#00e68f] text-[#0C2243] px-6 py-2.5 rounded-lg font-medium flex items-center gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Profile
                    </Button>
                  </div>

                  {/* Contact Information */}
                  <div className="flex flex-wrap gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Email:</span>
                      <span className="text-sm text-gray-900 dark:text-white ml-2">
                        {clinic.contact_email || clinic.email}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone:</span>
                      <span className="text-sm text-gray-900 dark:text-white ml-2">
                        {clinic.contact_phone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Address:</span>
                      <span className="text-sm text-gray-900 dark:text-white ml-2">
                        {clinic.address || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* General Information Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    General Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">Clinic Name -</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {clinic.name}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">Description -</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {clinic.description || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">Specialties -</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {clinic.specialties && clinic.specialties.length > 0
                          ? clinic.specialties.join(', ')
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">Registered Since -</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {format(new Date(clinic.registration_date), 'MMMM yyyy')}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[140px]">Clinic ID -</span>
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
                      Working Hours
                    </h3>
                    <Button
                      onClick={handleOpenEditHours}
                      className="bg-[#00FFA2] hover:bg-[#00e68f] text-[#0C2243] px-6 py-2.5 rounded-lg font-medium flex items-center gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Hours
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Day
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Opening
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Closing
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
                                {day.label}
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
                <p className="text-gray-500 dark:text-gray-400">No clinic data found</p>
              </div>
            )}
          </div>
        </main>

        {/* Edit Profile Modal */}
        <Dialog open={isEditProfileModalOpen} onOpenChange={setIsEditProfileModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                Edit Clinic Profile
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Clinic Logo */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Clinic Logo
                </Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-[#0C2243] rounded-lg flex items-center justify-center flex-shrink-0">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Clinic logo"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-[#00FFA2] rounded"></div>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      variant="outline"
                      className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Change logo
                    </Button>
                  </div>
                </div>
              </div>

              {/* Clinic Name */}
              <div>
                <Label htmlFor="clinic-name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Clinic Name
                </Label>
                <Input
                  id="clinic-name"
                  type="text"
                  value={editProfileForm.name}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                  className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Enter clinic name"
                />
              </div>

              {/* Specialties */}
              <div>
                <Label htmlFor="specialties" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Specialties
                </Label>
                <div className="space-y-2">
                  {/* Selected Specialties as Tags */}
                  {editProfileForm.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editProfileForm.specialties.map((specialty) => (
                        <span
                          key={specialty}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium"
                        >
                          {specialty}
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
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSpecialties
                        .filter(s => !editProfileForm.specialties.includes(s))
                        .map((specialty) => (
                          <SelectItem key={specialty} value={specialty}>
                            {specialty}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={editProfileForm.email}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                  className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Enter email"
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={editProfileForm.phone}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                  className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Enter phone number"
                />
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Address
                </Label>
                <Input
                  id="address"
                  type="text"
                  value={editProfileForm.address}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, address: e.target.value })}
                  className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Enter address"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={editProfileForm.description}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Enter clinic description"
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
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="bg-[#0C2243] dark:bg-[#00FFA2] hover:bg-[#0a1a35] dark:hover:bg-[#00FFA2]/90 text-white dark:text-[#0C2243] px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Hours Modal */}
        <Dialog open={isEditHoursModalOpen} onOpenChange={setIsEditHoursModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                Edit Hours
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                        Days
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                        Opening
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                        Closing
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {daysOfWeek.map((day) => {
                      const dayHours = editHoursForm[day.value] || { opening: '', closing: '', isClosed: true };
                      return (
                        <tr key={day.value} className="border-b border-gray-200 dark:border-gray-700">
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {day.label}
                          </td>
                          <td className="py-3 px-4">
                            <Select
                              value={dayHours.opening || ''}
                              onValueChange={(value) => {
                                setEditHoursForm(prev => ({
                                  ...prev,
                                  [day.value]: { 
                                    ...prev[day.value], 
                                    opening: value, 
                                    closing: prev[day.value]?.closing || '', 
                                    isClosed: false 
                                  },
                                }));
                              }}
                            >
                              <SelectTrigger className="h-10 w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                                <SelectValue placeholder="Select time" />
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
                              <SelectTrigger className="h-10 w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                                <SelectValue placeholder="Select time" />
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
                Cancel
              </Button>
              <Button
                onClick={handleSaveHours}
                disabled={savingHours}
                className="bg-[#0C2243] dark:bg-[#00FFA2] hover:bg-[#0a1a35] dark:hover:bg-[#00FFA2]/90 text-white dark:text-[#0C2243] px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingHours ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default ClinicAdminClinicProfile;
