import React, { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClinicAdminSidebar from '@/components/clinic-admin/ClinicAdminSidebar';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Input } from '@/components/ui/input';
import { Search, MoreVertical, ArrowUpDown, ChevronDown, Eye, Pencil, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Patient {
  id: string;
  user_id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  contact: string;
  email: string;
  lastAppointment: string;
  status: 'active' | 'inactive';
  firstAppointment?: string;
  appointmentCount?: number;
  isManual?: boolean;
}

interface Clinic {
  id: string;
  name: string;
  logo_url: string | null;
}

const ClinicAdminPatients = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [checkingClinic, setCheckingClinic] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [genderFilter, setGenderFilter] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'age' | 'lastAppointment' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    age: 0,
    email: '',
    phone: '',
    address: '',
  });
  const [savingPatient, setSavingPatient] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState(false);

  const normalizeManualIdentityValue = (value: string | null | undefined) =>
    String(value || '').trim().toLowerCase();

  const buildManualPatientKey = (booking: any): string | null => {
    const name = normalizeManualIdentityValue(booking?.patient_name);
    const phone = normalizeManualIdentityValue(booking?.patient_phone);
    const email = normalizeManualIdentityValue(booking?.patient_email);

    if (!name && !phone && !email) return null;

    return `manual:${name}|${phone}|${email}`;
  };

  const getPatientKeyFromBooking = (booking: any): string | null => {
    return booking?.user_id || buildManualPatientKey(booking);
  };

  const isManualPatient = (patient: Patient | null | undefined) => Boolean(patient?.isManual);

  const getPatientGender = (value: string | null | undefined): 'Male' | 'Female' | 'Other' => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'male' || normalized === 'm') return 'Male';
    if (normalized === 'female' || normalized === 'f') return 'Female';
    return 'Other';
  };

  useEffect(() => {
    const checkClinicExists = async () => {
      if (!user) return;

      try {
        // Check clinic via backend
        const { clinic: clinicData } = await api.clinicAdmin.getClinic();

        if (!clinicData || clinicData.status === 'pending') {
          navigate('/clinic-admin/onboarding', { replace: true });
          return;
        }

        setClinic(clinicData);
        setCheckingClinic(false);
      } catch (error) {
        console.error('Error in checkClinicExists:', error);
        setCheckingClinic(false);
      }
    };

    checkClinicExists();
  }, [user, navigate]);

  useEffect(() => {
    if (clinic?.id) {
      fetchPatients(clinic.id);
    }
  }, [clinic?.id]);

  const fetchPatients = async (clinicId: string) => {
    try {
      setLoading(true);
      console.log('🔍 Fetching patients for clinic:', clinicId, clinic?.name);

      // Fetch bookings via backend
      const { bookings: allBookings } = await api.clinicAdmin.getBookings();

      console.log('✅ Total bookings fetched:', allBookings?.length || 0);

      const userIds = [...new Set(allBookings?.map((b: any) => b.user_id).filter((id: any) => id !== null) || [])];
      const patientSeedMap = new Map<string, { userId: string; isManual: boolean; booking: any }>();

      console.log('👥 Unique registered user IDs from bookings:', userIds.length);

      const profileMap = new Map();
      if (userIds.length > 0) {
        const profilePromises = userIds.map(async (userId: string) => {
          try {
            const { profile } = await api.clinicAdmin.getPatientProfile(userId);
            if (profile) {
              profileMap.set(userId, profile);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to fetch profile for user ${userId}:`, error);
          }
        });
        
        await Promise.all(profilePromises);
        console.log('✅ Profiles fetched and mapped:', profileMap.size, 'out of', userIds.length);
      }
      
      console.log('🗺️ Profile map size:', profileMap.size);

      const lastAppointmentMap = new Map<string, string>();
      const lastAppointmentAnyMap = new Map<string, string>();
      const firstAppointmentMap = new Map<string, string>();
      const appointmentCountMap = new Map<string, number>();
      
      const normalizeDate = (dateValue: string | null | undefined): string => {
        if (!dateValue) return '';
        return dateValue.split('T')[0];
      };
      const todayStr = new Date().toISOString().split('T')[0];

      allBookings?.forEach((booking: any) => {
        const patientKey = getPatientKeyFromBooking(booking);
        if (!patientKey) return;

        patientSeedMap.set(patientKey, {
          userId: booking.user_id || patientKey,
          isManual: !booking.user_id,
          booking,
        });

        const bookingDate = booking.appointment_date;
        const bookingDateStr = normalizeDate(bookingDate);

        const currentAny = lastAppointmentAnyMap.get(patientKey);
        if (!currentAny || bookingDateStr > normalizeDate(currentAny)) {
          lastAppointmentAnyMap.set(patientKey, bookingDate);
        }

        const currentLast = lastAppointmentMap.get(patientKey);
        if (bookingDateStr && bookingDateStr <= todayStr && (!currentLast || bookingDateStr > normalizeDate(currentLast))) {
          lastAppointmentMap.set(patientKey, bookingDate);
        }
        
        const currentFirst = firstAppointmentMap.get(patientKey);
        if (bookingDateStr && (!currentFirst || bookingDateStr < normalizeDate(currentFirst))) {
          firstAppointmentMap.set(patientKey, bookingDate);
        }
        
        appointmentCountMap.set(patientKey, (appointmentCountMap.get(patientKey) || 0) + 1);
      });

      const calculateAge = (profile: any): number => {
        const ageValue = Number(profile?.age);
        if (Number.isFinite(ageValue) && ageValue > 0 && ageValue < 120) {
          return ageValue;
        }

        const dateOfBirth = profile?.date_of_birth || profile?.dob || profile?.birth_date;
        if (dateOfBirth) {
          const birthDate = new Date(dateOfBirth);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          return age > 0 && age < 120 ? age : 0;
        }
        // If no date_of_birth, return 0 (will show as N/A)
        return 0;
      };

      const isActive = (lastAppointment: string): boolean => {
        if (!lastAppointment) return false;
        const lastApptDate = new Date(lastAppointment);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return lastApptDate >= sixMonthsAgo;
      };

      const patientsData: Patient[] = Array.from(patientSeedMap.entries()).map(([patientKey, seed]) => {
        const profile = seed.isManual ? null : profileMap.get(seed.userId);
        const lastAppointment = lastAppointmentMap.get(patientKey) || lastAppointmentAnyMap.get(patientKey) || '';
        const firstAppointment = firstAppointmentMap.get(patientKey) || '';
        const appointmentCount = appointmentCountMap.get(patientKey) || 0;
        const age = profile
          ? calculateAge(profile)
          : calculateAge({ date_of_birth: seed.booking?.patient_date_of_birth });

        const patientName = profile?.full_name || profile?.name || seed.booking?.patient_name || t('Unknown Patient');
        const patientGender = profile
          ? getPatientGender(profile.gender || profile.sex)
          : getPatientGender(seed.booking?.patient_gender);
        const patientContact =
          profile?.phone ||
          seed.booking?.patient_phone ||
          profile?.email ||
          seed.booking?.patient_email ||
          t('N/A');

        return {
          id: patientKey,
          user_id: seed.userId,
          name: patientName,
          gender: patientGender,
          age,
          contact: patientContact,
          email: profile?.email || seed.booking?.patient_email || '',
          lastAppointment,
          status: isActive(lastAppointment) ? 'active' : 'inactive',
          firstAppointment,
          appointmentCount,
          isManual: seed.isManual,
        };
      });
      
      console.log('📊 Total patients created:', patientsData.length);
      if (patientsData.length > 0) {
        console.log('📋 Sample patient:', patientsData[0]);
      }

      setPatients(patientsData);

      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching patients:', error);
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return {
      totalPatients: patients.length,
      newThisMonth: patients.filter(p => {
        // Check if first appointment was this month
        if (!p.firstAppointment) return false;
        const firstAppt = new Date(p.firstAppointment);
        return firstAppt.getMonth() === currentMonth && 
               firstAppt.getFullYear() === currentYear;
      }).length,
      activePatients: patients.filter(p => p.status === 'active').length,
      returningPatients: patients.filter(p => {
        // Count patients who have more than one appointment
        return (p.appointmentCount || 0) > 1;
      }).length,
    };
  }, [patients]);

  // Filter patients
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const matchesGender = !genderFilter || genderFilter === 'all' || patient.gender === genderFilter;
      const matchesSearch = !searchQuery || 
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesGender && matchesSearch;
    });
  }, [patients, genderFilter, searchQuery]);

  // Sort patients
  const sortedPatients = useMemo(() => {
    return [...filteredPatients].sort((a, b) => {
      if (!sortBy) return 0;
      
      if (sortBy === 'age') {
        return sortDirection === 'asc' ? a.age - b.age : b.age - a.age;
      } else if (sortBy === 'lastAppointment') {
        const dateA = a.lastAppointment ? new Date(a.lastAppointment).getTime() : 0;
        const dateB = b.lastAppointment ? new Date(b.lastAppointment).getTime() : 0;
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });
  }, [filteredPatients, sortBy, sortDirection]);

  const handleSort = (column: 'age' | 'lastAppointment') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedPatients.length === sortedPatients.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(sortedPatients.map(p => p.id));
    }
  };

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatients((prev) =>
      prev.includes(patientId) ? prev.filter((id) => id !== patientId) : [...prev, patientId]
    );
  };

  const getStatusBadge = (status: 'active' | 'inactive') => {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white ${
          status === 'active'
            ? 'bg-green-500'
            : 'bg-orange-500'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === 'active' ? 'bg-green-200' : 'bg-orange-200'
          }`}
        />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getAppointmentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; dot: string; text: string }> = {
      completed: { bg: 'bg-green-500', dot: 'bg-green-200', text: t('Completed') },
      confirmed: { bg: 'bg-green-500', dot: 'bg-green-200', text: t('Completed') },
      cancelled: { bg: 'bg-red-500', dot: 'bg-red-200', text: t('Cancelled') },
      pending: { bg: 'bg-yellow-500', dot: 'bg-yellow-200', text: t('Pending') },
      rescheduled: { bg: 'bg-yellow-500', dot: 'bg-yellow-200', text: t('Pending') },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white ${config.bg}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {config.text}
      </span>
    );
  };

  const handleViewPatientDetails = async (patient: Patient) => {
    setSelectedPatient(patient);
    setIsPatientDetailsModalOpen(true);
    setLoadingAppointments(true);

    try {
      const { bookings: allBookings } = await api.clinicAdmin.getBookings();
      const patientBookings = allBookings.filter((b: any) => getPatientKeyFromBooking(b) === patient.id);
      
      // Transform to appointment format
      const allAppointments = patientBookings.map((b: any) => ({
        id: b.id,
        appointment_date: b.appointment_date,
        doctor_name: b.doctor_name,
        specialty: b.specialty,
        status: b.status,
      }));

      setPatientAppointments(allAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setPatientAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleOpenEditPatient = (patient: Patient) => {
    if (isManualPatient(patient)) {
      return;
    }

    // Preserve selectedPatient for the save function
    setSelectedPatient(patient);
    setEditFormData({
      fullName: patient.name,
      gender: patient.gender,
      age: patient.age,
      email: patient.email || '',
      phone: patient.contact || '',
      address: '', // Address field not in database yet
    });
    setIsEditPatientModalOpen(true);
    setIsPatientDetailsModalOpen(false);
  };

  const handleSavePatientChanges = async () => {
    if (!selectedPatient) return;
    if (isManualPatient(selectedPatient)) return;

    setSavingPatient(true);
    try {
      // Calculate date_of_birth from age (approximate - use January 1st of birth year)
      let dateOfBirth = null;
      if (editFormData.age > 0) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - editFormData.age;
        dateOfBirth = `${birthYear}-01-01`; // Approximate to January 1st
      }

      // Update profile data - ensure all fields are properly formatted
      // Note: age is not a column in profiles table, it's calculated from date_of_birth
      const updateData: any = {
        full_name: editFormData.fullName.trim(),
        gender: editFormData.gender,
      };

      // Only include phone if it's not empty
      if (editFormData.phone && editFormData.phone.trim()) {
        updateData.phone = editFormData.phone.trim();
      } else {
        updateData.phone = null;
      }

      // Only include email if it's not empty
      if (editFormData.email && editFormData.email.trim()) {
        updateData.email = editFormData.email.trim();
      }

      // Include date_of_birth if age was provided (age is calculated from date_of_birth)
      if (dateOfBirth) {
        updateData.date_of_birth = dateOfBirth;
      }

      console.log('💾 Updating patient profile:', {
        userId: selectedPatient.user_id,
        updateData
      });

      // Update patient profile via backend
      const response = await api.clinicAdmin.updatePatientProfile(selectedPatient.user_id, updateData);
      
      console.log('✅ Patient profile updated successfully:', response);

      toast.success(t('Patient information updated successfully'));

      // Close modal
      setIsEditPatientModalOpen(false);
      setSelectedPatient(null);
      
      // Refresh the patient list to show updated data
      if (clinic?.id) {
        await fetchPatients(clinic.id);
      }
    } catch (error: any) {
      console.error('❌ Error saving patient changes:', error);
      const errorMessage = error?.message || error?.error || t('Failed to update patient information. Please try again.');
      toast.error(errorMessage);
    } finally {
      setSavingPatient(false);
    }
  };

  const handleDeletePatient = (patient: Patient) => {
    setPatientToDelete(patient);
    setIsDeleteConfirmModalOpen(true);
  };

  const handleConfirmDeletePatient = async () => {
    if (!patientToDelete || !clinic?.id) return;

    setDeletingPatient(true);
    try {
      // Delete patient via backend (deletes all bookings for this patient with this clinic)
      await api.clinicAdmin.deletePatient(patientToDelete.user_id);

      toast.success(t('Patient deleted successfully'));
      
      // Close modal and clear selection
      setIsDeleteConfirmModalOpen(false);
      setPatientToDelete(null);
      
      // Refresh patient list to reflect deletion
      if (clinic.id) {
        await fetchPatients(clinic.id);
      }
    } catch (error: any) {
      console.error('❌ Error deleting patient:', error);
      const errorMessage = error?.message || t('Failed to delete patient. Please try again.');
      toast.error(errorMessage);
    } finally {
      setDeletingPatient(false);
    }
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
            {/* Header with Clinic Name & Logo */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('Patients')}</h1>
              
              <div className="flex items-center gap-3">
                {clinic?.logo_url && (
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                    <img
                      src={clinic.logo_url}
                      alt={`${clinic.name} logo`}
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
                  {t('Total Patients')}
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.totalPatients}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('All registered patients in the clinic.')}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t('New This Month')}
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.newThisMonth}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('Recently onboarded patients.')}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t('Active Patients')}
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.activePatients}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('Patients with recent or upcoming visits.')}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t('Returning Patients')}
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.returningPatients}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('Revisited after a previous appointment.')}
                </p>
              </div>
            </div>

            {/* Patients Table Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                {t('Patients Table')}
              </h2>

              {/* Filters */}
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Left Side: Gender and Search */}
                  <div className="flex flex-col gap-4 flex-1">
                    <Select 
                      value={genderFilter || undefined} 
                      onValueChange={(value) => setGenderFilter(value === 'all' ? undefined : value)}
                    >
                      <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white h-10 rounded-md">
                        <SelectValue placeholder={t('Gender')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('All')}</SelectItem>
                        <SelectItem value="Male">{t('Male')}</SelectItem>
                        <SelectItem value="Female">{t('Female')}</SelectItem>
                        <SelectItem value="Other">{t('Other')}</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="relative max-w-md">
                      <Search
                        className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10`}
                      />
                      <Input
                        type="text"
                        placeholder={t('Search by Patient name, doctor, contact or service...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`${isRtl ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3'} bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 h-10 rounded-md w-full`}
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Patients Table */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">{t('Loading patients...')}</p>
                </div>
              ) : sortedPatients.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <th className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4`}>
                          <input
                            type="checkbox"
                            checked={selectedPatients.length === sortedPatients.length && sortedPatients.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                          />
                        </th>
                        <th className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white`}>
                          {t('Patient Name')}
                        </th>
                        <th className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white`}>
                          {t('Gender')}
                        </th>
                        <th className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white`}>
                          <button
                            onClick={() => handleSort('age')}
                            className={`flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 ${isRtl ? 'flex-row-reverse' : ''}`}
                          >
                            {t('Age')}
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                        </th>
                        <th className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white`}>
                          {t('Contact')}
                        </th>
                        <th className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white`}>
                          <button
                            onClick={() => handleSort('lastAppointment')}
                            className={`flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 ${isRtl ? 'flex-row-reverse' : ''}`}
                          >
                            {t('Last Appointment')}
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                        </th>
                        <th className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white`}>
                          {t('Action')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPatients.map((patient) => (
                        <tr
                          key={patient.id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4`}>
                            <input
                              type="checkbox"
                              checked={selectedPatients.includes(patient.id)}
                              onChange={() => handleSelectPatient(patient.id)}
                              className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                            />
                          </td>
                          <td className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4`}>
                            <span className="text-sm text-gray-900 dark:text-white font-medium">
                              {patient.name}
                            </span>
                          </td>
                          <td className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4`}>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {t(patient.gender)}
                            </span>
                          </td>
                          <td className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4`}>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {patient.age > 0 ? patient.age : t('N/A')}
                            </span>
                          </td>
                          <td className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4`}>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {patient.contact}
                            </span>
                          </td>
                          <td className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4`}>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {patient.lastAppointment 
                                ? format(new Date(patient.lastAppointment), 'MMM d, yyyy')
                                : 'N/A'}
                            </span>
                          </td>
                          <td className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isRtl ? 'start' : 'end'} className="w-48">
                                <DropdownMenuItem 
                                  onClick={() => handleViewPatientDetails(patient)}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                  {t('View Details')}
                                </DropdownMenuItem>
                                {!patient.isManual && (
                                  <DropdownMenuItem 
                                    onClick={() => handleOpenEditPatient(patient)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Pencil className="w-4 h-4" />
                                    {t('Edit Patient Info')}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleDeletePatient(patient)}
                                  className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                >
                                  <X className="w-4 h-4" />
                                  {t('Delete Patient')}
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
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">{t('No patients found')}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-400">
                    Patients will appear here once they book appointments.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Patient Details Modal */}
        <Dialog open={isPatientDetailsModalOpen} onOpenChange={setIsPatientDetailsModalOpen}>
          <DialogContent className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg p-0 overflow-hidden shadow-xl border-0 max-h-[90vh] overflow-y-auto [&>button]:hidden">
            <DialogHeader className="px-6 pt-6 pb-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('Patient Details')}
                </DialogTitle>
                <button
                  onClick={() => setIsPatientDetailsModalOpen(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 -mr-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </DialogHeader>

            {selectedPatient ? (
              <div className="px-6 py-6">
                {/* PATIENT INFORMATION */}
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    {t('Patient Information')}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Name')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedPatient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Gender')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{t(selectedPatient.gender)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Age')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedPatient.age > 0 ? selectedPatient.age : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Registration Date')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedPatient.firstAppointment 
                          ? format(new Date(selectedPatient.firstAppointment), 'MMM d, yyyy')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CONTACT DETAILS */}
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    CONTACT DETAILS
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Contact')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedPatient.contact}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Email')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedPatient.email || t('N/A')}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Address')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('N/A')}</p>
                    </div>
                  </div>
                </div>

                {/* APPOINTMENT HISTORY */}
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    {t('Appointment History')}
                  </h3>
                  {loadingAppointments ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('Loading appointments...')}</p>
                    </div>
                  ) : patientAppointments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                            <th className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4`}>
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-[#00FFA2] border-gray-300 dark:border-gray-600 rounded focus:ring-[#00FFA2] bg-white dark:bg-gray-800"
                              />
                            </th>
                            <th className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider`}>
                              {t('Date')}
                            </th>
                            <th className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider`}>
                              {t('Doctor')}
                            </th>
                            <th className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider`}>
                              {t('Specialty')}
                            </th>
                            <th className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider`}>
                              {t('Status')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientAppointments.map((appointment) => (
                            <tr
                              key={appointment.id}
                              className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <td className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4`}>
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 text-[#00FFA2] border-gray-300 dark:border-gray-600 rounded focus:ring-[#00FFA2] bg-white dark:bg-gray-800"
                                />
                              </td>
                              <td className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4`}>
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                                </span>
                              </td>
                              <td className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4`}>
                                <span className="text-sm text-gray-900 dark:text-white">{appointment.doctor_name || t('N/A')}</span>
                              </td>
                              <td className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4`}>
                                <span className="text-sm text-gray-900 dark:text-white">{appointment.specialty || t('N/A')}</span>
                              </td>
                              <td className={`${isRtl ? 'text-right' : 'text-left'} py-3 px-4`}>
                                {getAppointmentStatusBadge(appointment.status)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('No appointment history found')}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => setIsPatientDetailsModalOpen(false)}
                    variant="outline"
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2.5 rounded-lg font-medium"
                  >
                    Close
                  </Button>
                  {!selectedPatient?.isManual && (
                    <Button
                      onClick={() => {
                        if (selectedPatient) {
                          handleOpenEditPatient(selectedPatient);
                        }
                      }}
                      className="bg-[#0C2243] dark:bg-[#00FFA2] hover:bg-[#0a1a35] dark:hover:bg-[#00FFA2]/90 text-white dark:text-[#0C2243] px-6 py-2.5 rounded-lg font-medium"
                    >
                      {t('Edit Patient Info')}
                    </Button>
                  )}
                  {selectedPatient && (
                    <Button
                      onClick={() => handleDeletePatient(selectedPatient)}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium"
                    >
                      {t('Delete Patient')}
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Edit Patient Information Modal */}
        <Dialog open={isEditPatientModalOpen} onOpenChange={setIsEditPatientModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('Edit Patient Information')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* PERSONAL INFORMATION Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                  {t('PERSONAL INFORMATION')}
                </h3>
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t('Full Name')}
                    </label>
                    <Input
                      type="text"
                      value={editFormData.fullName}
                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder={t('Enter full name')}
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t('Gender')}
                    </label>
                    <Select
                      value={editFormData.gender}
                      onValueChange={(value: 'Male' | 'Female' | 'Other') =>
                        setEditFormData({ ...editFormData, gender: value })
                      }
                    >
                      <SelectTrigger className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <SelectValue placeholder={t('Select gender')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">{t('Male')}</SelectItem>
                        <SelectItem value="Female">{t('Female')}</SelectItem>
                        <SelectItem value="Other">{t('Other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t('Age')}
                    </label>
                    <Input
                      type="number"
                      value={editFormData.age || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, age: parseInt(e.target.value) || 0 })}
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder={t('Enter age')}
                      min="0"
                      max="120"
                    />
                  </div>
                </div>
              </div>

              {/* CONTACT DETAILS Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                  {t('CONTACT DETAILS')}
                </h3>
                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t('Email')}
                    </label>
                    <Input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder={t('Enter email')}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t('Phone')}
                    </label>
                    <Input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder={t('Enter phone number')}
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t('Address')}
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={editFormData.address}
                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                        className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-10"
                      placeholder={t('Enter address')}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => setIsEditPatientModalOpen(false)}
                variant="outline"
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2.5 rounded-lg font-medium"
              >
                Cancel
              </Button>
                <Button
                  onClick={handleSavePatientChanges}
                  disabled={savingPatient || !editFormData.fullName.trim()}
                  className="bg-[#0C2243] dark:bg-[#00FFA2] hover:bg-[#0a1a35] dark:hover:bg-[#00FFA2]/90 text-white dark:text-[#0C2243] px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPatient ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Patient Confirmation Modal */}
        <Dialog open={isDeleteConfirmModalOpen} onOpenChange={setIsDeleteConfirmModalOpen}>
          <DialogContent className="max-w-md mx-auto bg-white rounded-lg p-0 overflow-hidden shadow-xl border-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {t('Delete Patient')}
              </DialogTitle>
            </DialogHeader>

            {patientToDelete ? (
              <div className="px-6 py-6">
                {/* Large Red Delete Icon */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    {/* Outer circle */}
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                      {/* Inner circle with X icon */}
                      <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                        <X className="w-10 h-10 text-white" strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient Details */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Patient Name')}</p>
                      <p className="text-sm font-semibold text-gray-900">{patientToDelete.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Gender')}</p>
                      <p className="text-sm font-semibold text-gray-900">{t(patientToDelete.gender)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Contact')}</p>
                      <p className="text-sm font-semibold text-gray-900">{patientToDelete.contact}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Email')}</p>
                      <p className="text-sm font-semibold text-gray-900">{patientToDelete.email || t('N/A')}</p>
                    </div>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    {t(
                      'Are you sure you want to delete this patient? This will remove all their appointments with this clinic. This action cannot be undone.'
                    )}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <Button
                    onClick={() => setIsDeleteConfirmModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2.5 rounded-lg font-medium"
                  >
                    {t('Discard')}
                  </Button>
                  <Button
                    onClick={handleConfirmDeletePatient}
                    disabled={deletingPatient}
                    className="flex-1 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingPatient ? t('Deleting...') : t('Confirm Deletion')}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default ClinicAdminPatients;
