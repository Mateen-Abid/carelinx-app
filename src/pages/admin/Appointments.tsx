import React, { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, X, Check, Clock, Calendar, ChevronDown, Ban, RotateCcw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportToExcel } from '@/utils/excelExport';
import { useTableSort } from '@/hooks/useTableSort';
import { TableSortHeader } from '@/components/ui/TableSortHeader';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDarkMode } from '@/contexts/DarkModeContext';
// import { supabase } from '@/integrations/supabase/client'; // Removed - Using backend API
import { api } from '@/services/api';
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

interface Appointment {
  id: string;
  user_id: string | null;
  patientName: string;
  patientEmail?: string;
  patientGender?: string;
  patientContact?: string;
  doctorName: string;
  service: string;
  serviceName?: string | null;
  clinic: string;
  date: string;
  time: string;
  appointment_date: string;
  appointment_time: string;
  status: 'approved' | 'cancelled' | 'pending' | 'completed';
  created_at: string;
  confirmed_at?: string;
  updated_at: string;
  note?: string;
  doctor_id?: string | null;
  bookingType?: 'doctor' | 'treatment';
  treatmentName?: string | null;
  treatmentId?: string | null;
}

interface DoctorDetails {
  name: string;
  specialty: string;
  service?: string;
  availability: string;
}

