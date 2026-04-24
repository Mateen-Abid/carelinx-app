import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DoctorSidebar from '@/components/doctor/DoctorSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Check, Clock, X, ArrowUpDown, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Appointment {
  id: string;
  user_id: string;
  patientName: string;
  doctorName: string;
  service: string;
  serviceName?: string | null;
  bookingType?: 'doctor' | 'treatment';
  treatmentName?: string | null;
  treatmentId?: string | null;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  doctor_id?: string | null;
}

interface AppointmentDetails {
  id: string;
  patient: {
    name: string;
    gender: string;
    contact: string;
    email: string;
  };
  doctor: {
    name: string;
    specialty: string;
    service: string;
    availability: string;
  };
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

interface Clinic {
  id: string;
  name: string;
  logo_url: string | null;
}

const DoctorAppointments = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [appointmentsData, setAppointmentsData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'this-week' | 'all-time'>('all-time');
  const [checkingClinic, setCheckingClinic] = useState(true);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<AppointmentDetails | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isApproveConfirmModalOpen, setIsApproveConfirmModalOpen] = useState(false);
  const [isCancelConfirmModalOpen, setIsCancelConfirmModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [newAppointmentDate, setNewAppointmentDate] = useState<string>('');
  const [newAppointmentTime, setNewAppointmentTime] = useState<string>('');

  useEffect(() => {
    const checkClinicExists = async () => {
      if (!user) return;

      try {
        const { clinic: clinicData } = await api.doctor.getClinic();

        if (!clinicData || clinicData.status === 'pending') {
          setCheckingClinic(false);
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
  }, [user]);

  useEffect(() => {
    if (clinic?.id) {
      fetchAppointments();
    }
  }, [clinic?.id, dateFilter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { bookings, profiles } = await api.doctor.getBookings(dateFilter);
      const bookingsData = bookings || [];

      // Fetch profiles to get patient names
      const profilesData = profiles || [];

      const profileMap = new Map();
      profilesData?.forEach((profile: any) => {
        profileMap.set(profile.user_id, profile);
      });

      // Transform bookings to appointments
      const appointments: Appointment[] = bookingsData.map((booking: any) => {
        const profile = profileMap.get(booking.user_id);
        
        // Map database status to UI status
        let mappedStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled';
        const dbStatus = booking.status || 'pending';
        
        if (dbStatus === 'confirmed') {
          mappedStatus = 'confirmed';
        } else if (dbStatus === 'pending') {
          mappedStatus = 'pending';
        } else if (dbStatus === 'cancelled') {
          mappedStatus = 'cancelled';
        } else if (dbStatus === 'rescheduled') {
          mappedStatus = 'pending';
        } else {
          mappedStatus = 'pending';
        }
        
        const appointmentLabel =
          booking.booking_type === 'treatment' && booking.treatment_name
            ? booking.treatment_name
            : booking.doctor_name || t('Unknown Doctor');

        return {
          id: booking.id,
          user_id: booking.user_id,
          patientName: profile?.full_name || t('Unknown Patient'),
          doctorName: appointmentLabel,
          service: booking.specialty || t('General Consultation'),
          serviceName: booking.service_name || null,
          bookingType: (booking.booking_type || 'doctor') as 'doctor' | 'treatment',
          treatmentName: booking.treatment_name || null,
          treatmentId: booking.treatment_id || null,
          appointment_date: booking.appointment_date,
          appointment_time: booking.appointment_time,
          status: mappedStatus,
          created_at: booking.created_at,
          doctor_id: (booking as any).doctor_id,
        };
      });

      setAppointmentsData(appointments);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return t('N/A');
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes || '0', 10), 0, 0);
    return date.toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' });
  };

  const getStatusBadge = (status: Appointment['status']) => {
    const statusConfig = {
      approved: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: Check,
        label: t('Approved'),
      },
      confirmed: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: Check,
        label: t('Confirmed'),
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

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const handleSelectAll = () => {
    if (selectedAppointments.length === filteredAppointments.length) {
      setSelectedAppointments([]);
    } else {
      setSelectedAppointments(filteredAppointments.map(apt => apt.id));
    }
  };

  const handleSelectAppointment = (appointmentId: string) => {
    setSelectedAppointments((prev) =>
      prev.includes(appointmentId) ? prev.filter((id) => id !== appointmentId) : [...prev, appointmentId]
    );
  };

  const handleViewDetails = async (appointment: Appointment) => {
    try {
      setLoadingDetails(true);
      setIsDetailsModalOpen(true);

      // Fetch full appointment details
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', appointment.id)
        .single();

      if (bookingError) {
        console.error('Error fetching booking:', bookingError);
        toast.error(t('Failed to load appointment details'));
        setIsDetailsModalOpen(false);
        return;
      }

      // Fetch patient profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, phone, gender')
        .eq('user_id', appointment.user_id)
        .maybeSingle();

      // Fetch doctor details if doctor_id exists
      let doctorData = null;
      if ((bookingData as any).doctor_id) {
        const { data: docData } = await (supabase as any)
          .from('doctors')
          .select('name, specialty, availability, services')
          .eq('id', (bookingData as any).doctor_id)
          .maybeSingle();
        doctorData = docData;
      }

      let treatmentData: any = null;
      if ((bookingData as any).booking_type === 'treatment' && (bookingData as any).treatment_id) {
        try {
          const { treatments } = await api.services.getBookableTreatments({ id: (bookingData as any).treatment_id });
          treatmentData = treatments?.[0] || null;
        } catch (error) {
          console.error('Error fetching treatment details:', error);
        }
      }

      // Build appointment details
      const isTreatmentBooking = (bookingData as any).booking_type === 'treatment';
      const resolvedSpecialty =
        treatmentData?.specialty || doctorData?.specialty || (bookingData as any).specialty || appointment.service || t('General');
      const resolvedService = isTreatmentBooking
        ? (bookingData as any).service_name || treatmentData?.service || t('N/A')
        : (bookingData as any).service_name || t('N/A');

      const details: AppointmentDetails = {
        id: appointment.id,
        patient: {
          name: (profileData as any)?.full_name || appointment.patientName || t('Unknown Patient'),
          gender: (profileData as any)?.gender || t('Not specified'),
          contact: (profileData as any)?.phone || t('Not provided'),
          email: (profileData as any)?.email || t('Not provided'),
        },
        doctor: {
          name:
            isTreatmentBooking && (bookingData as any).treatment_name
              ? (bookingData as any).treatment_name
              : doctorData?.name || (bookingData as any).doctor_name || appointment.doctorName || t('Unknown Doctor'),
          specialty: resolvedSpecialty,
          service: resolvedService,
          availability: treatmentData?.availability || doctorData?.availability || t('9:00 AM - 5:00 PM'),
        },
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        status: appointment.status as 'pending' | 'confirmed' | 'cancelled' | 'completed',
      };

      setSelectedAppointmentDetails(details);
    } catch (error) {
      console.error('Error loading appointment details:', error);
      toast.error(t('Failed to load appointment details'));
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleApproveAppointment = () => {
    // Show confirmation modal first
    setIsApproveConfirmModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedAppointmentDetails) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', selectedAppointmentDetails.id);

      if (error) throw error;

      toast.success(t('Appointment approved successfully'));
      setIsApproveConfirmModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedAppointmentDetails(null);
      
      // Refresh appointments
      if (clinic?.id) {
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
      toast.error(t('Failed to approve appointment'));
    }
  };

  const handleCancelAppointment = () => {
    // Show confirmation modal first
    setIsCancelConfirmModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedAppointmentDetails) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', selectedAppointmentDetails.id);

      if (error) throw error;

      toast.success(t('Appointment cancelled successfully'));
      setIsCancelConfirmModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedAppointmentDetails(null);
      
      // Refresh appointments
      if (clinic?.id) {
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error(t('Failed to cancel appointment'));
    }
  };

  const handleRescheduleAppointment = () => {
    console.log('🔄 handleRescheduleAppointment called');
    console.log('📋 selectedAppointmentDetails:', selectedAppointmentDetails);
    
    // Open reschedule modal
    setIsRescheduleModalOpen(true);
    console.log('✅ Reschedule modal state set to true');
    
    // Set initial values to current appointment date/time
    if (selectedAppointmentDetails) {
      // Keep date in YYYY-MM-DD format for date input type
      setNewAppointmentDate(selectedAppointmentDetails.appointment_date);
      console.log('📅 Set new date:', selectedAppointmentDetails.appointment_date);
      
      // Convert time from HH:MM to HH:MM format (keep as is)
      setNewAppointmentTime(selectedAppointmentDetails.appointment_time);
      console.log('⏰ Set new time:', selectedAppointmentDetails.appointment_time);
    } else {
      console.warn('⚠️ No selectedAppointmentDetails available');
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedAppointmentDetails) return;

    // Validate inputs
    if (!newAppointmentDate || !newAppointmentTime) {
      toast.error(t('Please select both date and time'));
      return;
    }

    try {
      // Date is already in YYYY-MM-DD format from date input type
      const formattedDate = newAppointmentDate;
      
      // Validate date
      const dateObj = new Date(formattedDate);
      if (isNaN(dateObj.getTime())) {
        toast.error(t('Invalid date. Please select a valid date'));
        return;
      }

      // Update appointment in database - set status to 'rescheduled' so public user knows they need to approve
      const { error } = await supabase
        .from('bookings')
        .update({ 
          appointment_date: formattedDate,
          appointment_time: newAppointmentTime,
          status: 'rescheduled', // Set status to rescheduled so public user sees it in pending
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAppointmentDetails.id);

      if (error) throw error;

      toast.success(t('Appointment rescheduled successfully'));
      setIsRescheduleModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedAppointmentDetails(null);
      setNewAppointmentDate('');
      setNewAppointmentTime('');
      
      // Refresh appointments
      if (clinic?.id) {
        fetchAppointments();
      }
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      const errorMessage = error?.message || 'Failed to reschedule appointment';
      console.error('Full error details:', {
        message: errorMessage,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      toast.error(t('Failed to reschedule appointment: {{message}}', { message: errorMessage }));
    }
  };

  // Format date for display in reschedule modal
  const formatDateForReschedule = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Filter appointments
  const filteredAppointments = appointmentsData.filter((appointment) => {
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'approved' && appointment.status === 'confirmed') ||
      (statusFilter === 'pending' && appointment.status === 'pending') ||
      (statusFilter === 'cancelled' && appointment.status === 'cancelled');
    
    const matchesSearch = searchQuery === '' ||
      appointment.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.service.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  if (checkingClinic) {
    return (
      <ProtectedRoute allowedRoles={['doctor']}>
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
    <ProtectedRoute allowedRoles={['doctor']}>
      <div className="min-h-screen flex">
        <DoctorSidebar />
        
        <main className="flex-1 bg-[#F7F7F7] dark:bg-gray-900 min-h-screen overflow-y-auto">
          <div className="p-8">
            {/* Page Header */}
            <div className="mb-6">
              {/* Title and Clinic Info Row */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('Appointments')}</h1>
                
                {/* Clinic Name and Logo */}
                <div className="flex items-center gap-3">
                  {clinic?.logo_url && (
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#00FFA2] flex items-center justify-center flex-shrink-0">
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
                    <div className="w-10 h-10 rounded-full bg-[#00FFA2] flex items-center justify-center flex-shrink-0">
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

              {/* Status Filter Tabs and Date Filters Row */}
              <div className="flex items-center justify-between mb-4">
                {/* Status Filter Tabs */}
                <div className="flex gap-2">
                  {(['all', 'pending', 'approved', 'cancelled'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        statusFilter === filter
                          ? 'bg-[#00FFA2] text-[#0C2243] font-medium'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {filter === 'all'
                        ? t('All')
                        : filter === 'pending'
                        ? t('Pending')
                        : filter === 'approved'
                        ? t('Approved')
                        : t('Cancelled')}
                    </button>
                  ))}
                </div>

                {/* Date Range Filters */}
                <div className="flex items-center gap-2">
                  {(['today', 'tomorrow', 'this-week', 'all-time'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setDateFilter(filter)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        dateFilter === filter
                          ? 'bg-[#00FFA2] text-[#0C2243] font-medium'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {filter === 'today'
                        ? t('Today')
                        : filter === 'tomorrow'
                        ? t('Tomorrow')
                        : filter === 'this-week'
                        ? t('This week')
                        : t('To date')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative max-w-md">
                  <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4`} />
                  <Input
                    type="text"
                    placeholder={t('Search by patient, doctor/treatment, or service...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`${isRtl ? 'pr-10 pl-3 text-right' : 'pl-10'} bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-lg`}
                  />
                </div>
              </div>
            </div>

            {/* Appointments Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">{t('Loading appointments...')}</p>
                </div>
              ) : filteredAppointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <th className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-4`}>
                          <input
                            type="checkbox"
                            checked={selectedAppointments.length === filteredAppointments.length && filteredAppointments.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                          />
                        </th>
                        <th className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white`}>
                          {t('Patient Name')}
                        </th>
                        <th className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white`}>
                          {t('Doctor / Treatment')}
                        </th>
                        <th className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white`}>
                          {t('Specialty')}
                        </th>
                        <th className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white`}>
                          <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            {t('Date & Time')}
                            <ArrowUpDown className="w-4 h-4 text-gray-400" />
                          </div>
                        </th>
                        <th className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white`}>
                          {t('Status')}
                        </th>
                        <th className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white`}>
                          {t('Action')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAppointments.map((appointment) => (
                        <tr
                          key={appointment.id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-4`}>
                            <input
                              type="checkbox"
                              checked={selectedAppointments.includes(appointment.id)}
                              onChange={() => handleSelectAppointment(appointment.id)}
                              className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                            />
                          </td>
                          <td className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-4 text-sm text-gray-900 dark:text-white font-medium`}>
                            {appointment.patientName}
                          </td>
                          <td className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-4 text-sm text-gray-600 dark:text-gray-400`}>
                            {appointment.doctorName}
                          </td>
                          <td className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-4 text-sm text-gray-600 dark:text-gray-400`}>
                            {appointment.service}
                          </td>
                          <td className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-4 text-sm text-gray-600 dark:text-gray-400`}>
                            {formatDate(appointment.appointment_date)} {t('at')} {formatTime(appointment.appointment_time)}
                          </td>
                          <td className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-4`}>
                            {getStatusBadge(appointment.status)}
                          </td>
                          <td className={`${isRtl ? 'text-right' : 'text-left'} py-4 px-4`}>
                            <Button
                              size="sm"
                              className="bg-[#0C2243] text-white hover:bg-[#0a1a35] text-xs px-4 py-1.5 font-medium"
                              onClick={() => handleViewDetails(appointment)}
                            >
                              {t('View Details')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">{t('No appointments found')}</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Appointment Details Modal */}
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="max-w-2xl mx-auto bg-white rounded-lg p-0 overflow-hidden shadow-xl border-0">
            <DialogHeader className="px-6 pt-6 pb-5 border-b border-gray-200">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {t('Appointment Details')}
              </DialogTitle>
            </DialogHeader>

            {loadingDetails ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] mx-auto mb-4"></div>
                <p className="text-gray-500">{t('Loading appointment details...')}</p>
              </div>
            ) : selectedAppointmentDetails ? (
              <div className="px-6 py-6">
                {/* PATIENT INFORMATION */}
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    {t('Patient Information')}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Name')}</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Gender')}</p>
                      <p className="text-sm font-semibold text-gray-900">{t(selectedAppointmentDetails.patient.gender)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Contact')}</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.patient.contact}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Email')}</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.patient.email}</p>
                    </div>
                  </div>
                </div>

                {/* DOCTOR'S / TREATMENT INFORMATION */}
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    {t('Doctor / Treatment Information')}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Name')}</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Specialty')}</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.specialty}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Service')}</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.service}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Availability')}</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.availability}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedAppointmentDetails.status !== 'cancelled' && (
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <Button
                      onClick={handleCancelAppointment}
                      variant="outline"
                      className="border-red-600 text-red-600 bg-white hover:bg-red-50 px-6 py-2.5 flex items-center gap-2 rounded-lg font-medium"
                    >
                      <X className="w-4 h-4 text-red-600" />
                      {t('Cancel Appointment')}
                    </Button>
                    <Button
                      onClick={handleRescheduleAppointment}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-2.5 flex items-center gap-2 rounded-lg font-medium"
                    >
                      <Clock className="w-4 h-4" />
                      {t('Reschedule')}
                    </Button>
                    {selectedAppointmentDetails.status === 'pending' && (
                      <Button
                        onClick={handleApproveAppointment}
                        className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-white px-6 py-2.5 flex items-center gap-2 rounded-lg font-medium shadow-sm"
                      >
                        <Check className="w-4 h-4 text-white" />
                        {t('Approve Appointment')}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Approve Appointment Confirmation Modal */}
        <Dialog open={isApproveConfirmModalOpen} onOpenChange={setIsApproveConfirmModalOpen}>
          <DialogContent className="max-w-md mx-auto bg-white rounded-lg p-0 overflow-hidden shadow-xl border-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {t('Approve Appointment')}
              </DialogTitle>
            </DialogHeader>

            {selectedAppointmentDetails ? (
              <div className="px-6 py-6">
                {/* Large Green Checkmark Icon */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    {/* Outer circle */}
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                      {/* Inner circle with checkmark */}
                      <div className="w-16 h-16 bg-[#00FFA2] rounded-full flex items-center justify-center">
                        <Check className="w-10 h-10 text-white" strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appointment Details */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Patient')}</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Doctor')}</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Date & Time')}</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(selectedAppointmentDetails.appointment_date)} {t('at')} {formatTime(selectedAppointmentDetails.appointment_time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Service')}</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.service}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1.5">{t('Status')}</p>
                      <p className="text-sm font-semibold text-gray-900">{t('Pending Approval')}</p>
                    </div>
                  </div>
                </div>

                {/* Confirmation Message */}
                <div className="mb-6">
                  <p className="text-sm text-gray-600 text-center leading-relaxed">
                    {t('Are you sure you want to approve this appointment? This will confirm the booking and notify both parties.')}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => setIsApproveConfirmModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium"
                  >
                    {t('Cancel')}
                  </Button>
                  <Button
                    onClick={handleConfirmApprove}
                    className="flex-1 bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm"
                  >
                    {t('Approve Appointment')}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Cancel Appointment Confirmation Modal */}
        <Dialog open={isCancelConfirmModalOpen} onOpenChange={setIsCancelConfirmModalOpen}>
          <DialogContent className="max-w-md mx-auto bg-white rounded-lg p-0 overflow-hidden shadow-xl border-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {t('Cancel Appointment')}
              </DialogTitle>
            </DialogHeader>

            {selectedAppointmentDetails ? (
              <div className="px-6 py-6">
                {/* Large Red Cancel Icon */}
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

                {/* Appointment Details */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Patient')}</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Doctor')}</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Date & Time')}</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(selectedAppointmentDetails.appointment_date)} {t('at')} {formatTime(selectedAppointmentDetails.appointment_time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('Service')}</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.service}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1.5">{t('Status')}</p>
                      <p className="text-sm font-semibold text-gray-900">{t('Pending Approval')}</p>
                    </div>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="mb-6">
                  <p className="text-sm text-red-600 text-center leading-relaxed">
                    {t('Once cancelled, this appointment will be marked as "Cancelled".')}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => setIsCancelConfirmModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium"
                  >
                    {t('Discard')}
                  </Button>
                  <Button
                    onClick={handleConfirmCancel}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium"
                  >
                    {t('Confirm Cancellation')}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Reschedule Appointment Modal */}
        <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
          <DialogContent className="max-w-md mx-auto bg-white rounded-lg p-0 overflow-hidden shadow-xl border-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {t('Confirmation')}
              </DialogTitle>
            </DialogHeader>

            {selectedAppointmentDetails ? (
              <div className="px-6 py-6">
                {/* Calendar Icon with Clock */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-[#0C2243] rounded-full flex items-center justify-center">
                    <div className="relative">
                      <Calendar className="w-8 h-8 text-white" />
                      <Clock className="w-4 h-4 text-white absolute -bottom-1 -right-1 bg-[#00FFA2] rounded-full p-0.5" />
                    </div>
                  </div>
                </div>

                {/* Question */}
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {t('Reschedule Appointment?')}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {t('Are you sure you want to reschedule this appointment? Previous: {{date}} - {{time}} with {{doctor}}', {
                      date: formatDateForReschedule(selectedAppointmentDetails.appointment_date),
                      time: formatTime(selectedAppointmentDetails.appointment_time),
                      doctor: selectedAppointmentDetails.doctor.name,
                    })}
                  </p>
                </div>

                {/* Date and Time Inputs */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">{t('New date')}</label>
                    <div className="relative">
                      <Calendar 
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer z-10" 
                        onClick={() => {
                          const dateInput = document.getElementById('new-appointment-date') as HTMLInputElement;
                          if (dateInput) {
                            try {
                              (dateInput as any).showPicker?.();
                            } catch {
                              dateInput.click();
                            }
                          }
                        }}
                      />
                      <Input
                        id="new-appointment-date"
                        type="date"
                        value={newAppointmentDate}
                        onChange={(e) => setNewAppointmentDate(e.target.value)}
                        className="h-10 border-gray-300 focus:border-[#0C2243] focus:ring-[#0C2243] pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">{t('New time')}</label>
                    <div className="relative">
                      <Clock 
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer z-10" 
                        onClick={() => {
                          const timeInput = document.getElementById('new-appointment-time') as HTMLInputElement;
                          if (timeInput) {
                            try {
                              (timeInput as any).showPicker?.();
                            } catch {
                              timeInput.click();
                            }
                          }
                        }}
                      />
                      <Input
                        id="new-appointment-time"
                        type="time"
                        value={newAppointmentTime}
                        onChange={(e) => setNewAppointmentTime(e.target.value)}
                        className="h-10 border-gray-300 focus:border-[#0C2243] focus:ring-[#0C2243] pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => {
                      setIsRescheduleModalOpen(false);
                      setNewAppointmentDate('');
                      setNewAppointmentTime('');
                    }}
                    variant="outline"
                    className="flex-1 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium"
                  >
                    {t('Cancel')}
                  </Button>
                  <Button
                    onClick={handleConfirmReschedule}
                    className="flex-1 bg-[#0C2243] hover:bg-[#0a1a35] text-white px-6 py-2.5 rounded-lg font-medium"
                  >
                    {t('Confirm Reschedule')}
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

export default DoctorAppointments;
