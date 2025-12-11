import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClinicAdminSidebar from '@/components/clinic-admin/ClinicAdminSidebar';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
}

interface Clinic {
  id: string;
  name: string;
  logo_url: string | null;
}

const ClinicAdminPatients = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
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

      // Fetch bookings for this clinic by clinic_id
      const { data: bookingsByClinicId, error: bookingsError } = await supabase
        .from('bookings')
        .select('user_id, appointment_date, created_at, clinic_id, clinic')
        .eq('clinic_id', clinicId)
        .order('appointment_date', { ascending: false });

      if (bookingsError) {
        console.error('❌ Error fetching bookings by clinic_id:', bookingsError);
      }

      console.log('✅ Bookings by clinic_id:', bookingsByClinicId?.length || 0);

      // Also fetch bookings with NULL clinic_id that match clinic name
      let bookingsWithNullClinicId: any[] = [];
      if (clinic?.name) {
        const { data: nullClinicBookings, error: nullError } = await supabase
          .from('bookings')
          .select('user_id, appointment_date, created_at, clinic_id, clinic')
          .is('clinic_id', null)
          .ilike('clinic', clinic.name)
          .order('appointment_date', { ascending: false });

        if (!nullError && nullClinicBookings) {
          bookingsWithNullClinicId = nullClinicBookings;
          console.log('✅ Bookings with NULL clinic_id:', bookingsWithNullClinicId.length);
        }
      }

      // Combine both sets of bookings (avoid duplicates)
      const existingUserIds = new Set((bookingsByClinicId || []).map(b => b.user_id));
      const uniqueNullBookings = bookingsWithNullClinicId.filter(b => !existingUserIds.has(b.user_id));
      const bookingsData = [...(bookingsByClinicId || []), ...uniqueNullBookings];

      console.log('✅ Total bookings fetched:', bookingsData.length);

      // Get unique user IDs from bookings (only patients who have booked with THIS clinic)
      const userIds = [...new Set(bookingsData?.map(b => b.user_id).filter(id => id !== null) || [])];
      
      if (userIds.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      console.log('👥 Unique user IDs from bookings:', userIds.length);

      // Fetch profiles for these users (including gender and date_of_birth if they exist)
      // This will only return profiles for users who have set up their profile
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at, gender, date_of_birth, phone')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        // Don't return here - we can still show patients without profiles
      }

      console.log('✅ Profiles fetched:', profilesData?.length || 0);
      if (profilesData && profilesData.length > 0) {
        console.log('📋 Sample profile data:', profilesData[0]);
      }

      // Create a map of user_id to profile for quick lookup
      const profileMap = new Map();
      profilesData?.forEach(profile => {
        profileMap.set(profile.user_id, profile);
        console.log('📝 Mapping profile for user_id:', profile.user_id, 'name:', profile.full_name);
      });
      
      console.log('🗺️ Profile map size:', profileMap.size);

      // Create a map of user_id to last appointment date
      const lastAppointmentMap = new Map<string, string>();
      // Create a map of user_id to first appointment date (for "New This Month")
      const firstAppointmentMap = new Map<string, string>();
      // Create a map of user_id to appointment count (for "Returning Patients")
      const appointmentCountMap = new Map<string, number>();
      
      bookingsData?.forEach(booking => {
        const userId = booking.user_id;
        
        // Track last appointment
        if (!lastAppointmentMap.has(userId) || 
            booking.appointment_date > (lastAppointmentMap.get(userId) || '')) {
          lastAppointmentMap.set(userId, booking.appointment_date);
        }
        
        // Track first appointment
        if (!firstAppointmentMap.has(userId) || 
            booking.appointment_date < (firstAppointmentMap.get(userId) || '9999-12-31')) {
          firstAppointmentMap.set(userId, booking.appointment_date);
        }
        
        // Count appointments per user
        appointmentCountMap.set(userId, (appointmentCountMap.get(userId) || 0) + 1);
      });

      // Calculate age from date_of_birth if available, otherwise use default
      const calculateAge = (dateOfBirth: string | null, createdAt: string | null): number => {
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

      // Determine if patient is active (has appointment in last 6 months)
      const isActive = (lastAppointment: string): boolean => {
        if (!lastAppointment) return false;
        const lastApptDate = new Date(lastAppointment);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return lastApptDate >= sixMonthsAgo;
      };

      // Transform bookings to patients (only users who have booked with THIS clinic)
      // For each unique user who has a booking, create a patient entry
      const patientsData: Patient[] = userIds.map(userId => {
        const profile = profileMap.get(userId);
        const lastAppointment = lastAppointmentMap.get(userId) || '';
        const firstAppointment = firstAppointmentMap.get(userId) || '';
        const appointmentCount = appointmentCountMap.get(userId) || 0;
        const age = profile ? calculateAge(profile.date_of_birth, profile.created_at) : 0;
        
        // Debug logging
        if (!profile) {
          console.log('⚠️ No profile found for user_id:', userId);
        } else {
          console.log('✅ Found profile for user_id:', userId, 'name:', profile.full_name, 'gender:', profile.gender, 'dob:', profile.date_of_birth);
        }
        
        // If user has a profile, use profile data; otherwise use booking data
        const patientName = profile?.full_name || 'Unknown Patient';
        const patientGender = (profile?.gender as 'Male' | 'Female' | 'Other') || 'Other';
        const patientContact = profile?.phone || profile?.email || 'N/A';
        
        console.log('👤 Creating patient for user_id:', userId, 'with name:', patientName, 'gender:', patientGender, 'age:', age);
        
        return {
          id: userId,
          user_id: userId,
          name: patientName,
          gender: patientGender,
          age: age,
          contact: patientContact,
          email: profile?.email || '',
          lastAppointment: lastAppointment,
          status: isActive(lastAppointment) ? 'active' : 'inactive',
          firstAppointment: firstAppointment,
          appointmentCount: appointmentCount,
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
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const stats = {
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

  // Filter patients
  const filteredPatients = patients.filter(patient => {
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
    const matchesGender = !genderFilter || genderFilter === 'all' || patient.gender === genderFilter;
    const matchesSearch = !searchQuery || 
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesGender && matchesSearch;
  });

  // Sort patients
  const sortedPatients = [...filteredPatients].sort((a, b) => {
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
      'completed': { bg: 'bg-green-500', dot: 'bg-green-200', text: 'Completed' },
      'confirmed': { bg: 'bg-green-500', dot: 'bg-green-200', text: 'Completed' },
      'cancelled': { bg: 'bg-red-500', dot: 'bg-red-200', text: 'Cancelled' },
      'pending': { bg: 'bg-yellow-500', dot: 'bg-yellow-200', text: 'Pending' },
      'rescheduled': { bg: 'bg-yellow-500', dot: 'bg-yellow-200', text: 'Pending' },
    };

    const config = statusConfig[status] || statusConfig['pending'];

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
      // Fetch appointments by clinic_id
      const { data: appointmentsByClinicId, error: error1 } = await supabase
        .from('bookings')
        .select('id, appointment_date, doctor_name, specialty, status')
        .eq('user_id', patient.user_id)
        .eq('clinic_id', clinic?.id)
        .order('appointment_date', { ascending: false });

      if (error1) {
        console.error('Error fetching appointments by clinic_id:', error1);
      }

      // Also fetch appointments with NULL clinic_id that match clinic name
      let appointmentsWithNullClinicId: any[] = [];
      if (clinic?.name) {
        const { data: nullClinicAppointments, error: error2 } = await supabase
          .from('bookings')
          .select('id, appointment_date, doctor_name, specialty, status')
          .eq('user_id', patient.user_id)
          .is('clinic_id', null)
          .ilike('clinic', clinic.name)
          .order('appointment_date', { ascending: false });

        if (!error2 && nullClinicAppointments) {
          appointmentsWithNullClinicId = nullClinicAppointments;
        }
      }

      // Combine both sets (avoid duplicates)
      const existingIds = new Set((appointmentsByClinicId || []).map(a => a.id));
      const uniqueNullAppointments = appointmentsWithNullClinicId.filter(a => !existingIds.has(a.id));
      const allAppointments = [...(appointmentsByClinicId || []), ...uniqueNullAppointments];

      setPatientAppointments(allAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setPatientAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleOpenEditPatient = (patient: Patient) => {
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

    setSavingPatient(true);
    try {
      // Calculate date_of_birth from age (approximate - use January 1st of birth year)
      let dateOfBirth = null;
      if (editFormData.age > 0) {
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - editFormData.age;
        dateOfBirth = `${birthYear}-01-01`; // Approximate to January 1st
      }

      // Update profile in Supabase
      const updateData: any = {
        full_name: editFormData.fullName,
        gender: editFormData.gender,
        phone: editFormData.phone || null,
      };

      if (dateOfBirth) {
        updateData.date_of_birth = dateOfBirth;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', selectedPatient.user_id);

      if (error) {
        console.error('Error updating patient:', error);
        toast.error('Failed to update patient information. Please try again.');
        setSavingPatient(false);
        return;
      }

      toast.success('Patient information updated successfully');

      // If email is different, we might need to update it (but email is usually managed by auth)
      // For now, we'll just refresh the patient list

      // Close modal and refresh patient list
      setIsEditPatientModalOpen(false);
      
      // Refresh the patient list
      await fetchPatients();
      
      // Re-fetch the updated patient data
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, gender, date_of_birth, phone, created_at')
        .eq('user_id', selectedPatient.user_id)
        .single();

      if (updatedProfile) {
        // Re-open patient details modal with updated data
        // We need to reconstruct the patient object with updated data
        const updatedPatient: Patient = {
          ...selectedPatient,
          name: updatedProfile.full_name || selectedPatient.name,
          gender: (updatedProfile.gender as 'Male' | 'Female' | 'Other') || selectedPatient.gender,
          email: updatedProfile.email || selectedPatient.email,
          contact: updatedProfile.phone || updatedProfile.email || selectedPatient.contact,
          age: updatedProfile.date_of_birth 
            ? (() => {
                const birthDate = new Date(updatedProfile.date_of_birth);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                  age--;
                }
                return age > 0 && age < 120 ? age : 0;
              })()
            : selectedPatient.age,
        };
        await handleViewPatientDetails(updatedPatient);
      }
    } catch (error) {
      console.error('Error saving patient changes:', error);
      toast.error('Failed to update patient information. Please try again.');
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
      // Delete all bookings for this patient with this clinic
      // First, delete bookings by clinic_id
      const { error: error1 } = await supabase
        .from('bookings')
        .delete()
        .eq('user_id', patientToDelete.user_id)
        .eq('clinic_id', clinic.id);

      if (error1) {
        console.error('Error deleting bookings by clinic_id:', error1);
      }

      // Also delete bookings with NULL clinic_id that match clinic name
      let error2 = null;
      if (clinic.name) {
        const result = await supabase
          .from('bookings')
          .delete()
          .eq('user_id', patientToDelete.user_id)
          .is('clinic_id', null)
          .ilike('clinic', clinic.name);

        error2 = result.error;
        if (error2) {
          console.error('Error deleting bookings by clinic name:', error2);
        }
      }

      // Check if there were any errors
      if (error1 || error2) {
        toast.error('Failed to delete patient. Please try again.');
        setDeletingPatient(false);
        return;
      }

      toast.success('Patient deleted successfully');
      setIsDeleteConfirmModalOpen(false);
      setPatientToDelete(null);
      
      // Refresh patient list
      if (clinic.id) {
        await fetchPatients(clinic.id);
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast.error('Failed to delete patient. Please try again.');
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
            {/* Header with Clinic Name & Logo */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Patients</h1>
              
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
                  {clinic?.name || 'Clinic'}
                </span>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Total Patients
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.totalPatients}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  All registered patients in the clinic.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  New This Month
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.newThisMonth}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Recently onboarded patients.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Active Patients
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.activePatients}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Patients with recent or upcoming visits.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Returning Patients
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.returningPatients}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Revisited after a previous appointment.
                </p>
              </div>
            </div>

            {/* Patients Table Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Patients Table
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
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                      <Input
                        type="text"
                        placeholder="Search by Patient name, doctor, contact or service..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 h-10 rounded-md w-full"
                      />
                    </div>
                  </div>

                  {/* Right Side: Status Filters */}
                  <div className="flex items-center gap-2">
                    {(['all', 'active', 'inactive'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          statusFilter === status
                            ? 'bg-[#00FFA2] text-[#0C2243]'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Patients Table */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading patients...</p>
                </div>
              ) : sortedPatients.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <th className="text-left py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedPatients.length === sortedPatients.length && sortedPatients.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                          />
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Patient Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Gender
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          <button
                            onClick={() => handleSort('age')}
                            className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            Age
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Contact
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          <button
                            onClick={() => handleSort('lastAppointment')}
                            className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            Last Appointment
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPatients.map((patient) => (
                        <tr
                          key={patient.id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedPatients.includes(patient.id)}
                              onChange={() => handleSelectPatient(patient.id)}
                              className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-900 dark:text-white font-medium">
                              {patient.name}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {patient.gender}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {patient.age > 0 ? patient.age : 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {patient.contact}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {patient.lastAppointment 
                                ? format(new Date(patient.lastAppointment), 'MMM d, yyyy')
                                : 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(patient.status)}
                          </td>
                          <td className="py-3 px-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem 
                                  onClick={() => handleViewPatientDetails(patient)}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleOpenEditPatient(patient)}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                  Edit Patient Info
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeletePatient(patient)}
                                  className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                >
                                  <X className="w-4 h-4" />
                                  Delete Patient
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
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">No patients found</p>
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
                  Patient Details
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
                    PATIENT INFORMATION
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Name</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedPatient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Gender</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedPatient.gender}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Age</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedPatient.age > 0 ? selectedPatient.age : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Registration Date</p>
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
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Contact</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedPatient.contact}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Email</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedPatient.email || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Address</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">N/A</p>
                    </div>
                  </div>
                </div>

                {/* APPOINTMENT HISTORY */}
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    APPOINTMENT HISTORY
                  </h3>
                  {loadingAppointments ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading appointments...</p>
                    </div>
                  ) : patientAppointments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                            <th className="text-left py-3 px-4">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-[#00FFA2] border-gray-300 dark:border-gray-600 rounded focus:ring-[#00FFA2] bg-white dark:bg-gray-800"
                              />
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Doctor
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Service
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientAppointments.map((appointment) => (
                            <tr
                              key={appointment.id}
                              className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 text-[#00FFA2] border-gray-300 dark:border-gray-600 rounded focus:ring-[#00FFA2] bg-white dark:bg-gray-800"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm text-gray-900 dark:text-white">{appointment.doctor_name || 'N/A'}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm text-gray-900 dark:text-white">{appointment.specialty || 'N/A'}</span>
                              </td>
                              <td className="py-3 px-4">
                                {getAppointmentStatusBadge(appointment.status)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No appointment history found</p>
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
                  <Button
                    onClick={() => {
                      if (selectedPatient) {
                        handleOpenEditPatient(selectedPatient);
                      }
                    }}
                    className="bg-[#0C2243] dark:bg-[#00FFA2] hover:bg-[#0a1a35] dark:hover:bg-[#00FFA2]/90 text-white dark:text-[#0C2243] px-6 py-2.5 rounded-lg font-medium"
                  >
                    Edit Patient Info
                  </Button>
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
                Edit Patient Information
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* PERSONAL INFORMATION Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                  PERSONAL INFORMATION
                </h3>
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Full Name
                    </label>
                    <Input
                      type="text"
                      value={editFormData.fullName}
                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Enter full name"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Gender
                    </label>
                    <Select
                      value={editFormData.gender}
                      onValueChange={(value: 'Male' | 'Female' | 'Other') =>
                        setEditFormData({ ...editFormData, gender: value })
                      }
                    >
                      <SelectTrigger className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Age
                    </label>
                    <Input
                      type="number"
                      value={editFormData.age || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, age: parseInt(e.target.value) || 0 })}
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Enter age"
                      min="0"
                      max="120"
                    />
                  </div>
                </div>
              </div>

              {/* CONTACT DETAILS Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                  CONTACT DETAILS
                </h3>
                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Enter email"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Phone
                    </label>
                    <Input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Enter phone number"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Address
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={editFormData.address}
                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                        className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-10"
                        placeholder="Enter address"
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
                disabled={savingPatient}
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
                Delete Patient
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
                      <p className="text-xs text-gray-500 mb-1.5">Patient Name</p>
                      <p className="text-sm font-semibold text-gray-900">{patientToDelete.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Gender</p>
                      <p className="text-sm font-semibold text-gray-900">{patientToDelete.gender}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Contact</p>
                      <p className="text-sm font-semibold text-gray-900">{patientToDelete.contact}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Email</p>
                      <p className="text-sm font-semibold text-gray-900">{patientToDelete.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    Are you sure you want to delete this patient? This will remove all their appointments with this clinic. This action cannot be undone.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setIsDeleteConfirmModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2.5 rounded-lg font-medium"
                  >
                    Discard
                  </Button>
                  <Button
                    onClick={handleConfirmDeletePatient}
                    disabled={deletingPatient}
                    className="flex-1 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingPatient ? 'Deleting...' : 'Confirm Deletion'}
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