const AdminAppointments = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const ALL_CLINICS = 'all-clinics';
  const [selectedClinic, setSelectedClinic] = useState(ALL_CLINICS);
  const [appointmentsData, setAppointmentsData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinics, setClinics] = useState<string[]>([ALL_CLINICS]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [doctorDetails, setDoctorDetails] = useState<DoctorDetails | null>(null);
  const [loadingDoctorDetails, setLoadingDoctorDetails] = useState(false);
  
  // Filter modal states
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterDoctor, setFilterDoctor] = useState<string>('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('');
  const [doctors, setDoctors] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  
  // Appointment action modals
  const [isApproveConfirmModalOpen, setIsApproveConfirmModalOpen] = useState(false);
  const [isCancelConfirmModalOpen, setIsCancelConfirmModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [newAppointmentDate, setNewAppointmentDate] = useState<string>('');
  const [newAppointmentTime, setNewAppointmentTime] = useState<string>('');

  const normalizeManualIdentityValue = (value: string | null | undefined) =>
    String(value || '').trim().toLowerCase();

  const hasManualSnapshot = (booking: any) =>
    Boolean(
      normalizeManualIdentityValue(booking?.patient_name) ||
      normalizeManualIdentityValue(booking?.patient_phone) ||
      normalizeManualIdentityValue(booking?.patient_email)
    );

  useEffect(() => {
    fetchAppointments();
    // Real-time subscriptions removed - using backend API
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching ALL appointments from backend (super admin view)...');
      
      // Fetch ALL bookings from backend API
      const { bookings: bookingsData, profiles: profilesData, clinics: clinicsData, doctors: doctorsData } = await api.bookings.getAllBookings();

      console.log('✅ ALL bookings fetched from backend:', bookingsData?.length || 0, 'appointments from ALL clinics');
      
      // Log clinic distribution for debugging
      if (bookingsData && bookingsData.length > 0) {
        const clinicCounts = new Map<string, number>();
        bookingsData.forEach((booking: any) => {
      const clinicName = booking.clinic || (booking.clinic_id ? `clinic_id:${booking.clinic_id}` : t('Unknown'));
          clinicCounts.set(clinicName, (clinicCounts.get(clinicName) || 0) + 1);
        });
        console.log('📊 Appointments by clinic:', Object.fromEntries(clinicCounts));
      }

      console.log('✅ Profiles fetched:', profilesData?.length || 0, 'profiles');
      console.log('✅ Active clinics fetched:', clinicsData?.length || 0, 'active clinics');
      console.log('✅ Doctors fetched:', doctorsData?.length || 0, 'doctors from ALL clinics');

      // Create maps for lookups
      const profileMap = new Map<string, any>();
      profilesData?.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      const clinicMap = new Map<string, string>();
      // Only map active clinics
      clinicsData?.forEach(clinic => {
        if (clinic.status === 'active') {
          clinicMap.set(clinic.id, clinic.name);
        }
      });

      // Create doctor maps for validation
      const doctorIdMap = new Set<string>();
      const doctorNameMap = new Set<string>();
      doctorsData?.forEach(doctor => {
        if (doctor.id) {
          doctorIdMap.add(doctor.id);
        }
        if (doctor.name) {
          // Normalize doctor name for comparison (case-insensitive, trimmed)
          doctorNameMap.add(doctor.name.trim().toLowerCase());
        }
      });

      console.log('📊 Doctor validation maps:', {
        doctorIds: doctorIdMap.size,
        doctorNames: doctorNameMap.size,
        sampleDoctorNames: Array.from(doctorNameMap).slice(0, 5)
      });

      // Extract unique clinics - only from active clinics
      const uniqueClinics = new Set<string>([ALL_CLINICS]);
      
      // Add only active clinics from clinics table
      clinicsData?.forEach(clinic => {
        if (clinic.name && clinic.status === 'active') {
          uniqueClinics.add(clinic.name);
        }
      });
      
      // Add clinics from bookings only if they match active clinics
      bookingsData?.forEach(booking => {
        // Only add if clinic_id matches an active clinic
        if (booking.clinic_id && clinicMap.has(booking.clinic_id)) {
          const clinicName = clinicMap.get(booking.clinic_id)!;
          // Verify it's an active clinic
          const clinic = clinicsData?.find(c => c.id === booking.clinic_id);
          if (clinic && clinic.status === 'active') {
            uniqueClinics.add(clinicName);
          }
        }
        // Also check if clinic name matches an active clinic name
        if (booking.clinic) {
          const clinic = clinicsData?.find(c => c.name === booking.clinic && c.status === 'active');
          if (clinic) {
            uniqueClinics.add(booking.clinic);
          }
        }
      });
      
      setClinics(Array.from(uniqueClinics).sort());

      // Transform bookings to appointments - keep real clinic bookings even when
      // the patient came from receptionist/manual snapshot fields instead of a profile.
      const bookingsWithProfiles = (bookingsData || []).filter((booking: any) => {
        const profile = profileMap.get(booking.user_id);
        const hasPatientIdentity = Boolean(profile?.full_name || profile?.email || hasManualSnapshot(booking));
        if (!hasPatientIdentity) {
          return false;
        }

        if (booking.clinic_id && !clinicMap.has(booking.clinic_id)) {
          return false;
        }

        if (booking.booking_type === 'treatment') {
          if (!(booking.treatment_id || booking.treatment_name)) {
            return false;
          }
        } else if (booking.doctor_id) {
          if (!doctorIdMap.has(booking.doctor_id)) {
            return false;
          }
        } else if (booking.doctor_name) {
          const normalizedDoctorName = booking.doctor_name.trim().toLowerCase();
          if (!doctorNameMap.has(normalizedDoctorName)) {
            return false;
          }
        } else {
          return false;
        }

        return true;
      });

      console.log('📊 Filtered appointments:', {
        totalBookings: bookingsData?.length || 0,
        bookingsWithProfiles: bookingsWithProfiles.length,
        filteredOut: (bookingsData?.length || 0) - bookingsWithProfiles.length,
        reason: 'Only showing appointments with real clinics and valid patient/provider data'
      });

      // Extract unique doctors and specialties for filter dropdowns
      // Only from real doctors and filtered appointments
      const uniqueDoctors = new Set<string>(['']);
      const uniqueSpecialties = new Set<string>(['']);
      
      // Use filtered appointments instead of all bookings
      bookingsWithProfiles.forEach(booking => {
        if (booking.doctor_name) {
          uniqueDoctors.add(booking.doctor_name);
        }
        if (booking.specialty) {
          uniqueSpecialties.add(booking.specialty);
        }
      });
      
      setDoctors(Array.from(uniqueDoctors).filter(Boolean).sort());
      setSpecialties(Array.from(uniqueSpecialties).filter(Boolean).sort());

      const appointments: Appointment[] = bookingsWithProfiles.map((booking: any) => {
        const profile = profileMap.get(booking.user_id);
        const patientName = profile?.full_name || profile?.email || booking.patient_name || booking.patient_email || t('Unknown Patient');
        
        // Get clinic name - prefer from clinic_id mapping, fallback to clinic field
        let clinicName = booking.clinic || t('Unknown Clinic');
        if (booking.clinic_id && clinicMap.has(booking.clinic_id)) {
          clinicName = clinicMap.get(booking.clinic_id)!;
        }
        
        // Format date - same as public app
        const appointmentDate = new Date(booking.appointment_date);
        const formattedDate = appointmentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Format time - same as public app
        const timeStr = booking.appointment_time;
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        const formattedTime = `${displayHour}:${minutes} ${period}`;

        // Map status: 'confirmed' -> 'approved', 'cancelled' -> 'cancelled', 'pending' -> 'pending', 'completed' -> 'completed', 'rescheduled' -> 'pending'
        let status: Appointment['status'] = 'pending';
        if (booking.status === 'confirmed') {
          status = 'approved';
        } else if (booking.status === 'cancelled') {
          status = 'cancelled';
        } else if (booking.status === 'pending') {
          status = 'pending';
        } else if (booking.status === 'completed') {
          status = 'completed';
        } else if (booking.status === 'rescheduled') {
          // Rescheduled appointments show as pending for super admin
          status = 'pending';
        }

        const appointmentLabel =
          booking.booking_type === 'treatment' && booking.treatment_name
            ? booking.treatment_name
            : booking.doctor_name || t('Unknown Doctor');

        return {
          id: booking.id,
          user_id: booking.user_id,
          patientName: patientName,
          patientEmail: profile?.email || booking.patient_email || '',
          patientGender: profile?.gender || profile?.sex || booking.patient_gender || t('N/A'),
          patientContact: profile?.phone || profile?.contact || profile?.phone_number || booking.patient_phone || booking.patient_email || t('N/A'),
          doctorName: appointmentLabel,
          service: booking.specialty || t('Unknown Service'),
          serviceName: booking.service_name || null,
          clinic: clinicName,
          date: formattedDate,
          time: formattedTime,
          appointment_date: booking.appointment_date,
          appointment_time: booking.appointment_time,
          status: status,
          created_at: booking.created_at,
          confirmed_at: booking.confirmed_at || undefined,
          updated_at: booking.updated_at,
          note: booking.note || booking.notes || booking.comment || '',
          doctor_id: booking.doctor_id || null,
          bookingType: (booking.booking_type || 'doctor') as 'doctor' | 'treatment',
          treatmentName: booking.treatment_name || null,
          treatmentId: booking.treatment_id || null,
        };
      });

      console.log('📊 Appointments processed:', appointments.length);
      setAppointmentsData(appointments);
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
      setAppointmentsData([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter appointments based on status, search, clinic, and filter modal options
  const filteredAppointmentsData = useMemo(() => {
    return appointmentsData.filter((appointment) => {
      // Status filter
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
      
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        appointment.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.clinic.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Clinic filter
      const matchesClinic = selectedClinic === ALL_CLINICS || appointment.clinic === selectedClinic;
      
      // Date filter from filter modal
      let matchesDate = true;
      if (filterDate) {
        const appointmentDateStr = new Date(appointment.appointment_date).toISOString().split('T')[0];
        matchesDate = appointmentDateStr === filterDate;
      }
      
      // Doctor filter from filter modal
      const matchesDoctor = !filterDoctor || filterDoctor === 'all' || appointment.doctorName === filterDoctor;
      
      // Specialty filter from filter modal
      const matchesSpecialty = !filterSpecialty || filterSpecialty === 'all' || appointment.service === filterSpecialty;
      
      return matchesStatus && matchesSearch && matchesClinic && matchesDate && matchesDoctor && matchesSpecialty;
    });
  }, [
    appointmentsData,
    statusFilter,
    searchQuery,
    selectedClinic,
    filterDate,
    filterDoctor,
    filterSpecialty,
  ]);

  // Apply default sorting: pending appointments first (by date), then others
  const preSortedAppointments = useMemo(() => {
    return [...filteredAppointmentsData].sort((a, b) => {
      // Sort appointments: pending appointments first (by date), then others
      const aIsPending = a.status === 'pending';
      const bIsPending = b.status === 'pending';
      
      // If both are pending or both are not pending, sort by appointment date (latest first)
      if (aIsPending === bIsPending) {
        const aDate = new Date(a.appointment_date).getTime();
        const bDate = new Date(b.appointment_date).getTime();
        return bDate - aDate; // Latest date first
      }
      
      // Pending appointments come first
      return aIsPending ? -1 : 1;
    });
  }, [filteredAppointmentsData]);

  // Use table sort hook for column sorting
  const { sortedData: filteredAppointments, handleSort, getSortDirection } = useTableSort<Appointment>(
    preSortedAppointments
  );

  const handleSelectAppointment = (appointmentId: string) => {
    setSelectedAppointments((prev) =>
      prev.includes(appointmentId) ? prev.filter((id) => id !== appointmentId) : [...prev, appointmentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAppointments.length === filteredAppointments.length) {
      setSelectedAppointments([]);
    } else {
      setSelectedAppointments(filteredAppointments.map((appointment) => appointment.id));
    }
  };

  const getStatusBadge = (status: Appointment['status']) => {
    const statusConfig = {
      approved: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: Check,
        label: t('Approved'),
      },
      cancelled: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: X,
        label: t('Cancelled'),
      },
      pending: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        icon: Clock,
        label: t('Pending'),
      },
      completed: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: Check,
        label: t('Completed'),
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const handleExportToExcel = () => {
    const exportData = filteredAppointments.map((appointment) => ({
      [t('Patient Name')]: appointment.patientName,
      [t('Patient Email')]: appointment.patientEmail || t('N/A'),
      [t('Patient Contact')]: appointment.patientContact || t('N/A'),
      [t('Doctor / Treatment')]: appointment.doctorName,
      [t('Service')]: appointment.service,
      [t('Clinic')]: appointment.clinic,
      [t('Requested Date/Time')]: new Date(appointment.created_at).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      [t('Appointment Date')]: appointment.date,
      [t('Appointment Time')]: appointment.time,
      [t('Status')]: appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1),
      [t('Note')]: appointment.note || t('N/A'),
    }));

    exportToExcel(exportData, t('Appointments'));
    toast.success(t('Appointments data exported successfully!'));
  };

  const fetchDoctorDetails = async (appointment: Appointment) => {
    if (appointment.bookingType === 'treatment' && appointment.treatmentId) {
      try {
        setLoadingDoctorDetails(true);
        const { treatments } = await api.services.getBookableTreatments({ id: appointment.treatmentId });
        const treatmentData = treatments?.[0];

        setDoctorDetails({
          name: appointment.treatmentName || appointment.doctorName,
          specialty: treatmentData?.specialty || appointment.service,
          service: appointment.serviceName || treatmentData?.service || t('N/A'),
          availability: treatmentData?.availability || t('N/A'),
        });
      } catch (error) {
        console.error('❌ Error fetching treatment details:', error);
        setDoctorDetails({
          name: appointment.treatmentName || appointment.doctorName,
          specialty: appointment.service,
          service: appointment.serviceName || t('N/A'),
          availability: t('N/A'),
        });
      } finally {
        setLoadingDoctorDetails(false);
      }
      return;
    }

    if (!appointment.doctor_id) {
      // If no doctor_id, use basic info from appointment
      setDoctorDetails({
        name: appointment.doctorName,
        specialty: appointment.service,
        service: appointment.serviceName || t('N/A'),
        availability: t('N/A'),
      });
      return;
    }

    try {
      setLoadingDoctorDetails(true);
      console.log('🔍 Fetching doctor details from backend:', appointment.doctor_id);
      
      // Fetch all doctors and find the one matching the doctor_id
      const { doctors: doctorsData } = await api.doctors.getDoctors();
      const doctorData = doctorsData?.find((d: any) => d.id === appointment.doctor_id);

      if (doctorData) {
        setDoctorDetails({
          name:
            appointment.bookingType === 'treatment' && appointment.treatmentName
              ? appointment.treatmentName
              : doctorData.name || appointment.doctorName,
          specialty: doctorData.specialty || appointment.service,
          service: appointment.serviceName || t('N/A'),
          availability: doctorData.availability || t('N/A'),
        });
      } else {
        // No doctor found, use appointment data
        setDoctorDetails({
          name: appointment.doctorName,
          specialty: appointment.service,
          service: appointment.serviceName || t('N/A'),
          availability: t('N/A'),
        });
      }
    } catch (error) {
      console.error('❌ Error fetching doctor details:', error);
      // Fallback to appointment data
      setDoctorDetails({
        name: appointment.doctorName,
        specialty: appointment.service,
        service: appointment.serviceName || t('N/A'),
        availability: t('N/A'),
      });
    } finally {
      setLoadingDoctorDetails(false);
    }
  };


  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`}>
        <AdminSidebar isDarkMode={isDarkMode} onDarkModeToggle={toggleDarkMode} />
        
        <main className="flex-1 bg-[#F7F7F7] dark:bg-gray-900 min-h-screen overflow-y-auto">
          <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('Appointments')}</h1>
              <div className="flex items-center gap-3">
                {/* Clinic Selection Dropdown */}
                <Select value={selectedClinic} onValueChange={setSelectedClinic}>
                  <SelectTrigger className="w-[200px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                    <SelectValue placeholder={t('All Clinics')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((clinic) => (
                      <SelectItem key={clinic} value={clinic}>
                        {clinic === ALL_CLINICS ? t('All Clinics') : clinic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={handleExportToExcel}
                  variant="outline"
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium px-6"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('Export to Excel')}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setIsFilterModalOpen(true)}
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {t('Filter')}
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder={t('Search by patient, doctor/treatment, or service...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-full h-10"
                />
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="mb-6 flex items-center gap-2">
              {(['all', 'pending', 'approved', 'cancelled'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-[#00FFA2] text-[#0C2243]'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {t(status === 'all' ? 'All' : status === 'pending' ? 'Pending' : status === 'approved' ? 'Approved' : 'Cancelled')}
                </button>
              ))}
            </div>

            {/* Appointments Table */}
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
                          checked={selectedAppointments.length === filteredAppointments.length && filteredAppointments.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                        />
                      </th>
                      <TableSortHeader
                        sortDirection={getSortDirection('patientName')}
                        onSort={() => handleSort('patientName')}
                      >
                        {t('Patient Name')}
                      </TableSortHeader>
                      <TableSortHeader
                        sortDirection={getSortDirection('doctorName')}
                        onSort={() => handleSort('doctorName')}
                      >
                        {t('Doctor / Treatment')}
                      </TableSortHeader>
                      <TableSortHeader
                        sortDirection={getSortDirection('service')}
                        onSort={() => handleSort('service')}
                      >
                        {t('Specialty')}
                      </TableSortHeader>
                      <TableSortHeader
                        sortDirection={getSortDirection('clinic')}
                        onSort={() => handleSort('clinic')}
                      >
                        Clinic
                      </TableSortHeader>
                      <TableSortHeader
                        sortDirection={getSortDirection('created_at')}
                        onSort={() => handleSort('created_at')}
                      >
                        Requested Date/Time
                      </TableSortHeader>
                      <TableSortHeader
                        sortDirection={getSortDirection('appointment_date')}
                        onSort={() => handleSort('appointment_date')}
                      >
                        {t('Date & Time')}
                      </TableSortHeader>
                      <TableSortHeader
                        sortDirection={getSortDirection('status')}
                        onSort={() => handleSort('status')}
                      >
                        {t('Status')}
                      </TableSortHeader>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('Action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.length > 0 ? (
                      filteredAppointments.map((appointment) => (
                      <tr
                        key={appointment.id}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <input
                            type="checkbox"
                            checked={selectedAppointments.includes(appointment.id)}
                            onChange={() => handleSelectAppointment(appointment.id)}
                            className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{appointment.patientName}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{appointment.doctorName}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{appointment.service}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{appointment.clinic}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(appointment.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}, {new Date(appointment.created_at).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{appointment.date}, {appointment.time}</span>
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(appointment.status)}
                        </td>
                        <td className="py-4 px-6">
                          <Button
                            onClick={async () => {
                              setSelectedAppointment(appointment);
                              setShowDetailsModal(true);
                              // Fetch doctor details
                              await fetchDoctorDetails(appointment);
                            }}
                            variant="outline"
                            size="sm"
                            className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white border-0 text-xs px-4 py-2 rounded-lg"
                          >
                            {t('View Details')}
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        {t('No appointments found')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </main>

        {/* Filter Modal */}
        <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">{t('Filter')}</DialogTitle>
              <DialogDescription className="sr-only">
                {t('Filter appointments by date, doctor, or specialty')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Date Input */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{t('Date')} :</label>
                <div className="relative flex-1">
                  <Calendar 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 cursor-pointer z-10 hover:text-gray-600 dark:hover:text-gray-400" 
                    onClick={() => {
                      const dateInput = document.getElementById('filter-date-input') as HTMLInputElement;
                      if (dateInput) {
                          if (typeof dateInput.showPicker === 'function') {
                            dateInput.showPicker();
                          } else {
                            dateInput.click();
                          }
                      }
                    }}
                  />
                  <Input
                    id="filter-date-input"
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg h-10 text-gray-900 dark:text-white pl-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:h-4"
                  />
                </div>
              </div>

              {/* Doctor Dropdown */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{t('Doctor')} :</label>
                <Select value={filterDoctor || 'all'} onValueChange={(value) => setFilterDoctor(value === 'all' ? '' : value)}>
                  <SelectTrigger className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg h-10 text-gray-900 dark:text-white">
                    <SelectValue placeholder={t("Select a doctor's name")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Doctors')}</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor} value={doctor}>
                        {doctor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Specialty Dropdown */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{t('Specialty')} :</label>
                <Select value={filterSpecialty || 'all'} onValueChange={(value) => setFilterSpecialty(value === 'all' ? '' : value)}>
                  <SelectTrigger className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg h-10 text-gray-900 dark:text-white">
                    <SelectValue placeholder={t('Select specialty')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Specialties')}</SelectItem>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterDate('');
                    setFilterDoctor('');
                    setFilterSpecialty('');
                    setIsFilterModalOpen(false);
                  }}
                  className="flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
                >
                  {t('Clear filters')}
                </Button>
                <Button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="flex-1 bg-[#0C2243] hover:bg-[#0C2243]/90 text-white"
                >
                  {t('Apply filters')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Appointment Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('Appointment Details')}</DialogTitle>
            </DialogHeader>
            {selectedAppointment && (
              <div className="space-y-6 py-4">
                {/* Patient Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase">{t('Patient Information')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500 text-xs">{t('Name')}</Label>
                      <p className="mt-1 text-sm font-medium">{selectedAppointment.patientName}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">{t('Gender')}</Label>
                      <p className="mt-1 text-sm">{selectedAppointment.patientGender || t('N/A')}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">{t('Contact')}</Label>
                      <p className="mt-1 text-sm">{selectedAppointment.patientContact || t('N/A')}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">{t('Email')}</Label>
                      <p className="mt-1 text-sm">{selectedAppointment.patientEmail || t('N/A')}</p>
                    </div>
                  </div>
                </div>

                {/* DOCTOR'S / TREATMENT INFORMATION */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    {t('Doctor / Treatment Information')}
                  </h3>
                  {loadingDoctorDetails ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('Loading doctor details...')}</p>
                    </div>
                  ) : doctorDetails ? (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Name')}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{doctorDetails.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Specialty')}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{doctorDetails.specialty}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Service')}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{doctorDetails.service || t('N/A')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Availability')}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{doctorDetails.availability}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Name')}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointment.doctorName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Service')}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('N/A')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Specialty')}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointment.service}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Availability')}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('N/A')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Appointment Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase">{t('Appointment Information')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500 text-xs">{t('Date & Time')}</Label>
                      <p className="mt-1 text-sm font-medium">
                        {new Date(selectedAppointment.appointment_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}, {selectedAppointment.time}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">{t('Status')}</Label>
                      <div className="mt-1">
                        {getStatusBadge(selectedAppointment.status)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">{t('Duration')}</Label>
                      <p className="mt-1 text-sm">{t('30 minutes')}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">{t('Clinic')}</Label>
                      <p className="mt-1 text-sm">{selectedAppointment.clinic}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">{t('Created At')}</Label>
                      <p className="mt-1 text-sm">
                        {new Date(selectedAppointment.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {selectedAppointment.confirmed_at && (
                      <div>
                        <Label className="text-gray-500 text-xs">{t('Confirmed At')}</Label>
                        <p className="mt-1 text-sm">
                          {new Date(selectedAppointment.confirmed_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Note Section */}
                <div>
                  <Label className="text-gray-500 text-xs mb-2 block">{t('Note')}</Label>
                  <Textarea
                    value={selectedAppointment.note || t('No notes available')}
                    readOnly
                    className="bg-gray-50 border-gray-200 min-h-[80px]"
                    placeholder={t('No notes available')}
                  />
                </div>
              </div>
            )}
            {selectedAppointment?.status !== 'cancelled' && (
              <div className="flex items-center gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCancelConfirmModalOpen(true);
                  }}
                  className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  {t('Cancel Appointment')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedAppointment) {
                      // Set initial values to current appointment date/time
                      setNewAppointmentDate(selectedAppointment.appointment_date);
                      setNewAppointmentTime(selectedAppointment.appointment_time);
                      setIsRescheduleModalOpen(true);
                    }
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('Reschedule')}
                </Button>
                {selectedAppointment?.status === 'pending' && (
                  <Button
                    onClick={() => {
                      setIsApproveConfirmModalOpen(true);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {t('Approve Appointment')}
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approve Appointment Confirmation Modal */}
        <Dialog open={isApproveConfirmModalOpen} onOpenChange={setIsApproveConfirmModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">{t('Approve Appointment')}</DialogTitle>
              <DialogDescription className="sr-only">
                Confirm approval of this appointment
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to approve this appointment? The patient will see it in their upcoming appointments.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsApproveConfirmModalOpen(false)}
                className="border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedAppointment) return;

                  try {
                    console.log('🔄 Super Admin approving appointment via backend:', selectedAppointment.id);
                    await api.bookings.updateBooking(selectedAppointment.id, {
                      status: 'confirmed',
                      confirmed_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    });

                    console.log('✅ Appointment approved successfully');
                    toast.success(t('Appointment approved successfully. Patient will see it in upcoming appointments.'));
                    setIsApproveConfirmModalOpen(false);
                    setShowDetailsModal(false);
                    setSelectedAppointment(null);
                    await fetchAppointments(); // Refresh the list
                  } catch (error: any) {
                    console.error('❌ Error approving appointment:', error);
                    toast.error(error.message || t('Error approving appointment'));
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Approve
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Appointment Confirmation Modal */}
        <Dialog open={isCancelConfirmModalOpen} onOpenChange={setIsCancelConfirmModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">{t('Cancel Appointment')}</DialogTitle>
              <DialogDescription className="sr-only">
                Confirm cancellation of this appointment
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to cancel this appointment? The patient will see it as cancelled in their appointments.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsCancelConfirmModalOpen(false)}
                className="border-gray-300 dark:border-gray-600"
              >
                No, Keep It
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedAppointment) return;

                  try {
                    console.log('🔄 Super Admin cancelling appointment via backend:', selectedAppointment.id);
                    await api.bookings.updateBooking(selectedAppointment.id, {
                      status: 'cancelled',
                      updated_at: new Date().toISOString()
                    });

                    console.log('✅ Appointment cancelled successfully');
                    toast.success(t('Appointment cancelled successfully. Patient will see it as cancelled.'));
                    setIsCancelConfirmModalOpen(false);
                    setShowDetailsModal(false);
                    setSelectedAppointment(null);
                    await fetchAppointments(); // Refresh the list
                  } catch (error: any) {
                    console.error('❌ Error cancelling appointment:', error);
                    toast.error(error.message || t('Error cancelling appointment'));
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {t('Yes, Cancel')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reschedule Appointment Modal */}
        <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">{t('Reschedule Appointment')}</DialogTitle>
              <DialogDescription className="sr-only">
                Select new date and time for this appointment
              </DialogDescription>
            </DialogHeader>
            {selectedAppointment && (
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="reschedule-date" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    New Date
                  </Label>
                  <div className="relative">
                    <Calendar 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 cursor-pointer z-10" 
                      onClick={() => {
                        const dateInput = document.getElementById('reschedule-date') as HTMLInputElement;
                        if (dateInput && typeof dateInput.showPicker === 'function') {
                          dateInput.showPicker();
                        } else {
                          dateInput?.click();
                        }
                      }}
                    />
                    <Input
                      id="reschedule-date"
                      type="date"
                      value={newAppointmentDate}
                      onChange={(e) => setNewAppointmentDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border-gray-300 dark:border-gray-600 rounded-lg h-10 pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="reschedule-time" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    New Time
                  </Label>
                  <div className="relative">
                    <Clock 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 cursor-pointer z-10" 
                      onClick={() => {
                        const timeInput = document.getElementById('reschedule-time') as HTMLInputElement;
                        if (timeInput && typeof timeInput.showPicker === 'function') {
                          timeInput.showPicker();
                        } else {
                          timeInput?.click();
                        }
                      }}
                    />
                    <Input
                      id="reschedule-time"
                      type="time"
                      value={newAppointmentTime}
                      onChange={(e) => setNewAppointmentTime(e.target.value)}
                      className="w-full border-gray-300 dark:border-gray-600 rounded-lg h-10 pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                    />
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>{t('Note')}:</strong> {t('The appointment will be marked as "rescheduled" and the patient will need to approve the new date and time.')}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRescheduleModalOpen(false);
                  setNewAppointmentDate('');
                  setNewAppointmentTime('');
                }}
                className="border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedAppointment) return;

                  if (!newAppointmentDate || !newAppointmentTime) {
                    toast.error(t('Please select both date and time'));
                    return;
                  }

                  try {
                    console.log('🔄 Super Admin rescheduling appointment via backend:', selectedAppointment.id);
                    await api.bookings.updateBooking(selectedAppointment.id, {
                      appointment_date: newAppointmentDate,
                      appointment_time: newAppointmentTime,
                      status: 'rescheduled',
                      updated_at: new Date().toISOString()
                    });

                    console.log('✅ Appointment rescheduled successfully');
                    toast.success(t('Appointment rescheduled successfully. Patient will see it in pending appointments.'));
                    setIsRescheduleModalOpen(false);
                    setShowDetailsModal(false);
                    setNewAppointmentDate('');
                    setNewAppointmentTime('');
                    setSelectedAppointment(null);
                    await fetchAppointments(); // Refresh the list
                  } catch (error: any) {
                    console.error('❌ Error rescheduling appointment:', error);
                    toast.error(error.message || t('Error rescheduling appointment'));
                  }
                }}
                className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white"
              >
                Confirm Reschedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default AdminAppointments;

