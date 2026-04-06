import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClinicAdminSidebar from '@/components/clinic-admin/ClinicAdminSidebar';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, MoreVertical, ChevronDown, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTableSort } from '@/hooks/useTableSort';
import { TableSortHeader } from '@/components/ui/TableSortHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string | null;
  phone: string | null;
  availability: string | null;
  services?: string | null; // Services column from database (comma-separated)
  price?: string | number | null;
  status: 'active' | 'inactive' | 'on-leave';
}

interface Treatment {
  id: string;
  name: string; // Treatment/Machine name or Doctor name
  specialty: string;
  service: string;
  description: string; // Working hours or description
  price: string; // Price or phone number
  status: 'active' | 'inactive';
  doctorId?: string; // Link to doctor if it's a doctor-based treatment
}

interface Clinic {
  id: string;
  name: string;
  logo_url: string | null;
}

interface OperatingHour {
  day_of_week: number;
  opening_time: string | null;
  closing_time: string | null;
  is_closed: boolean;
}

interface AvailabilityEntry {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const ClinicAdminDoctors = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'doctors' | 'treatment'>('doctors');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'on-leave'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [clinicOperatingHours, setClinicOperatingHours] = useState<OperatingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingClinic, setCheckingClinic] = useState(true);
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [showEditDoctorModal, setShowEditDoctorModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);
  const [showAddTreatmentModal, setShowAddTreatmentModal] = useState(false);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
  const [tempSelectedSpecialty, setTempSelectedSpecialty] = useState<string>('all');
  const [showRequestServiceModal, setShowRequestServiceModal] = useState(false);
  const [showRequestSpecialtyModal, setShowRequestSpecialtyModal] = useState(false);
  const [showRequestSuccessModal, setShowRequestSuccessModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newSpecialtyName, setNewSpecialtyName] = useState('');
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    gender: '',
    email: '',
    phone: '',
    specialties: [] as string[],
    services: [] as string[],
    experience: '',
    status: '',
    price: '',
    availability: '',
  });
  const [newAvailabilityDraft, setNewAvailabilityDraft] = useState({
    day_of_week: '',
    start_time: '',
    end_time: '',
  });
  const [newDoctorAvailabilityEntries, setNewDoctorAvailabilityEntries] = useState<AvailabilityEntry[]>([]);
  const [editDoctor, setEditDoctor] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    status: '',
    availability: '',
    price: '',
  });
  const [editAvailabilityDraft, setEditAvailabilityDraft] = useState({
    day_of_week: '',
    start_time: '',
    end_time: '',
  });
  const [editDoctorAvailabilityEntries, setEditDoctorAvailabilityEntries] = useState<AvailabilityEntry[]>([]);
  
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [newTreatment, setNewTreatment] = useState({
    name: '',
    description: '',
    price: '',
    specialties: [] as string[],
    services: [] as string[],
  });
  const [showTreatmentSpecialtyDropdown, setShowTreatmentSpecialtyDropdown] = useState(false);
  const [showTreatmentServiceDropdown, setShowTreatmentServiceDropdown] = useState(false);

  const dayLabels: Record<number, string> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };

  const formatDbTimeTo12h = (time?: string | null) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const displayTimeToMinutes = (displayTime: string) => {
    const [time, period] = displayTime.split(' ');
    const [hourRaw, minuteRaw] = time.split(':').map(Number);
    let hour24 = hourRaw % 12;
    if (period === 'PM') hour24 += 12;
    return hour24 * 60 + minuteRaw;
  };

  const minutesToDisplayTime = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const dbTimeToMinutes = (dbTime: string) => {
    const [h, m] = dbTime.split(':').map(Number);
    return h * 60 + m;
  };

  const getTimeSlotsForDay = (dayOfWeek: number) => {
    const hours = clinicOperatingHours.find(
      (h) => h.day_of_week === dayOfWeek && !h.is_closed && h.opening_time && h.closing_time
    );
    if (!hours?.opening_time || !hours?.closing_time) return [];

    const startMinutes = dbTimeToMinutes(hours.opening_time);
    const endMinutes = dbTimeToMinutes(hours.closing_time);
    const slots: string[] = [];

    for (let current = startMinutes; current <= endMinutes; current += 30) {
      slots.push(minutesToDisplayTime(current));
    }
    return slots;
  };

  const getEndTimeSlots = (dayOfWeek: number, startTime: string) => {
    if (!startTime) return [];
    const startMinutes = displayTimeToMinutes(startTime);
    return getTimeSlotsForDay(dayOfWeek).filter((slot) => displayTimeToMinutes(slot) > startMinutes);
  };

  const openClinicDays = clinicOperatingHours
    .filter((h) => !h.is_closed && h.opening_time && h.closing_time)
    .sort((a, b) => a.day_of_week - b.day_of_week);

  const buildAvailabilityString = (entries: AvailabilityEntry[]) =>
    entries
      .sort((a, b) => a.day_of_week - b.day_of_week)
      .map((entry) => `${dayLabels[entry.day_of_week]}: ${entry.start_time} - ${entry.end_time}`)
      .join(' | ');

  const parseAvailabilityString = (availability: string | null): AvailabilityEntry[] => {
    if (!availability) return [];
    const dayToNumber: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    return availability
      .split('|')
      .map((part) => part.trim())
      .map((part) => {
        const match = part.match(/^([A-Za-z]+):\s*(.+)\s-\s(.+)$/);
        if (!match) return null;
        const [, dayName, start, end] = match;
        const day_of_week = dayToNumber[dayName];
        if (day_of_week === undefined) return null;
        return { day_of_week, start_time: start.trim(), end_time: end.trim() } as AvailabilityEntry;
      })
      .filter((entry): entry is AvailabilityEntry => entry !== null);
  };

  const addAvailabilityEntry = (
    draft: { day_of_week: string; start_time: string; end_time: string },
    existing: AvailabilityEntry[],
    setEntries: React.Dispatch<React.SetStateAction<AvailabilityEntry[]>>,
    setDraft: React.Dispatch<React.SetStateAction<{ day_of_week: string; start_time: string; end_time: string }>>
  ) => {
    if (!draft.day_of_week || !draft.start_time || !draft.end_time) {
      toast.error(t('Please select day, start time, and end time'));
      return;
    }

    const dayOfWeek = Number(draft.day_of_week);
    const updatedEntries = existing.filter((entry) => entry.day_of_week !== dayOfWeek);
    updatedEntries.push({
      day_of_week: dayOfWeek,
      start_time: draft.start_time,
      end_time: draft.end_time,
    });

    setEntries(updatedEntries);
    setDraft({ day_of_week: '', start_time: '', end_time: '' });
  };

  // Fetch super admin specialties and services
  useEffect(() => {
    const fetchSuperAdminData = async () => {
      try {
        setLoadingSpecialties(true);
        
        // Fetch specialties via backend
        const { specialties: specialtiesData } = await api.adminServices.getSpecialties();

        if (specialtiesData) {
          setAvailableSpecialties(specialtiesData.map((s: any) => s.name));
        }

        // Services will be fetched when a specialty is selected
      } catch (error) {
        console.error('Error fetching super admin data:', error);
      } finally {
        setLoadingSpecialties(false);
      }
    };

    fetchSuperAdminData();
  }, []);

  // Fetch services for selected specialty
  // Priority: Treatment specialties > Doctor specialties
  useEffect(() => {
    const fetchServicesForSpecialty = async () => {
      // Determine which specialties to use based on which modal is open
      // If treatment modal is open, use treatment specialties; otherwise use doctor specialties
      const specialtiesToUse = showAddTreatmentModal && newTreatment.specialties.length > 0
        ? newTreatment.specialties
        : newDoctor.specialties;

      if (specialtiesToUse.length === 0) {
        setAvailableServices([]);
        return;
      }

      try {
        // Get the first selected specialty (primary specialty)
        const selectedSpecialtyName = specialtiesToUse[0];
        
        const [{ specialties }, { services: servicesData }] = await Promise.all([
          api.adminServices.getSpecialties(),
          api.adminServices.getServices(),
        ]);
        const specialtyData = specialties.find((s: any) => s.name === selectedSpecialtyName && s.is_active);

        if (!specialtyData) {
          console.error('Error: Specialty not found');
          setAvailableServices([]);
          return;
        }

        const filteredServices = servicesData
          .filter((s: any) => s.specialty_id === specialtyData.id && s.is_active)
          .map((s: any) => s.name)
          .sort();
        
        setAvailableServices(filteredServices);
      } catch (error) {
        console.error('Error fetching services:', error);
        setAvailableServices([]);
      }
    };

    fetchServicesForSpecialty();
  }, [newDoctor.specialties, newTreatment.specialties, showAddTreatmentModal]);

  useEffect(() => {
    const checkClinicExists = async () => {
      if (!user) return;

      try {
        console.log('📡 Checking clinic via backend for admin:', user.id);
        const { clinic: clinicData } = await api.clinics.getClinicByAdmin(user.id);

        if (!clinicData || clinicData.status === 'pending') {
          navigate('/clinic-admin/onboarding', { replace: true });
          return;
        }

        setClinic(clinicData);
        setCheckingClinic(false);
      } catch (error) {
        console.error('❌ Error in checkClinicExists:', error);
        setCheckingClinic(false);
      }
    };

    checkClinicExists();
  }, [user, navigate]);

  useEffect(() => {
    if (clinic?.id) {
      fetchClinicData(clinic.id);
    }
  }, [clinic?.id]);

  // Real-time subscriptions removed - using backend API instead
  useEffect(() => {
    if (!clinic?.id) return;
    // Polling or manual refresh can be added here if needed
  }, [clinic?.id]);

  // Real-time subscription removed - using backend API instead

  const fetchClinicData = async (clinicId: string) => {
    try {
      setLoading(true);
      console.log('🔍 Fetching doctors and treatments for clinic via backend:', clinicId);

      const [
        { doctors: doctorsData },
        { treatments: treatmentsData },
        { operatingHours: operatingHoursData },
      ] = await Promise.all([
        api.doctors.getDoctors(clinicId),
        api.clinicAdmin.getTreatments(),
        api.clinicAdmin.getClinic(),
      ]);

      if (!doctorsData) {
        console.error('❌ No doctors data returned');
        setDoctors([]);
      } else {
        console.log('✅ Doctors fetched from backend:', doctorsData.length);
        setDoctors(doctorsData);
      }

      console.log('✅ Treatments fetched:', treatmentsData?.length || 0);
      const transformedTreatments: Treatment[] = (treatmentsData || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        specialty: t.specialty || '',
        service: t.service || '',
        description: t.description || '',
        price: t.price || '',
        status: t.status as 'active' | 'inactive',
      }));
      setTreatments(transformedTreatments);
      setClinicOperatingHours(operatingHoursData || []);
    } catch (error) {
      console.error('❌ Error fetching clinic data:', error);
      setDoctors([]);
      setTreatments([]);
      setClinicOperatingHours([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async (clinicId: string) => {
    try {
      setLoading(true);
      console.log('🔍 Fetching doctors for clinic via backend:', clinicId);

      const { doctors: doctorsData } = await api.doctors.getDoctors(clinicId);

      if (!doctorsData) {
        console.error('❌ No doctors data returned');
        setDoctors([]);
      } else {
        console.log('✅ Doctors fetched from backend:', doctorsData.length);
        setDoctors(doctorsData);
      }

      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching doctors:', error);
      setLoading(false);
    }
  };

  const fetchTreatments = async (clinicId: string) => {
    try {
      setLoading(true);
      console.log('🔍 Fetching treatments for clinic:', clinicId);

      const { treatments: treatmentsData } = await api.clinicAdmin.getTreatments();

      console.log('✅ Treatments fetched:', treatmentsData?.length || 0);
      // Transform database data to Treatment interface
      const transformedTreatments: Treatment[] = (treatmentsData || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        specialty: t.specialty || '',
        service: t.service || '',
        description: t.description || '',
        price: t.price || '',
        status: t.status as 'active' | 'inactive',
      }));
      setTreatments(transformedTreatments);

      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching treatments:', error);
      setLoading(false);
      setTreatments([]);
    }
  };

  const handleAddDoctor = async () => {
    if (!clinic?.id) return;

    try {
      // Trim and validate name
      const trimmedName = newDoctor.name?.trim();
      console.log('🔍 Validating doctor:', {
        name: trimmedName,
        nameLength: trimmedName?.length,
        specialties: newDoctor.specialties,
        specialtiesCount: newDoctor.specialties.length,
      });

      if (!trimmedName || trimmedName.length === 0) {
        toast.error(t('Please fill in doctor name'));
        return;
      }

      if (newDoctor.specialties.length === 0) {
        toast.error(t('Please select at least one specialty'));
        return;
      }

      if (newDoctorAvailabilityEntries.length === 0) {
        toast.error(t('Please add at least one availability slot'));
        return;
      }

      // Use the first specialty as primary for now (database structure)
      const primarySpecialty = newDoctor.specialties[0];

      // Convert services array to comma-separated string for storage
      const servicesString = newDoctor.services.length > 0 
        ? newDoctor.services.join(',') 
        : null;

      const availabilityString = buildAvailabilityString(newDoctorAvailabilityEntries);

      await api.doctors.createDoctor({
        clinic_id: clinic.id,
        name: trimmedName,
        specialty: primarySpecialty, // Store first specialty as primary
        email: newDoctor.email?.trim() || null,
        phone: newDoctor.phone?.trim() || null,
        availability: availabilityString || null,
        services: servicesString, // Store services as comma-separated string
        status: (newDoctor.status || 'active') as 'active' | 'inactive' | 'on-leave',
        price: newDoctor.price?.trim() || null,
      });

      toast.success(t('Doctor added successfully'));
      setShowAddDoctorModal(false);
      setNewDoctor({
        name: '',
        gender: '',
        email: '',
        phone: '',
        specialties: [],
        services: [],
        experience: '',
        status: '',
        price: '',
        availability: '',
      });
      setNewDoctorAvailabilityEntries([]);
      setNewAvailabilityDraft({ day_of_week: '', start_time: '', end_time: '' });
      fetchDoctors(clinic.id);
    } catch (error) {
      console.error('❌ Error adding doctor:', error);
      toast.error(t('Failed to add doctor'));
    }
  };

  const handleAddSpecialty = (specialty: string) => {
    if (!newDoctor.specialties.includes(specialty)) {
      // Clear services when specialty changes to ensure only services for new specialty are shown
      setNewDoctor({ ...newDoctor, specialties: [specialty], services: [] });
    }
    setShowSpecialtyDropdown(false);
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setNewDoctor({ ...newDoctor, specialties: newDoctor.specialties.filter(s => s !== specialty) });
  };

  const handleAddService = (service: string) => {
    if (!newDoctor.services.includes(service)) {
      setNewDoctor({ ...newDoctor, services: [...newDoctor.services, service] });
    }
    setShowServiceDropdown(false);
  };

  const handleRemoveService = (service: string) => {
    setNewDoctor({ ...newDoctor, services: newDoctor.services.filter(s => s !== service) });
  };

  const handleRequestNewService = () => {
    console.log('handleRequestNewService called');
    setShowServiceDropdown(false);
    // Use requestAnimationFrame to ensure state updates properly
    requestAnimationFrame(() => {
      console.log('Opening request service modal');
      setShowRequestServiceModal(true);
    });
  };

  const handleRequestNewSpecialty = () => {
    console.log('handleRequestNewSpecialty called');
    setShowSpecialtyDropdown(false);
    // Use requestAnimationFrame to ensure state updates properly
    requestAnimationFrame(() => {
      console.log('Opening request specialty modal');
      setShowRequestSpecialtyModal(true);
    });
  };

  const handleSubmitServiceRequest = async () => {
    if (!newServiceName.trim()) {
      toast.error(t('Please enter a service name'));
      return;
    }

    if (!clinic?.id || !user) {
      toast.error(t('Clinic information not found'));
      return;
    }

    if (newDoctor.specialties.length === 0) {
      toast.error(t('Please select a specialty first'));
      return;
    }

    try {
      // Get the specialty ID from the selected specialty name
      const selectedSpecialtyName = newDoctor.specialties[0];
      const { specialties } = await api.adminServices.getSpecialties();
      const specialtyData = specialties.find((s: any) => s.name === selectedSpecialtyName && s.is_active);

      if (!specialtyData) {
        console.error('Error: Specialty not found');
        toast.error(t('Specialty not found. Please select a valid specialty.'));
        return;
      }

      // Create service request via backend
      await api.clinicAdmin.createServiceRequest(specialtyData.id, newServiceName.trim());

      console.log('✅ Service request submitted successfully');
      toast.success(t('Service request submitted successfully!'));
      
      setShowRequestServiceModal(false);
      setNewServiceName('');
      setShowRequestSuccessModal(true);
      
      // Auto close success modal after 3 seconds
      setTimeout(() => {
        setShowRequestSuccessModal(false);
      }, 3000);
    } catch (error) {
      console.error('❌ Error submitting service request:', error);
      toast.error(t('Failed to submit service request. Please try again.'));
    }
  };

  const handleSubmitSpecialtyRequest = async () => {
    if (!newSpecialtyName.trim()) {
      toast.error(t('Please enter a specialty name'));
      return;
    }

    if (!clinic?.id || !user) {
      toast.error(t('Clinic information not found'));
      return;
    }

    try {
      // Create specialty request via backend
      await api.clinicAdmin.createSpecialtyRequest(newSpecialtyName.trim());

      console.log('✅ Specialty request submitted successfully');
      toast.success(t('Specialty request submitted successfully!'));
      
      setShowRequestSpecialtyModal(false);
      setNewSpecialtyName('');
      setShowRequestSuccessModal(true);
      
      // Auto close success modal after 3 seconds
      setTimeout(() => {
        setShowRequestSuccessModal(false);
      }, 3000);
    } catch (error) {
      console.error('❌ Error submitting specialty request:', error);
      toast.error(t('Failed to submit specialty request. Please try again.'));
    }
  };

  const handleOpenEditDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setEditDoctorAvailabilityEntries(parseAvailabilityString(doctor.availability));
    setEditAvailabilityDraft({ day_of_week: '', start_time: '', end_time: '' });
    setEditDoctor({
      name: doctor.name || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
      specialty: doctor.specialty || '',
      status: doctor.status || 'active',
      availability: doctor.availability || '',
      price: doctor.price !== null && doctor.price !== undefined ? String(doctor.price) : '',
    });
    setShowEditDoctorModal(true);
  };

  const handleSaveEditDoctor = async () => {
    if (!clinic?.id || !selectedDoctor) return;

    try {
      const trimmedName = editDoctor.name?.trim();
      if (!trimmedName || trimmedName.length === 0) {
        toast.error(t('Please fill in doctor name'));
        return;
      }

      const availabilityString = buildAvailabilityString(editDoctorAvailabilityEntries);

      await api.doctors.updateDoctor(selectedDoctor.id, {
        name: trimmedName,
        email: editDoctor.email?.trim() || null,
        phone: editDoctor.phone?.trim() || null,
        specialty: editDoctor.specialty || null,
        status: editDoctor.status as 'active' | 'inactive' | 'on-leave',
        availability: availabilityString || null,
        price: editDoctor.price?.trim() || null,
      });

      toast.success(t('Doctor updated successfully'));
      setShowEditDoctorModal(false);
      setSelectedDoctor(null);
      setEditDoctorAvailabilityEntries([]);
      setEditAvailabilityDraft({ day_of_week: '', start_time: '', end_time: '' });
      fetchDoctors(clinic.id);
    } catch (error) {
      console.error('❌ Error updating doctor:', error);
      toast.error(t('Failed to update doctor'));
    }
  };

  const handleOpenDeleteConfirm = (doctor: Doctor) => {
    setDoctorToDelete(doctor);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!clinic?.id || !doctorToDelete) return;

    try {
      await api.doctors.deleteDoctor(doctorToDelete.id);

      toast.success(t('Doctor deleted successfully'));
      setShowDeleteConfirmModal(false);
      setDoctorToDelete(null);
      fetchDoctors(clinic.id);
    } catch (error) {
      console.error('❌ Error deleting doctor:', error);
      toast.error(t('Failed to delete doctor'));
    }
  };

  const handleAddTreatment = async () => {
    if (!clinic?.id) {
      toast.error(t('Clinic not found'));
      return;
    }

    try {
      // Validate required fields
      if (!newTreatment.name.trim()) {
        toast.error(t('Please enter treatment/machine name'));
        return;
      }

      if (newTreatment.specialties.length === 0) {
        toast.error(t('Please select at least one specialty'));
        return;
      }

      if (newTreatment.services.length === 0) {
        toast.error(t('Please select at least one service'));
        return;
      }

      // Save to database via backend
      await api.clinicAdmin.createTreatment({
        clinic_id: clinic.id,
        name: newTreatment.name.trim(),
        description: newTreatment.description?.trim() || null,
        price: newTreatment.price?.trim() || null,
        specialty: newTreatment.specialties.join(', '), // Comma-separated specialties
        service: newTreatment.services.join(', '), // Comma-separated services
        status: 'active',
      });

      toast.success(t('Treatment added successfully'));
      setShowAddTreatmentModal(false);
      setNewTreatment({
        name: '',
        description: '',
        price: '',
        specialties: [],
        services: [],
      });
      fetchTreatments(clinic.id);
    } catch (error) {
      console.error('❌ Error adding treatment:', error);
      toast.error(t('Failed to add treatment'));
    }
  };

  const handleAddTreatmentSpecialty = (specialty: string) => {
    if (!newTreatment.specialties.includes(specialty)) {
      setNewTreatment({ ...newTreatment, specialties: [...newTreatment.specialties, specialty] });
    }
    setShowTreatmentSpecialtyDropdown(false);
  };

  const handleRemoveTreatmentSpecialty = (specialty: string) => {
    setNewTreatment({ ...newTreatment, specialties: newTreatment.specialties.filter(s => s !== specialty) });
  };

  const handleAddTreatmentService = (service: string) => {
    if (!newTreatment.services.includes(service)) {
      setNewTreatment({ ...newTreatment, services: [...newTreatment.services, service] });
    }
    setShowTreatmentServiceDropdown(false);
  };

  const handleRemoveTreatmentService = (service: string) => {
    setNewTreatment({ ...newTreatment, services: newTreatment.services.filter(s => s !== service) });
  };

  const handleSelectAll = () => {
    if (selectedDoctors.length === filteredDoctors.length) {
      setSelectedDoctors([]);
    } else {
      setSelectedDoctors(filteredDoctors.map(d => d.id));
    }
  };

  const handleSelectDoctor = (doctorId: string) => {
    setSelectedDoctors((prev) =>
      prev.includes(doctorId) ? prev.filter((id) => id !== doctorId) : [...prev, doctorId]
    );
  };

  // Get unique specialties
  const uniqueSpecialties = Array.from(new Set(doctors.map(d => d.specialty))).sort();

  // Filter doctors
  const filteredDoctorsData = doctors.filter((doctor) => {
    const matchesStatus = statusFilter === 'all' || doctor.status === statusFilter;
    const matchesSpecialty = selectedSpecialty === 'all' || doctor.specialty === selectedSpecialty;
    const matchesSearch = searchQuery === '' ||
      doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSpecialty && matchesSearch;
  });

  // Use table sort hook for doctors
  const { sortedData: filteredDoctors, handleSort: handleDoctorsSort, getSortDirection: getDoctorsSortDirection } = useTableSort<Doctor>(
    filteredDoctorsData
  );

  // Filter treatments
  const filteredTreatmentsData = treatments.filter((treatment) => {
    const matchesStatus = statusFilter === 'all' || treatment.status === statusFilter;
    const matchesSpecialty = selectedSpecialty === 'all' || treatment.specialty === selectedSpecialty;
    const matchesSearch = searchQuery === '' ||
      treatment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      treatment.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      treatment.service.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSpecialty && matchesSearch;
  });

  // Use table sort hook for treatments
  const { sortedData: filteredTreatments, handleSort: handleTreatmentsSort, getSortDirection: getTreatmentsSortDirection } = useTableSort<Treatment>(
    filteredTreatmentsData
  );

  const handleSelectAllTreatments = () => {
    if (selectedTreatments.length === filteredTreatments.length) {
      setSelectedTreatments([]);
    } else {
      setSelectedTreatments(filteredTreatments.map(t => t.id));
    }
  };

  const handleSelectTreatment = (treatmentId: string) => {
    setSelectedTreatments((prev) =>
      prev.includes(treatmentId) ? prev.filter((id) => id !== treatmentId) : [...prev, treatmentId]
    );
  };

  // Calculate statistics
  const stats = {
    totalDoctors: doctors.length,
    totalTreatment: treatments.length,
    activeDoctors: doctors.filter(d => d.status === 'active').length,
    activeTreatment: treatments.filter(t => t.status === 'active').length,
  };

  const getStatusLabel = (status: Doctor['status']) => {
    const statusConfig = {
      active: t('Active'),
      inactive: t('Inactive'),
      'on-leave': t('On Leave'),
    };
    return statusConfig[status];
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
            {/* Page Header */}
            <div className="flex items-start justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('Doctors & Treatment')}</h1>
              
              {/* Clinic Name and Logo - Top Right */}
              <div className="flex items-center gap-3">
                {clinic?.logo_url && (
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                    <img
                      src={clinic.logo_url}
                      alt={clinic.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                {!clinic?.logo_url && (
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#0C2243] font-bold text-lg">
                      {clinic?.name?.charAt(0).toUpperCase() || 'C'}
                    </span>
                  </div>
                )}
                <span className="text-gray-900 dark:text-white font-medium text-base">
                  {clinic?.name || t('Clinic')}
                </span>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t('Total Doctors')}
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.totalDoctors}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('All registered practitioners in your clinic')}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t('Total Treatment')}
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.totalTreatment}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('All registered practitioners in your clinic')}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t('Active Doctors')}
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.activeDoctors}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('Currently available for appointments.')}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t('Active Treatment')}
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.activeTreatment}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('Currently available for appointments.')}
                </p>
              </div>
            </div>

            {/* Toggle Switch - Full Width */}
            <div className="mb-6 w-full">
              <div className="relative flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 w-full">
                <button
                  onClick={() => setViewMode('doctors')}
                  className={`relative flex-1 px-6 py-2 rounded-md text-sm font-medium transition-all z-10 ${
                    viewMode === 'doctors'
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {t('Doctors')}
                </button>
                <button
                  onClick={() => setViewMode('treatment')}
                  className={`relative flex-1 px-6 py-2 rounded-md text-sm font-medium transition-all z-10 ${
                    viewMode === 'treatment'
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {t('Treatment')}
                </button>
                {/* Blue background for selected option - exactly 50% */}
                {viewMode === 'doctors' && (
                  <div
                    className="absolute top-1 bottom-1 left-1 rounded-md bg-[#0C2243] transition-all duration-300 ease-in-out z-0"
                    style={{
                      width: 'calc(50% - 4px)',
                    }}
                  />
                )}
                {viewMode === 'treatment' && (
                  <div
                    className="absolute top-1 bottom-1 right-1 rounded-md bg-[#0C2243] transition-all duration-300 ease-in-out z-0"
                    style={{
                      width: 'calc(50% - 4px)',
                    }}
                  />
                )}
                {/* Green background for unselected option - exactly 50% */}
                {viewMode === 'doctors' && (
                  <div
                    className="absolute top-1 bottom-1 right-1 rounded-md bg-[#00FFA2] transition-all duration-300 ease-in-out z-0"
                    style={{
                      width: 'calc(50% - 4px)',
                    }}
                  />
                )}
                {viewMode === 'treatment' && (
                  <div
                    className="absolute top-1 bottom-1 left-1 rounded-md bg-[#00FFA2] transition-all duration-300 ease-in-out z-0"
                    style={{
                      width: 'calc(50% - 4px)',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Filters and Actions */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4">
                {/* Left Side: Status Filters and Search */}
                <div className="flex-1 space-y-4">
                  {/* Status Filters */}
                  <div className="flex items-center gap-2">
                    {(['all', 'active', 'on-leave', 'inactive'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          statusFilter === status
                            ? 'bg-[#00FFA2] text-[#0C2243]'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {status === 'all' ? t('All') : status === 'on-leave' ? t('On Leave') : t(status.charAt(0).toUpperCase() + status.slice(1))}
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder={t('Search by specialties, doctor, or service...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 w-full"
                    />
                  </div>
                </div>

                {/* Right Side: Specialty Dropdown and Action Buttons */}
                <div className="flex flex-col items-end gap-4">
                  {/* Specialty Button - Opens Modal */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTempSelectedSpecialty(selectedSpecialty);
                      setShowSpecialtyModal(true);
                    }}
                    className="w-[180px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 justify-between"
                  >
                    <span>{t('Specialty')}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddTreatmentModal(true)}
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('Add a Treatment')}
                    </Button>

                    <Button
                      onClick={() => setShowAddDoctorModal(true)}
                      className="bg-[#00FFA2] hover:bg-[#00e68a] text-[#0C2243] font-medium px-6"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('Add New Doctor')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Doctors/Treatments Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('Loading {{type}}...', { type: viewMode === 'doctors' ? t('doctors') : t('treatments') })}
                  </p>
                </div>
              ) : viewMode === 'doctors' && filteredDoctors.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <th className="text-left py-4 px-6">
                          <input
                            type="checkbox"
                            checked={selectedDoctors.length === filteredDoctors.length && filteredDoctors.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                          />
                        </th>
                        <TableSortHeader
                          sortDirection={getDoctorsSortDirection('name')}
                          onSort={() => handleDoctorsSort('name')}
                        >
                          {t("Doctor's / Treatment")}
                        </TableSortHeader>
                        <TableSortHeader
                          sortDirection={getDoctorsSortDirection('specialty')}
                          onSort={() => handleDoctorsSort('specialty')}
                        >
                          {t('Specialty and service')}
                        </TableSortHeader>
                        <TableSortHeader
                          sortDirection={getDoctorsSortDirection('availability')}
                          onSort={() => handleDoctorsSort('availability')}
                        >
                          {t('Availability')}
                        </TableSortHeader>
                        <TableSortHeader
                          sortDirection={getDoctorsSortDirection('contact')}
                          onSort={() => handleDoctorsSort('contact')}
                        >
                          {t('Contact')}
                        </TableSortHeader>
                        <TableSortHeader
                          sortDirection={getDoctorsSortDirection('status')}
                          onSort={() => handleDoctorsSort('status')}
                        >
                          {t('Status')}
                        </TableSortHeader>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                          {t('Action')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDoctors.map((doctor) => (
                        <tr
                          key={doctor.id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="py-4 px-6">
                            <input
                              type="checkbox"
                              checked={selectedDoctors.includes(doctor.id)}
                              onChange={() => handleSelectDoctor(doctor.id)}
                              className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                            />
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-900 dark:text-white font-medium">
                              {doctor.name}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {doctor.specialty}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {doctor.availability || t('N/A')}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {doctor.phone || doctor.email || t('N/A')}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                doctor.status === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : doctor.status === 'inactive'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}
                            >
                              {getStatusLabel(doctor.status)}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEditDoctor(doctor)}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={async () => {
                                  if (!clinic?.id) return;
                                  try {
                                    const newStatus = doctor.status === 'active' ? 'inactive' : 'active';
                                    
                                    // Optimistic UI update - update immediately
                                    setDoctors(prevDoctors => 
                                      prevDoctors.map(d => 
                                        d.id === doctor.id 
                                          ? { ...d, status: newStatus }
                                          : d
                                      )
                                    );
                                    
                                    await api.doctors.updateDoctor(doctor.id, { status: newStatus });
                                    toast.success(
                                      t('Doctor {{status}} successfully', {
                                        status: newStatus === 'active' ? t('activated') : t('deactivated'),
                                      })
                                    );
                                    
                                    // Refresh to ensure data is in sync with database
                                    await fetchDoctors(clinic.id);
                                  } catch (error: any) {
                                    console.error('❌ Error updating doctor status:', error);
                                    toast.error(error?.message || t('Failed to update doctor status'));
                                    
                                    // Revert optimistic update on error
                                    await fetchDoctors(clinic.id);
                                  }
                                }}>
                                  {doctor.status === 'active' ? t('Deactivate') : t('Activate')}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleOpenDeleteConfirm(doctor)}
                                  className="text-red-600"
                                >
                                  {t('Delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : viewMode === 'treatment' && filteredTreatments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <th className="text-left py-4 px-6">
                          <input
                            type="checkbox"
                            checked={selectedTreatments.length === filteredTreatments.length && filteredTreatments.length > 0}
                            onChange={handleSelectAllTreatments}
                            className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                          />
                        </th>
                        <TableSortHeader
                          sortDirection={getTreatmentsSortDirection('name')}
                          onSort={() => handleTreatmentsSort('name')}
                        >
                          {t('Treatment')}
                        </TableSortHeader>
                        <TableSortHeader
                          sortDirection={getTreatmentsSortDirection('specialty')}
                          onSort={() => handleTreatmentsSort('specialty')}
                        >
                          {t('Specialty and service')}
                        </TableSortHeader>
                        <TableSortHeader
                          sortDirection={getTreatmentsSortDirection('description')}
                          onSort={() => handleTreatmentsSort('description')}
                        >
                          {t('Description')}
                        </TableSortHeader>
                        <TableSortHeader
                          sortDirection={getTreatmentsSortDirection('price')}
                          onSort={() => handleTreatmentsSort('price')}
                        >
                          {t('Price ($)')}
                        </TableSortHeader>
                        <TableSortHeader
                          sortDirection={getTreatmentsSortDirection('status')}
                          onSort={() => handleTreatmentsSort('status')}
                        >
                          {t('Status')}
                        </TableSortHeader>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white">
                          {t('Action')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTreatments.map((treatment) => (
                        <tr
                          key={treatment.id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="py-4 px-6">
                            <input
                              type="checkbox"
                              checked={selectedTreatments.includes(treatment.id)}
                              onChange={() => handleSelectTreatment(treatment.id)}
                              className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                            />
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-900 dark:text-white font-medium">
                              {treatment.name}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {treatment.specialty}{treatment.service ? `, ${treatment.service}` : ''}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {treatment.description}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {treatment.price}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                treatment.status === 'active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              }`}
                            >
                              {treatment.status === 'active' ? t('Active') : t('Inactive')}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  // TODO: Edit treatment (can be implemented later)
                                  console.log('Edit treatment:', treatment.id);
                                  toast.info(t('Edit treatment functionality coming soon'));
                                }}>
                                  {t('Edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={async () => {
                                  if (!clinic?.id) return;
                                  try {
                                    const newStatus = treatment.status === 'active' ? 'inactive' : 'active';
                                    await api.clinicAdmin.updateTreatment(treatment.id, { status: newStatus });
                                    fetchTreatments(clinic.id);
                                    toast.success(
                                      t('Treatment {{status}} successfully', {
                                        status: newStatus === 'active' ? t('activated') : t('deactivated'),
                                      })
                                    );
                                  } catch (error: any) {
                                    console.error('❌ Error updating treatment status:', error);
                                    toast.error(error?.message || t('Failed to update treatment status'));
                                  }
                                }}>
                                  {treatment.status === 'active' ? t('Deactivate') : t('Activate')}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={async () => {
                                    if (!clinic?.id) return;
                                    if (confirm(t('Are you sure you want to delete this treatment?'))) {
                                      try {
                                        await api.clinicAdmin.deleteTreatment(treatment.id);
                                        fetchTreatments(clinic.id);
                                        toast.success(t('Treatment deleted successfully'));
                                      } catch (error: any) {
                                        console.error('❌ Error deleting treatment:', error);
                                        toast.error(error?.message || t('Failed to delete treatment'));
                                      }
                                    }
                                  }}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  {t('Delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-gray-500 dark:text-gray-400 text-base mb-2">
                    No {viewMode === 'doctors' ? 'doctors' : 'treatments'} found
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {viewMode === 'doctors' 
                      ? t('Click "Add New Doctor" to add your first doctor.')
                      : t('Click "Add a Treatment" to add your first treatment.')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add Doctor Modal */}
      <Dialog open={showAddDoctorModal} onOpenChange={setShowAddDoctorModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-xl font-semibold">{t('Add New')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-8 py-6">
            {/* BASIC INFORMATION */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">
                {t('BASIC INFORMATION')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="doctor-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Full Name')}
                  </Label>
                  <Input
                    id="doctor-name"
                    value={newDoctor.name}
                    onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                    placeholder={t('Enter full name')}
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="doctor-gender" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Gender')}
                  </Label>
                  <Select
                    value={newDoctor.gender}
                    onValueChange={(value) => setNewDoctor({ ...newDoctor, gender: value })}
                  >
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue placeholder={t('Select a gender')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('Male')}</SelectItem>
                      <SelectItem value="female">{t('Female')}</SelectItem>
                      <SelectItem value="other">{t('Other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="doctor-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Email')}
                  </Label>
                  <Input
                    id="doctor-email"
                    type="email"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    placeholder={t('Enter email address')}
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="doctor-phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Phone')}
                  </Label>
                  <Input
                    id="doctor-phone"
                    value={newDoctor.phone}
                    onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                    placeholder={t('Enter phone number')}
                    className="mt-1.5 h-10"
                  />
                </div>
              </div>
            </div>

            {/* PROFESSIONAL DETAILS */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">
                {t('PROFESSIONAL DETAILS')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Specialty')}</Label>
                  <Select
                    open={showSpecialtyDropdown}
                    onOpenChange={setShowSpecialtyDropdown}
                    value={newDoctor.specialties[0] || ''}
                    onValueChange={(value) => {
                      if (value) {
                        handleAddSpecialty(value);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue placeholder={t('Select a speciality')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSpecialties.map((specialty) => (
                        <SelectItem
                          key={specialty}
                          value={specialty}
                        >
                          {specialty}
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRequestNewSpecialty();
                          }}
                          className="w-full text-left px-6 py-1.5 rounded-sm text-sm font-medium text-[#0C2243] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          Other / Request a New Specialty
                        </button>
                      </div>
                    </SelectContent>
                  </Select>
                  {newDoctor.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newDoctor.specialties.map((specialty) => (
                        <span
                          key={specialty}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00FFA2] text-[#0C2243] rounded-full text-sm font-medium"
                        >
                          {specialty}
                          <button
                            onClick={() => {
                              handleRemoveSpecialty(specialty);
                              // Clear services when specialty is removed
                              setNewDoctor({ ...newDoctor, services: [] });
                            }}
                            className="hover:bg-[#0C2243] hover:text-white rounded-full p-0.5 transition-colors ml-0.5"
                            type="button"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Service')}</Label>
                  <Select
                    open={showServiceDropdown}
                    onOpenChange={setShowServiceDropdown}
                    onValueChange={(value) => {
                      if (value) {
                        handleAddService(value);
                      }
                    }}
                    disabled={newDoctor.specialties.length === 0}
                  >
                    <SelectTrigger className="mt-1.5 h-10" disabled={newDoctor.specialties.length === 0}>
                      <SelectValue
                        placeholder={
                          newDoctor.specialties.length === 0
                            ? t('Select a specialty first')
                            : t('Select the service')
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {newDoctor.specialties.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-gray-500">
                          {t('Please select a specialty first')}
                        </div>
                      ) : availableServices.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-gray-500">
                          {t('No services available for selected specialty')}
                        </div>
                      ) : (
                        availableServices
                          .filter(s => !newDoctor.services.includes(s))
                          .map((service) => (
                            <SelectItem
                              key={service}
                              value={service}
                            >
                              {service}
                            </SelectItem>
                          ))
                      )}
                      <div className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRequestNewService();
                          }}
                          className="w-full text-left px-6 py-1.5 rounded-sm text-sm font-medium text-[#0C2243] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          Other / Request a New Service
                        </button>
                      </div>
                  </SelectContent>
                  </Select>
                  {newDoctor.services.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newDoctor.services.map((service) => (
                        <span
                          key={service}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00FFA2] text-[#0C2243] rounded-full text-sm font-medium"
                        >
                          {service}
                          <button
                            onClick={() => handleRemoveService(service)}
                            className="hover:bg-[#0C2243] hover:text-white rounded-full p-0.5 transition-colors ml-0.5"
                            type="button"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="doctor-experience" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Experience')}
                  </Label>
                  <Select
                    value={newDoctor.experience}
                    onValueChange={(value) => setNewDoctor({ ...newDoctor, experience: value })}
                  >
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue placeholder={t('Select years of experience')} />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30].map((years) => (
                        <SelectItem key={years} value={years.toString()}>
                          {years} {years === 1 ? t('year') : t('years')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="doctor-status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Status')}
                  </Label>
                  <Select
                    value={newDoctor.status}
                    onValueChange={(value) => setNewDoctor({ ...newDoctor, status: value })}
                  >
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue placeholder={t('Select a status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('Active')}</SelectItem>
                      <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                      <SelectItem value="on-leave">{t('On Leave')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="doctor-price" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Price')}
                  </Label>
                  <Input
                    id="doctor-price"
                    type="number"
                    value={newDoctor.price}
                    onChange={(e) => setNewDoctor({ ...newDoctor, price: e.target.value })}
                    placeholder={t('Enter Price')}
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="doctor-availability" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Availability')}
                  </Label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <Select
                        value={newAvailabilityDraft.day_of_week}
                        onValueChange={(value) =>
                          setNewAvailabilityDraft({ day_of_week: value, start_time: '', end_time: '' })
                        }
                        disabled={openClinicDays.length === 0}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue
                            placeholder={
                              openClinicDays.length === 0 ? t('No clinic hours') : t('Day')
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {openClinicDays.map((day) => (
                            <SelectItem key={day.day_of_week} value={String(day.day_of_week)}>
                              {t(dayLabels[day.day_of_week])}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={newAvailabilityDraft.start_time}
                        onValueChange={(value) =>
                          setNewAvailabilityDraft((prev) => ({ ...prev, start_time: value, end_time: '' }))
                        }
                        disabled={!newAvailabilityDraft.day_of_week}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder={t('Start time')} />
                        </SelectTrigger>
                        <SelectContent>
                          {newAvailabilityDraft.day_of_week &&
                            getTimeSlotsForDay(Number(newAvailabilityDraft.day_of_week)).map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={newAvailabilityDraft.end_time}
                        onValueChange={(value) =>
                          setNewAvailabilityDraft((prev) => ({ ...prev, end_time: value }))
                        }
                        disabled={!newAvailabilityDraft.day_of_week || !newAvailabilityDraft.start_time}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder={t('End time')} />
                        </SelectTrigger>
                        <SelectContent>
                          {newAvailabilityDraft.day_of_week &&
                            newAvailabilityDraft.start_time &&
                            getEndTimeSlots(Number(newAvailabilityDraft.day_of_week), newAvailabilityDraft.start_time).map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-10"
                        onClick={() =>
                          addAvailabilityEntry(
                            newAvailabilityDraft,
                            newDoctorAvailabilityEntries,
                            setNewDoctorAvailabilityEntries,
                            setNewAvailabilityDraft
                          )
                        }
                        disabled={openClinicDays.length === 0}
                      >
                        {t('Add')}
                      </Button>
                    </div>

                    {newDoctorAvailabilityEntries.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {[...newDoctorAvailabilityEntries]
                          .sort((a, b) => a.day_of_week - b.day_of_week)
                          .map((entry) => (
                            <span
                              key={`${entry.day_of_week}-${entry.start_time}-${entry.end_time}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00FFA2] text-[#0C2243] rounded-full text-sm font-medium"
                            >
                              {`${t(dayLabels[entry.day_of_week])}: ${entry.start_time} - ${entry.end_time}`}
                              <button
                                type="button"
                                className="hover:bg-[#0C2243] hover:text-white rounded-full p-0.5 transition-colors"
                                onClick={() =>
                                  setNewDoctorAvailabilityEntries((prev) =>
                                    prev.filter((item) => item.day_of_week !== entry.day_of_week)
                                  )
                                }
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setShowAddDoctorModal(false)}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6"
            >
              {t('Cancel')}
            </Button>
            <Button
              onClick={handleAddDoctor}
              className="bg-[#0C2243] hover:bg-[#0a1a35] text-white px-6"
            >
              {t('Add New Doctor')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Doctor Modal */}
      <Dialog open={showEditDoctorModal} onOpenChange={setShowEditDoctorModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-xl font-semibold">{t('Edit Doctor')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-8 py-6">
            {/* BASIC INFORMATION */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">
                {t('BASIC INFORMATION')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-doctor-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Full Name')}
                  </Label>
                  <Input
                    id="edit-doctor-name"
                    value={editDoctor.name}
                    onChange={(e) => setEditDoctor({ ...editDoctor, name: e.target.value })}
                    placeholder={t('Enter full name')}
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-doctor-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Email')}
                  </Label>
                  <Input
                    id="edit-doctor-email"
                    type="email"
                    value={editDoctor.email}
                    onChange={(e) => setEditDoctor({ ...editDoctor, email: e.target.value })}
                    placeholder={t('Enter email address')}
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-doctor-phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Phone')}
                  </Label>
                  <Input
                    id="edit-doctor-phone"
                    value={editDoctor.phone}
                    onChange={(e) => setEditDoctor({ ...editDoctor, phone: e.target.value })}
                    placeholder={t('Enter phone number')}
                    className="mt-1.5 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-doctor-specialty" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Specialty')}
                  </Label>
                  <Select
                    value={editDoctor.specialty}
                    onValueChange={(value) => setEditDoctor({ ...editDoctor, specialty: value })}
                  >
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue placeholder={t('Select a specialty')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSpecialties.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-doctor-status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Status')}
                  </Label>
                  <Select
                    value={editDoctor.status}
                    onValueChange={(value) => setEditDoctor({ ...editDoctor, status: value })}
                  >
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue placeholder={t('Select a status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('Active')}</SelectItem>
                      <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                      <SelectItem value="on-leave">{t('On Leave')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-doctor-availability" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Availability')}
                  </Label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <Select
                        value={editAvailabilityDraft.day_of_week}
                        onValueChange={(value) =>
                          setEditAvailabilityDraft({ day_of_week: value, start_time: '', end_time: '' })
                        }
                        disabled={openClinicDays.length === 0}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue
                            placeholder={
                              openClinicDays.length === 0 ? t('No clinic hours') : t('Day')
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {openClinicDays.map((day) => (
                            <SelectItem key={day.day_of_week} value={String(day.day_of_week)}>
                              {t(dayLabels[day.day_of_week])}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={editAvailabilityDraft.start_time}
                        onValueChange={(value) =>
                          setEditAvailabilityDraft((prev) => ({ ...prev, start_time: value, end_time: '' }))
                        }
                        disabled={!editAvailabilityDraft.day_of_week}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder={t('Start time')} />
                        </SelectTrigger>
                        <SelectContent>
                          {editAvailabilityDraft.day_of_week &&
                            getTimeSlotsForDay(Number(editAvailabilityDraft.day_of_week)).map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={editAvailabilityDraft.end_time}
                        onValueChange={(value) =>
                          setEditAvailabilityDraft((prev) => ({ ...prev, end_time: value }))
                        }
                        disabled={!editAvailabilityDraft.day_of_week || !editAvailabilityDraft.start_time}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder={t('End time')} />
                        </SelectTrigger>
                        <SelectContent>
                          {editAvailabilityDraft.day_of_week &&
                            editAvailabilityDraft.start_time &&
                            getEndTimeSlots(Number(editAvailabilityDraft.day_of_week), editAvailabilityDraft.start_time).map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-10"
                        onClick={() =>
                          addAvailabilityEntry(
                            editAvailabilityDraft,
                            editDoctorAvailabilityEntries,
                            setEditDoctorAvailabilityEntries,
                            setEditAvailabilityDraft
                          )
                        }
                        disabled={openClinicDays.length === 0}
                      >
                        {t('Add')}
                      </Button>
                    </div>

                    {editDoctorAvailabilityEntries.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {[...editDoctorAvailabilityEntries]
                          .sort((a, b) => a.day_of_week - b.day_of_week)
                          .map((entry) => (
                            <span
                              key={`${entry.day_of_week}-${entry.start_time}-${entry.end_time}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00FFA2] text-[#0C2243] rounded-full text-sm font-medium"
                            >
                              {`${t(dayLabels[entry.day_of_week])}: ${entry.start_time} - ${entry.end_time}`}
                              <button
                                type="button"
                                className="hover:bg-[#0C2243] hover:text-white rounded-full p-0.5 transition-colors"
                                onClick={() =>
                                  setEditDoctorAvailabilityEntries((prev) =>
                                    prev.filter((item) => item.day_of_week !== entry.day_of_week)
                                  )
                                }
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-doctor-price" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('Price')}
                  </Label>
                  <Input
                    id="edit-doctor-price"
                    type="number"
                    value={editDoctor.price}
                    onChange={(e) => setEditDoctor({ ...editDoctor, price: e.target.value })}
                    placeholder={t('Enter Price')}
                    className="mt-1.5 h-10"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDoctorModal(false);
                setSelectedDoctor(null);
              }}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6"
            >
              {t('Cancel')}
            </Button>
            <Button
              onClick={handleSaveEditDoctor}
              className="bg-[#0C2243] hover:bg-[#0a1a35] text-white px-6"
            >
              {t('Save Changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirmModal} onOpenChange={setShowDeleteConfirmModal}>
        <DialogContent className="max-w-md mx-auto bg-white rounded-lg p-0 overflow-hidden shadow-xl border-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold text-gray-900">{t('Delete Doctor')}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('Are you sure you want to delete {{name}}? This action cannot be undone.', { name: doctorToDelete?.name || '' })}
            </p>
          </div>
          <DialogFooter className="px-6 pb-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setDoctorToDelete(null);
              }}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('Cancel')}
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Treatment Modal */}
      <Dialog open={showAddTreatmentModal} onOpenChange={setShowAddTreatmentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">{t('Add New')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Treatment / Machine Name */}
            <div>
              <Label htmlFor="treatment-name" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                {t('Treatment / Machine Name')}
              </Label>
              <Input
                id="treatment-name"
                value={newTreatment.name}
                onChange={(e) => setNewTreatment({ ...newTreatment, name: e.target.value })}
                placeholder={t('e.g. Candela GentleMax Pro, HydraFacial MD, CO₂ Laser')}
                className="h-10"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="treatment-description" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                {t('Description')}
              </Label>
              <Input
                id="treatment-description"
                value={newTreatment.description}
                onChange={(e) => setNewTreatment({ ...newTreatment, description: e.target.value })}
                placeholder={t('e.g. 2023 Edition, Elite IQ')}
                className="h-10"
              />
            </div>

            {/* Price */}
            <div>
              <Label htmlFor="treatment-price" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                {t('Price')}
              </Label>
              <Input
                id="treatment-price"
                type="number"
                value={newTreatment.price}
                onChange={(e) => setNewTreatment({ ...newTreatment, price: e.target.value })}
                placeholder={t('Enter Price')}
                className="h-10"
              />
            </div>

            {/* USED FOR Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('USED FOR')}</h3>

              {/* Specialty */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('Specialty')}
                </Label>
                <div className="relative">
                  <Select
                    open={showTreatmentSpecialtyDropdown}
                    onOpenChange={setShowTreatmentSpecialtyDropdown}
                    onValueChange={(value) => {
                      if (value) {
                        handleAddTreatmentSpecialty(value);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={t('Select a speciality')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSpecialties
                        .filter(s => !newTreatment.specialties.includes(s))
                        .map((specialty) => (
                          <SelectItem
                            key={specialty}
                            value={specialty}
                          >
                            {specialty}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Selected Specialties Tags */}
                  {newTreatment.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newTreatment.specialties.map((specialty) => (
                        <div
                          key={specialty}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300"
                        >
                          <span>{specialty}</span>
                          <button
                            onClick={() => handleRemoveTreatmentSpecialty(specialty)}
                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Service */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {t('Service')}
                </Label>
                <div className="relative">
                  <Select
                    open={showTreatmentServiceDropdown}
                    onOpenChange={setShowTreatmentServiceDropdown}
                    onValueChange={(value) => {
                      if (value) {
                        handleAddTreatmentService(value);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={t('Select the service')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableServices
                        .filter(s => !newTreatment.services.includes(s))
                        .map((service) => (
                          <SelectItem
                            key={service}
                            value={service}
                          >
                            {service}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Selected Services Tags */}
                  {newTreatment.services.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newTreatment.services.map((service) => (
                        <div
                          key={service}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300"
                        >
                          <span>{service}</span>
                          <button
                            onClick={() => handleRemoveTreatmentService(service)}
                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddTreatmentModal(false);
                setNewTreatment({
                  name: '',
                  description: '',
                  price: '',
                  specialties: [],
                  services: [],
                });
              }}
              className="flex-1 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('Cancel')}
            </Button>
            <Button
              onClick={handleAddTreatment}
              className="flex-1 bg-[#0C2243] hover:bg-[#0a1a35] text-white"
            >
              {t('Add New Treatment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request New Service Modal */}
      <Dialog open={showRequestServiceModal} onOpenChange={setShowRequestServiceModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{t('Request a New Service')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t("Can't find the service you're looking for? Submit a request and the admin will add it.")}
            </p>
            <div>
              <Label htmlFor="service-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('Enter the service name')}
              </Label>
              <Input
                id="service-name"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder={t('Service name')}
                className="mt-1.5 h-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmitServiceRequest();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmitServiceRequest}
              className="bg-[#0C2243] hover:bg-[#0a1a35] text-white w-full"
            >
              {t('Request Service')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request New Specialty Modal */}
      <Dialog open={showRequestSpecialtyModal} onOpenChange={setShowRequestSpecialtyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{t('Request a New Specialty')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t("Can't find the specialty you're looking for? Submit a request and the admin will add it.")}
            </p>
            <div>
              <Label htmlFor="specialty-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('Enter the specialty name')}
              </Label>
              <Input
                id="specialty-name"
                value={newSpecialtyName}
                onChange={(e) => setNewSpecialtyName(e.target.value)}
                placeholder={t('Specialty name')}
                className="mt-1.5 h-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmitSpecialtyRequest();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmitSpecialtyRequest}
              className="bg-[#0C2243] hover:bg-[#0a1a35] text-white w-full"
            >
              {t('Request Specialty')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Success Modal */}
      <Dialog open={showRequestSuccessModal} onOpenChange={setShowRequestSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">{t('Request Success')}</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-[#00FFA2] flex items-center justify-center">
                <Check className="w-8 h-8 text-[#0C2243]" />
              </div>
            </div>
            <p className="text-base text-gray-700 dark:text-gray-300 font-medium">
              {t('Your request has been sent to the admin.')}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Specialty Filter Modal */}
      <Dialog open={showSpecialtyModal} onOpenChange={setShowSpecialtyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Specialty')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTempSelectedSpecialty('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  tempSelectedSpecialty === 'all'
                    ? 'bg-[#00FFA2] text-[#0C2243]'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
              >
                All
              </button>
              {uniqueSpecialties.map((specialty) => (
                <button
                  key={specialty}
                  onClick={() => setTempSelectedSpecialty(specialty)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    tempSelectedSpecialty === specialty
                      ? 'bg-[#00FFA2] text-[#0C2243]'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {specialty}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setTempSelectedSpecialty('all');
                setSelectedSpecialty('all');
                setShowSpecialtyModal(false);
              }}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Clear filters
            </Button>
            <Button
              onClick={() => {
                setSelectedSpecialty(tempSelectedSpecialty);
                setShowSpecialtyModal(false);
              }}
              className="bg-[#0C2243] hover:bg-[#0a1a35] text-white"
            >
              Apply filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
};

export default ClinicAdminDoctors;
