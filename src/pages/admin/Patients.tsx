import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Filter, X, Eye, Edit, Trash2, Calendar, ChevronDown, MoreVertical, Building2 } from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  doctorNames?: string[]; // Doctors this patient has appointments with
}

const AdminPatients = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState('All Clinics');
  const [selectedDate, setSelectedDate] = useState('All Time');
  const [patientsData, setPatientsData] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinics, setClinics] = useState<string[]>(['All Clinics']);
  
  // Filter modal states
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDoctor, setFilterDoctor] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterAgeRange, setFilterAgeRange] = useState<string>('all');
  const [doctors, setDoctors] = useState<string[]>([]);
  
  // Modal states
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    dateOfBirth: '',
    email: '',
    phone: '',
  });
  const [savingPatient, setSavingPatient] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [deletingPatient, setDeletingPatient] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState<string>('');

  const dateOptions = ['All Time', 'Today', 'Yesterday', 'This Week', 'This Month', 'Last Month'];

  useEffect(() => {
    fetchPatients();

    // Set up real-time subscriptions
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          console.log('🔄 Profile change detected');
          fetchPatients();
        }
      )
      .subscribe();

    const bookingsChannel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          console.log('🔄 Booking change detected');
          fetchPatients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, []);

  const calculateAge = (dateOfBirth: string | null): number => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching patients from REAL clinics only (super admin view)...');

      // First, fetch all real clinics
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select('id, name');

      if (clinicsError) {
        console.error('❌ Error fetching clinics:', clinicsError);
        setPatientsData([]);
        return;
      }

      console.log('✅ Clinics fetched:', clinicsData?.length || 0);
      const clinicNames = ['All Clinics', ...(clinicsData?.map(c => c.name) || [])];
      setClinics(clinicNames);

      if (!clinicsData || clinicsData.length === 0) {
        console.log('⚠️ No clinics found in database');
        setPatientsData([]);
        setLoading(false);
        return;
      }

      // Create a set of real clinic IDs
      const realClinicIds = new Set(clinicsData.map(c => c.id));
      const realClinicNames = new Set(clinicsData.map(c => c.name.toLowerCase()));

      console.log('📊 Real clinic IDs:', realClinicIds.size);
      console.log('📊 Real clinic names:', realClinicNames.size);

      // Fetch all bookings, but we'll filter to only those from real clinics
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('user_id, appointment_date, clinic_id, clinic, doctor_name, doctor_id')
        .order('appointment_date', { ascending: false });

      if (bookingsError) {
        console.error('❌ Error fetching bookings:', bookingsError);
        setPatientsData([]);
        return;
      }

      console.log('✅ All bookings fetched:', bookingsData?.length || 0);

      // Filter bookings to only those from real clinics
      const realClinicBookings = bookingsData?.filter(booking => {
        // Check if booking has clinic_id that matches a real clinic
        if (booking.clinic_id && realClinicIds.has(booking.clinic_id)) {
          return true;
        }
        // Check if booking has clinic name that matches a real clinic
        if (booking.clinic && realClinicNames.has(booking.clinic.toLowerCase())) {
          return true;
        }
        return false;
      }) || [];

      console.log('✅ Bookings from real clinics:', realClinicBookings.length);
      console.log('📊 Filtered out:', (bookingsData?.length || 0) - realClinicBookings.length, 'bookings from non-existent clinics');

      // Get unique user IDs from real clinic bookings only
      const userIds = [...new Set(realClinicBookings.map(b => b.user_id).filter(id => id !== null) || [])];
      
      if (userIds.length === 0) {
        console.log('⚠️ No patients found with bookings from real clinics');
        setPatientsData([]);
        setLoading(false);
        return;
      }

      console.log('👥 Unique patient user IDs from real clinics:', userIds.length);

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, gender, date_of_birth, phone, created_at')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        setPatientsData([]);
        return;
      }

      console.log('✅ Profiles fetched:', profilesData?.length || 0);

      // Create maps for lookups
      const profileMap = new Map<string, any>();
      profilesData?.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Create a map of user_id to last appointment date (only from real clinics)
      const lastAppointmentMap = new Map<string, string>();
      // Create a map of user_id to doctor names (doctors this patient has appointments with)
      const patientDoctorMap = new Map<string, Set<string>>();
      
      realClinicBookings.forEach(booking => {
        const userId = booking.user_id;
        if (userId) {
          if (!lastAppointmentMap.has(userId)) {
            lastAppointmentMap.set(userId, booking.appointment_date);
          }
          // Track doctor names for this patient
          if (!patientDoctorMap.has(userId)) {
            patientDoctorMap.set(userId, new Set<string>());
          }
          if (booking.doctor_name) {
            patientDoctorMap.get(userId)!.add(booking.doctor_name);
          }
        }
      });

      // Determine active status (patients with appointments in last 30 days or upcoming)
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activePatientIds = new Set<string>();
      realClinicBookings.forEach(booking => {
        if (booking.user_id && booking.appointment_date) {
          const appointmentDate = new Date(booking.appointment_date);
          if (appointmentDate >= thirtyDaysAgo || appointmentDate >= today) {
            activePatientIds.add(booking.user_id);
          }
        }
      });

      // Transform profiles to patients
      const patients: Patient[] = profilesData?.map((profile) => {
        const lastAppointmentDate = lastAppointmentMap.get(profile.user_id);
        const formattedDate = lastAppointmentDate
          ? new Date(lastAppointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'No appointments';

        const age = calculateAge(profile.date_of_birth);

        const patientDoctors = patientDoctorMap.get(profile.user_id);
        
        return {
          id: profile.user_id,
          user_id: profile.user_id,
          name: profile.full_name || profile.email || 'Unknown Patient',
          gender: (profile.gender as 'Male' | 'Female' | 'Other') || 'Other',
          age: age > 0 ? age : 0,
          contact: profile.phone || profile.email || 'N/A',
          email: profile.email || '',
          lastAppointment: formattedDate,
          status: activePatientIds.has(profile.user_id) ? 'active' as const : 'inactive' as const,
          doctorNames: patientDoctors ? Array.from(patientDoctors) : [],
        };
      }) || [];

      console.log('📊 Patients processed:', patients.length);
      setPatientsData(patients);

      // Extract unique doctors from bookings for filter
      const uniqueDoctors = new Set<string>(['all']);
      realClinicBookings.forEach(booking => {
        if (booking.doctor_name) {
          uniqueDoctors.add(booking.doctor_name);
        }
      });

      // Also fetch all doctors from real clinics for filter
      const { data: doctorsData } = await supabase
        .from('doctors')
        .select('name')
        .in('clinic_id', Array.from(realClinicIds));

      if (doctorsData) {
        doctorsData.forEach(doctor => {
          if (doctor.name) {
            uniqueDoctors.add(doctor.name);
          }
        });
      }

      setDoctors(Array.from(uniqueDoctors).sort());
    } catch (error) {
      console.error('❌ Error fetching patients:', error);
      setPatientsData([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter patients based on status, search, clinic, date, and filter modal options
  const filteredPatients = patientsData.filter((patient) => {
    // Status filter (from tabs)
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
    
    // Search filter
    const matchesSearch =
      searchQuery === '' ||
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.contact.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter modal: Status
    const matchesFilterStatus = filterStatus === 'all' || patient.status === filterStatus;
    
    // Filter modal: Gender
    const matchesFilterGender = filterGender === 'all' || patient.gender.toLowerCase() === filterGender.toLowerCase();
    
    // Filter modal: Age Range
    let matchesFilterAge = true;
    if (filterAgeRange !== 'all') {
      const age = patient.age;
      if (filterAgeRange === '0-18') {
        matchesFilterAge = age >= 0 && age <= 18;
      } else if (filterAgeRange === '19-30') {
        matchesFilterAge = age >= 19 && age <= 30;
      } else if (filterAgeRange === '31-45') {
        matchesFilterAge = age >= 31 && age <= 45;
      } else if (filterAgeRange === '46-60') {
        matchesFilterAge = age >= 46 && age <= 60;
      } else if (filterAgeRange === '60+') {
        matchesFilterAge = age >= 60;
      }
    }
    
    // Filter modal: Date Range
    let matchesFilterDate = true;
    if (filterDateFrom || filterDateTo) {
      const lastApptDate = patient.lastAppointment !== 'No appointments' 
        ? new Date(patient.lastAppointment) 
        : null;
      
      if (lastApptDate) {
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (lastApptDate < fromDate) {
            matchesFilterDate = false;
          }
        }
        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (lastApptDate > toDate) {
            matchesFilterDate = false;
          }
        }
      } else {
        // If patient has no appointments and date filter is set, exclude them
        matchesFilterDate = false;
      }
    }
    
    // Filter modal: Doctor
    const matchesFilterDoctor = filterDoctor === 'all' || 
      (patient.doctorNames && patient.doctorNames.some(name => name.toLowerCase() === filterDoctor.toLowerCase()));
    
    return matchesStatus && matchesSearch && matchesFilterStatus && matchesFilterGender && matchesFilterAge && matchesFilterDate && matchesFilterDoctor;
  });

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatients((prev) =>
      prev.includes(patientId) ? prev.filter((id) => id !== patientId) : [...prev, patientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPatients.length === filteredPatients.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(filteredPatients.map((patient) => patient.id));
    }
  };

  const getStatusBadge = (status: Patient['status']) => {
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          status === 'active'
            ? 'bg-green-100 text-green-800'
            : 'bg-orange-100 text-orange-800'
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleViewPatientDetails = async (patient: Patient) => {
    setSelectedPatient(patient);
    setIsPatientDetailsModalOpen(true);
    setLoadingAppointments(true);

    try {
      // Fetch patient's appointment history
      const { data: appointmentsData, error } = await supabase
        .from('bookings')
        .select('*, clinics(name)')
        .eq('user_id', patient.user_id)
        .order('appointment_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching appointments:', error);
        toast.error('Failed to load appointment history');
      } else {
        setPatientAppointments(appointmentsData || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointment history');
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleOpenEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    // Fetch full profile data
    supabase
      .from('profiles')
      .select('full_name, email, gender, date_of_birth, phone')
      .eq('user_id', patient.user_id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching patient data:', error);
          toast.error('Failed to load patient data');
        } else {
          setEditFormData({
            fullName: data?.full_name || '',
            gender: (data?.gender as 'Male' | 'Female' | 'Other') || 'Male',
            dateOfBirth: data?.date_of_birth || '',
            email: data?.email || '',
            phone: data?.phone || '',
          });
          setIsEditPatientModalOpen(true);
        }
      });
  };

  const handleSavePatientChanges = async () => {
    if (!selectedPatient) return;

    try {
      setSavingPatient(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.fullName,
          gender: editFormData.gender,
          date_of_birth: editFormData.dateOfBirth || null,
          phone: editFormData.phone || null,
        })
        .eq('user_id', selectedPatient.user_id);

      if (error) {
        console.error('Error updating patient:', error);
        toast.error('Failed to update patient information');
      } else {
        toast.success('Patient information updated successfully');
        setIsEditPatientModalOpen(false);
        setSelectedPatient(null);
        await fetchPatients();
      }
    } catch (error) {
      console.error('Error updating patient:', error);
      toast.error('Failed to update patient information');
    } finally {
      setSavingPatient(false);
    }
  };

  const handleDeletePatient = (patient: Patient) => {
    setPatientToDelete(patient);
    setDeleteConfirmName('');
    setIsDeleteConfirmModalOpen(true);
  };

  const handleConfirmDeletePatient = async () => {
    if (!patientToDelete) return;

    // Validate that the entered name matches the patient's name (case-insensitive, trimmed)
    const enteredName = deleteConfirmName.trim();
    const patientName = patientToDelete.name.trim();
    
    if (enteredName.toLowerCase() !== patientName.toLowerCase()) {
      toast.error('Patient name does not match. Please enter the exact patient name.');
      return;
    }

    try {
      setDeletingPatient(true);
      
      // Delete all bookings for this patient from all clinics
      const { error: bookingsError } = await supabase
        .from('bookings')
        .delete()
        .eq('user_id', patientToDelete.user_id);

      if (bookingsError) {
        console.error('❌ Error deleting bookings:', bookingsError);
        toast.error('Failed to delete patient bookings. Please try again.');
        setDeletingPatient(false);
        return;
      }

      console.log('✅ Patient bookings deleted successfully');
      toast.success('Patient deleted successfully');
      
      // Close modal and reset state
      setIsDeleteConfirmModalOpen(false);
      setPatientToDelete(null);
      setDeleteConfirmName('');
      
      // Refresh patient list
      await fetchPatients();
    } catch (error) {
      console.error('❌ Error deleting patient:', error);
      toast.error('Failed to delete patient. Please try again.');
    } finally {
      setDeletingPatient(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`}>
        <AdminSidebar isDarkMode={isDarkMode} onDarkModeToggle={toggleDarkMode} />
        
        <main className="flex-1 bg-[#F7F7F7] dark:bg-gray-900 min-h-screen overflow-y-auto">
          <div className="p-8">
            {/* Page Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Patients</h1>
                  
                  {/* Status Filter Tabs */}
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

                {/* Right Side: Dropdowns and Filter Button */}
                <div className="flex flex-col items-end gap-3">
                  {/* Clinic and Date Dropdowns */}
                  <div className="flex items-center gap-3">
                    {/* Clinic Selection Dropdown */}
                    <Select value={selectedClinic} onValueChange={setSelectedClinic}>
                      <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {clinics.map((clinic) => (
                          <SelectItem key={clinic} value={clinic}>
                            {clinic}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Date Selection Dropdown */}
                    <Select value={selectedDate} onValueChange={setSelectedDate}>
                      <SelectTrigger className="w-[140px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {dateOptions.map((date) => (
                          <SelectItem key={date} value={date}>
                            {date}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filter Button */}
                  <Button
                    variant="outline"
                    onClick={() => setIsFilterModalOpen(true)}
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search by patient name, email, or contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-full h-10"
                />
              </div>
            </div>

            {/* Patients Table */}
            {loading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-[#0C2243] border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="text-left py-4 px-6">
                        <input
                          type="checkbox"
                          checked={selectedPatients.length === filteredPatients.length && filteredPatients.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                        />
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Patient Name</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Gender</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Age</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Contact</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Last Appointment</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((patient) => (
                        <tr
                          key={patient.id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="py-4 px-6">
                            <input
                              type="checkbox"
                              checked={selectedPatients.includes(patient.id)}
                              onChange={() => handleSelectPatient(patient.id)}
                              className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                            />
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{patient.name}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{patient.gender}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{patient.age}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{patient.contact}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{patient.lastAppointment}</span>
                          </td>
                          <td className="py-4 px-6">
                            {getStatusBadge(patient.status)}
                          </td>
                          <td className="py-4 px-6">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="text-gray-600 dark:text-gray-400 hover:text-[#0C2243] dark:hover:text-[#00FFA2] transition-colors"
                                  aria-label="View patient actions"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem 
                                  className="flex items-center gap-2 cursor-pointer"
                                  onClick={() => handleViewPatientDetails(patient)}
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="flex items-center gap-2 cursor-pointer"
                                  onClick={() => handleOpenEditPatient(patient)}
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit Patient Info
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="flex items-center gap-2 cursor-pointer text-red-600"
                                  onClick={() => handleDeletePatient(patient)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete Patient
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          No patients found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* Patient Details Modal */}
        <Dialog open={isPatientDetailsModalOpen} onOpenChange={setIsPatientDetailsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Patient Details</DialogTitle>
              <DialogDescription className="sr-only">
                View detailed information about the patient
              </DialogDescription>
            </DialogHeader>
            {selectedPatient && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">Name</Label>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{selectedPatient.name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">Gender</Label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedPatient.gender}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">Age</Label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedPatient.age}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">Contact</Label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedPatient.contact}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">Email</Label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedPatient.email || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedPatient.status)}</div>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-500 dark:text-gray-400 text-xs mb-2 block">Appointment History</Label>
                  {loadingAppointments ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                  ) : patientAppointments.length > 0 ? (
                    <div className="space-y-2">
                      {patientAppointments.map((apt) => (
                        <div key={apt.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{apt.clinic || apt.clinics?.name || 'Unknown Clinic'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(apt.appointment_date).toLocaleDateString()} at {apt.appointment_time}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Status: {apt.status}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No appointment history</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Patient Modal */}
        <Dialog open={isEditPatientModalOpen} onOpenChange={setIsEditPatientModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Edit Patient Information</DialogTitle>
              <DialogDescription className="sr-only">
                Update patient information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={editFormData.gender}
                  onValueChange={(value) => setEditFormData({ ...editFormData, gender: value as 'Male' | 'Female' | 'Other' })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={editFormData.dateOfBirth}
                  onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="mt-1"
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setIsEditPatientModalOpen(false)}
                className="border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePatientChanges}
                disabled={savingPatient}
                className="bg-[#0C2243] dark:bg-[#00FFA2] hover:bg-[#0C2243]/90 dark:hover:bg-[#00FFA2]/90 text-white dark:text-[#0C2243]"
              >
                {savingPatient ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog 
          open={isDeleteConfirmModalOpen} 
          onOpenChange={(open) => {
            setIsDeleteConfirmModalOpen(open);
            if (!open) {
              // Reset state when modal closes
              setDeleteConfirmName('');
              setPatientToDelete(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Warning</DialogTitle>
              <DialogDescription className="sr-only">
                Confirm deletion of patient by typing their name
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 text-center">
              {/* Trash Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>

              {/* Heading */}
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                Delete Patient Record
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                This will permanently remove <strong>{patientToDelete?.name}</strong> and all associated appointments from your clinic records.
              </p>

              {/* Confirmation Instruction */}
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                To confirm, type the patient's name below :
              </p>

              {/* Name Input */}
              <Input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                onKeyDown={(e) => {
                  // Allow Enter key to submit if name matches
                  if (e.key === 'Enter' && 
                      deleteConfirmName.trim().toLowerCase() === patientToDelete?.name.trim().toLowerCase() &&
                      !deletingPatient) {
                    handleConfirmDeletePatient();
                  }
                }}
                placeholder="Enter patient's name"
                className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg h-10 mb-6"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteConfirmModalOpen(false);
                  setDeleteConfirmName('');
                  setPatientToDelete(null);
                }}
                disabled={deletingPatient}
                className="bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDeletePatient}
                disabled={
                  deletingPatient || 
                  !patientToDelete ||
                  deleteConfirmName.trim().toLowerCase() !== patientToDelete.name.trim().toLowerCase()
                }
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingPatient ? 'Deleting...' : 'Delete Patient'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Filter Modal */}
        <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Filter</DialogTitle>
              <DialogDescription className="sr-only">
                Filter patients by date range, status, doctor, gender, and age range
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Date Range */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      placeholder="From"
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg h-10"
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      placeholder="To"
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Status Dropdown */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg h-10">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Doctor Dropdown */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Doctor</Label>
                <Select value={filterDoctor} onValueChange={setFilterDoctor}>
                  <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg h-10">
                    <SelectValue placeholder="Select a doctor's name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    {doctors.filter(d => d !== 'all').map((doctor) => (
                      <SelectItem key={doctor} value={doctor}>
                        {doctor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gender Radio Buttons */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gender</Label>
                <div className="flex items-center gap-2">
                  {['All', 'Male', 'Female'].map((gender) => (
                    <button
                      key={gender}
                      onClick={() => setFilterGender(gender.toLowerCase())}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filterGender === gender.toLowerCase()
                          ? 'bg-[#00FFA2] text-[#0C2243]'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Range Dropdown */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Age Range</Label>
                <Select value={filterAgeRange} onValueChange={setFilterAgeRange}>
                  <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg h-10">
                    <SelectValue placeholder="Select an age range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ages</SelectItem>
                    <SelectItem value="0-18">0-18</SelectItem>
                    <SelectItem value="19-30">19-30</SelectItem>
                    <SelectItem value="31-45">31-45</SelectItem>
                    <SelectItem value="46-60">46-60</SelectItem>
                    <SelectItem value="60+">60+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setFilterStatus('all');
                    setFilterDoctor('all');
                    setFilterGender('all');
                    setFilterAgeRange('all');
                  }}
                  className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
                >
                  Clear filters
                </Button>
                <Button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="flex-1 bg-[#0C2243] dark:bg-[#00FFA2] hover:bg-[#0C2243]/90 dark:hover:bg-[#00FFA2]/90 text-white dark:text-[#0C2243]"
                >
                  Apply filters
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default AdminPatients;
