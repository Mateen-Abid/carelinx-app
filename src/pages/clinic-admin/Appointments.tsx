import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClinicAdminSidebar from '@/components/clinic-admin/ClinicAdminSidebar';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Check, Clock, X, ArrowUpDown, RotateCcw, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  user_id: string;
  patientName: string;
  doctorName: string;
  service: string;
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

const ClinicAdminAppointments = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'completed' | 'cancelled'>('all');
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
      fetchAppointments(clinic.id);
    }
  }, [clinic?.id, dateFilter]);

  const fetchAppointments = async (clinicId: string) => {
    try {
      setLoading(true);
      console.log('🔍 Fetching appointments for clinic ID:', clinicId);
      console.log('📋 Clinic name:', clinic?.name);

      // Get date range for filtering
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - today.getDay());

      // Fetch bookings for this clinic - try by clinic_id first
      let bookingsQuery = supabase
        .from('bookings')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });
      
      console.log('🔍 Querying bookings by clinic_id:', clinicId);

      // Apply date filter
      if (dateFilter === 'today') {
        const todayStr = today.toISOString().split('T')[0];
        bookingsQuery = bookingsQuery.eq('appointment_date', todayStr);
      } else if (dateFilter === 'tomorrow') {
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        bookingsQuery = bookingsQuery.eq('appointment_date', tomorrowStr);
      } else if (dateFilter === 'this-week') {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        bookingsQuery = bookingsQuery
          .gte('appointment_date', weekStart.toISOString().split('T')[0])
          .lt('appointment_date', weekEnd.toISOString().split('T')[0]);
      }

      const { data: bookingsData, error: bookingsError } = await bookingsQuery;

      console.log('📋 Bookings by clinic_id:', {
        count: bookingsData?.length || 0,
        bookings: bookingsData?.map(b => ({ id: b.id, clinic_id: b.clinic_id, clinic: b.clinic, status: b.status })),
        error: bookingsError
      });

      if (bookingsError) {
        console.error('❌ Error fetching bookings by clinic_id:', bookingsError);
      }

      // Fallback: try by clinic name if no results (for bookings with NULL clinic_id)
      let bookings = bookingsData || [];
      if (bookings.length === 0 && clinic?.name) {
        console.log('🔄 Trying fallback: query by clinic name:', clinic.name);
        const { data: bookingsByName, error: errorByName } = await supabase
          .from('bookings')
          .select('*')
          .or(`clinic.eq.${clinic.name},clinic.ilike.${clinic.name}`)
          .order('appointment_date', { ascending: false })
          .order('appointment_time', { ascending: false });
        
        console.log('📋 Bookings by clinic name:', {
          count: bookingsByName?.length || 0,
          bookings: bookingsByName?.map(b => ({ id: b.id, clinic_id: b.clinic_id, clinic: b.clinic, status: b.status })),
          error: errorByName
        });
        
        if (bookingsByName && bookingsByName.length > 0) {
          // Update these bookings to have the correct clinic_id
          const bookingIdsToUpdate = bookingsByName
            .filter(b => !b.clinic_id)
            .map(b => b.id);
          
          if (bookingIdsToUpdate.length > 0) {
            console.log('🔧 Updating bookings with clinic_id:', bookingIdsToUpdate);
            const { error: updateError } = await supabase
              .from('bookings')
              .update({ clinic_id: clinicId })
              .in('id', bookingIdsToUpdate);
            
            if (updateError) {
              console.error('❌ Error updating clinic_id:', updateError);
            } else {
              console.log('✅ Updated bookings with clinic_id');
            }
          }
        }
        
        bookings = bookingsByName || [];
      }
      
      // Also query for bookings with NULL clinic_id that match clinic name
      if (clinic?.name) {
        const { data: bookingsWithNullClinicId } = await supabase
          .from('bookings')
          .select('*')
          .is('clinic_id', null)
          .or(`clinic.eq.${clinic.name},clinic.ilike.${clinic.name}`)
          .order('appointment_date', { ascending: false })
          .order('appointment_time', { ascending: false });
        
        if (bookingsWithNullClinicId && bookingsWithNullClinicId.length > 0) {
          console.log('📋 Found bookings with NULL clinic_id:', bookingsWithNullClinicId.length);
          
          // Merge with existing bookings (avoid duplicates)
          const existingIds = new Set(bookings.map(b => b.id));
          const newBookings = bookingsWithNullClinicId.filter(b => !existingIds.has(b.id));
          bookings = [...bookings, ...newBookings];
          
          // Update these bookings to have the correct clinic_id
          if (newBookings.length > 0) {
            const bookingIdsToUpdate = newBookings.map(b => b.id);
            console.log('🔧 Updating NULL clinic_id bookings:', bookingIdsToUpdate);
            const { error: updateError } = await supabase
              .from('bookings')
              .update({ clinic_id: clinicId })
              .in('id', bookingIdsToUpdate);
            
            if (updateError) {
              console.error('❌ Error updating NULL clinic_id:', updateError);
            } else {
              console.log('✅ Updated NULL clinic_id bookings');
            }
          }
        }
      }
      
      console.log('✅ Total bookings found:', bookings.length);

      // Fetch profiles to get patient names
      const userIds = [...new Set(bookings.map((b: any) => b.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const profileMap = new Map();
      profilesData?.forEach((profile: any) => {
        profileMap.set(profile.user_id, profile);
      });

      // Transform bookings to appointments
      const appointments: Appointment[] = bookings.map((booking: any) => {
        const profile = profileMap.get(booking.user_id);
        
        // Map database status to UI status
        let mappedStatus: 'pending' | 'approved' | 'completed' | 'cancelled';
        const dbStatus = booking.status || 'pending';
        
        console.log('📋 Booking status mapping:', {
          bookingId: booking.id,
          dbStatus: dbStatus,
          rawStatus: booking.status
        });
        
        if (dbStatus === 'confirmed') {
          mappedStatus = 'approved';
        } else if (dbStatus === 'pending') {
          mappedStatus = 'pending';
        } else if (dbStatus === 'cancelled') {
          mappedStatus = 'cancelled';
        } else if (dbStatus === 'rescheduled') {
          // Rescheduled appointments show as pending for clinic admin (waiting for user approval)
          mappedStatus = 'pending';
        } else {
          // Default to pending for unknown statuses (new bookings)
          console.warn('⚠️ Unknown booking status, defaulting to pending:', dbStatus);
          mappedStatus = 'pending';
        }
        
        return {
          id: booking.id,
          user_id: booking.user_id,
          patientName: profile?.full_name || 'Unknown Patient',
          doctorName: booking.doctor_name || 'Unknown Doctor',
          service: booking.specialty || 'General Consultation',
          appointment_date: booking.appointment_date,
          appointment_time: booking.appointment_time,
          status: mappedStatus,
          created_at: booking.created_at,
          doctor_id: booking.doctor_id,
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  const getStatusBadge = (status: Appointment['status']) => {
    const statusConfig = {
      approved: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: Check,
        label: 'Approved',
      },
      cancelled: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: X,
        label: 'Cancelled',
      },
      pending: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        icon: Clock,
        label: 'Pending',
      },
      completed: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: Check,
        label: 'Completed',
      },
    };

    const config = statusConfig[status];
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
        toast.error('Failed to load appointment details');
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
      if (bookingData.doctor_id) {
        const { data: docData } = await supabase
          .from('doctors')
          .select('name, specialty, availability')
          .eq('id', bookingData.doctor_id)
          .maybeSingle();
        doctorData = docData;
      }

      // Build appointment details
      const details: AppointmentDetails = {
        id: appointment.id,
        patient: {
          name: profileData?.full_name || appointment.patientName || 'Unknown Patient',
          gender: profileData?.gender || 'Not specified',
          contact: profileData?.phone || 'Not provided',
          email: profileData?.email || 'Not provided',
        },
        doctor: {
          name: doctorData?.name || bookingData.doctor_name || appointment.doctorName || 'Unknown Doctor',
          specialty: doctorData?.specialty || bookingData.specialty || appointment.service || 'General',
          service: bookingData.specialty || appointment.service || 'General Consultation',
          availability: doctorData?.availability || '9:00 AM - 5:00 PM',
        },
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        status: appointment.status,
      };

      setSelectedAppointmentDetails(details);
    } catch (error) {
      console.error('Error loading appointment details:', error);
      toast.error('Failed to load appointment details');
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

      toast.success('Appointment approved successfully');
      setIsApproveConfirmModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedAppointmentDetails(null);
      
      // Refresh appointments
      if (clinic?.id) {
        fetchAppointments(clinic.id);
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
      toast.error('Failed to approve appointment');
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

      toast.success('Appointment cancelled successfully');
      setIsCancelConfirmModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedAppointmentDetails(null);
      
      // Refresh appointments
      if (clinic?.id) {
        fetchAppointments(clinic.id);
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
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
      toast.error('Please select both date and time');
      return;
    }

    try {
      // Date is already in YYYY-MM-DD format from date input type
      const formattedDate = newAppointmentDate;
      
      // Validate date
      const dateObj = new Date(formattedDate);
      if (isNaN(dateObj.getTime())) {
        toast.error('Invalid date. Please select a valid date');
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

      toast.success('Appointment rescheduled successfully');
      setIsRescheduleModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedAppointmentDetails(null);
      setNewAppointmentDate('');
      setNewAppointmentTime('');
      
      // Refresh appointments
      if (clinic?.id) {
        fetchAppointments(clinic.id);
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
      toast.error(`Failed to reschedule appointment: ${errorMessage}`);
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
      (statusFilter === 'approved' && appointment.status === 'approved') ||
      (statusFilter === 'pending' && appointment.status === 'pending') ||
      (statusFilter === 'completed' && appointment.status === 'completed') ||
      (statusFilter === 'cancelled' && appointment.status === 'cancelled');
    
    const matchesSearch = searchQuery === '' ||
      appointment.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.service.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

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
            {/* Page Header */}
            <div className="mb-6">
              {/* Title and Clinic Info Row */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Appointments</h1>
                
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
                    {clinic?.name || 'Clinic'}
                  </span>
                </div>
              </div>

              {/* Status Filter Tabs and Date Filters Row */}
              <div className="flex items-center justify-between mb-4">
                {/* Status Filter Tabs */}
                <div className="flex gap-2">
                  {(['all', 'pending', 'approved', 'completed', 'cancelled'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        statusFilter === filter
                          ? 'bg-[#00FFA2] text-[#0C2243] font-medium'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
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
                      {filter === 'today' ? 'Today' : 
                       filter === 'tomorrow' ? 'Tomorrow' : 
                       filter === 'this-week' ? 'This week' : 'All time'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search by patient, doctor, or service..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Appointments Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading appointments...</p>
                </div>
              ) : filteredAppointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <th className="text-left py-4 px-4">
                          <input
                            type="checkbox"
                            checked={selectedAppointments.length === filteredAppointments.length && filteredAppointments.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                          />
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Patient Name
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Doctor's Name
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Service
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            Date & Time
                            <ArrowUpDown className="w-4 h-4 text-gray-400" />
                          </div>
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Status
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAppointments.map((appointment) => (
                        <tr
                          key={appointment.id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <input
                              type="checkbox"
                              checked={selectedAppointments.includes(appointment.id)}
                              onChange={() => handleSelectAppointment(appointment.id)}
                              className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                            />
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-900 dark:text-white font-medium">
                            {appointment.patientName}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {appointment.doctorName}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {appointment.service}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)}
                          </td>
                          <td className="py-4 px-4">
                            {getStatusBadge(appointment.status)}
                          </td>
                          <td className="py-4 px-4">
                            <Button
                              size="sm"
                              className="bg-[#0C2243] text-white hover:bg-[#0a1a35] text-xs px-4 py-1.5 font-medium"
                              onClick={() => handleViewDetails(appointment)}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No appointments found</p>
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
                Appointment Details
              </DialogTitle>
            </DialogHeader>

            {loadingDetails ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] mx-auto mb-4"></div>
                <p className="text-gray-500">Loading appointment details...</p>
              </div>
            ) : selectedAppointmentDetails ? (
              <div className="px-6 py-6">
                {/* PATIENT INFORMATION */}
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    PATIENT INFORMATION
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Name</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Gender</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.patient.gender}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Contact</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.patient.contact}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Email</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.patient.email}</p>
                    </div>
                  </div>
                </div>

                {/* DOCTOR'S / TREATMENT INFORMATION */}
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    DOCTOR'S / TREATMENT INFORMATION
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Name</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Specialty</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.specialty}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Service</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.service}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Availability</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.availability}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <Button
                    onClick={handleCancelAppointment}
                    variant="outline"
                    className="border-red-600 text-red-600 bg-white hover:bg-red-50 px-6 py-2.5 flex items-center gap-2 rounded-lg font-medium"
                  >
                    <X className="w-4 h-4 text-red-600" />
                    Cancel Appointment
                  </Button>
                  <Button
                    onClick={handleRescheduleAppointment}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-2.5 flex items-center gap-2 rounded-lg font-medium"
                  >
                    <Clock className="w-4 h-4" />
                    Reschedule
                  </Button>
                  <Button
                    onClick={handleApproveAppointment}
                    className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-white px-6 py-2.5 flex items-center gap-2 rounded-lg font-medium shadow-sm"
                  >
                    <Check className="w-4 h-4 text-white" />
                    Approve Appointment
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Approve Appointment Confirmation Modal */}
        <Dialog open={isApproveConfirmModalOpen} onOpenChange={setIsApproveConfirmModalOpen}>
          <DialogContent className="max-w-md mx-auto bg-white rounded-lg p-0 overflow-hidden shadow-xl border-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200">
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Approve Appointment
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
                      <p className="text-xs text-gray-500 mb-1.5">Patient</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Doctor</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Date & Time</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(selectedAppointmentDetails.appointment_date)} at {formatTime(selectedAppointmentDetails.appointment_time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Service</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.service}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1.5">Status</p>
                      <p className="text-sm font-semibold text-gray-900">Pending Approval</p>
                    </div>
                  </div>
                </div>

                {/* Confirmation Message */}
                <div className="mb-6">
                  <p className="text-sm text-gray-600 text-center leading-relaxed">
                    Are you sure you want to approve this appointment? This will confirm the booking and notify both parties.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => setIsApproveConfirmModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmApprove}
                    className="flex-1 bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm"
                  >
                    Approve Appointment
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
                Cancel Appointment
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
                      <p className="text-xs text-gray-500 mb-1.5">Patient</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Doctor</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Date & Time</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(selectedAppointmentDetails.appointment_date)} at {formatTime(selectedAppointmentDetails.appointment_time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Service</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedAppointmentDetails.doctor.service}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1.5">Status</p>
                      <p className="text-sm font-semibold text-gray-900">Pending Approval</p>
                    </div>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="mb-6">
                  <p className="text-sm text-red-600 text-center leading-relaxed">
                    Once cancelled, this appointment will be marked as "Cancelled".
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => setIsCancelConfirmModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium"
                  >
                    Discard
                  </Button>
                  <Button
                    onClick={handleConfirmCancel}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium"
                  >
                    Confirm Cancellation
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
                Confirmation
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
                    Reschedule Appointment?
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Are you sure you want to reschedule this appointment? Previous: {formatDateForReschedule(selectedAppointmentDetails.appointment_date)} - {formatTime(selectedAppointmentDetails.appointment_time)} with {selectedAppointmentDetails.doctor.name}
                  </p>
                </div>

                {/* Date and Time Inputs */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">New date</label>
                    <div className="relative">
                      <Calendar 
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer z-10" 
                        onClick={() => {
                          const dateInput = document.getElementById('new-appointment-date') as HTMLInputElement;
                          dateInput?.showPicker?.() || dateInput?.click();
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
                    <label className="text-xs text-gray-500 mb-1.5 block">New time</label>
                    <div className="relative">
                      <Clock 
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer z-10" 
                        onClick={() => {
                          const timeInput = document.getElementById('new-appointment-time') as HTMLInputElement;
                          timeInput?.showPicker?.() || timeInput?.click();
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
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmReschedule}
                    className="flex-1 bg-[#0C2243] hover:bg-[#0a1a35] text-white px-6 py-2.5 rounded-lg font-medium"
                  >
                    Confirm Reschedule
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

export default ClinicAdminAppointments;
