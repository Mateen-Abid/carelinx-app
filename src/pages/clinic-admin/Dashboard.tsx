import React, { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClinicAdminSidebar from '@/components/clinic-admin/ClinicAdminSidebar';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Filter, X, ArrowUp, Check, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Clinic {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Appointment {
  id: string;
  patient_name: string;
  doctor_name: string;
  specialty: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  user_id?: string;
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

const ClinicAdminDashboard = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkingClinic, setCheckingClinic] = useState(true);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Statistics
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingApprovals: 0,
    newPatients: 0,
    completedAppointments: 0,
    todayAppointmentsChange: '0',
    pendingChange: '0',
  });

  // Appointments
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Appointment[]>([]);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'today' | 'tomorrow' | 'this-week'>('today');
  const [selectedPendingFilter, setSelectedPendingFilter] = useState<'today' | 'tomorrow' | 'this-week'>('today');
  
  // Appointment Details Modal
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
        // Check if clinic exists for this clinic admin
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

        // If no clinic exists, redirect to onboarding
        if (!clinicData) {
          console.log('No clinic found, redirecting to onboarding');
          navigate('/clinic-admin/onboarding', { replace: true });
          return;
        }

        // If clinic exists but status is pending (onboarding incomplete), redirect to onboarding
        if (clinicData.status === 'pending') {
          console.log('Clinic onboarding incomplete, redirecting to onboarding');
          navigate('/clinic-admin/onboarding', { replace: true });
          return;
        }

        // Clinic exists and is active
        setClinic(clinicData);
        setCheckingClinic(false);
      } catch (error) {
        console.error('Error in checkClinicExists:', error);
        setCheckingClinic(false);
      }
    };

    checkClinicExists();
  }, [user, navigate]);

  // Fetch dashboard data when clinic is loaded or filter changes
  useEffect(() => {
    if (clinic?.id) {
      fetchDashboardData(clinic.id);
    }
  }, [clinic?.id, selectedTimeFilter, selectedPendingFilter]);

  // Real-time subscription for bookings
  useEffect(() => {
    if (!clinic?.id) return;

    console.log('🔔 Setting up real-time subscription for clinic:', clinic.id);

    const bookingsChannel = supabase
      .channel(`clinic-dashboard-bookings-${clinic.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `clinic_id=eq.${clinic.id}`,
        },
        (payload) => {
          console.log('📊 Booking change detected:', payload.eventType);
          // Refresh dashboard data when bookings change
          fetchDashboardData(clinic.id);
        }
      )
      .subscribe();

    // Also listen for bookings with clinic name (backward compatibility)
    if (clinic.name) {
      const bookingsByNameChannel = supabase
        .channel(`clinic-dashboard-bookings-name-${clinic.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `clinic=eq.${clinic.name}`,
          },
          (payload) => {
            console.log('📊 Booking change detected (by name):', payload.eventType);
            fetchDashboardData(clinic.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(bookingsChannel);
        supabase.removeChannel(bookingsByNameChannel);
      };
    }

    return () => {
      supabase.removeChannel(bookingsChannel);
    };
  }, [clinic?.id, clinic?.name]);

  const fetchDashboardData = async (clinicId: string) => {
    try {
      setLoading(true);
      console.log('🔍 Fetching dashboard data for clinic:', clinicId);

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - today.getDay()); // Start of week (Sunday)

      // Fetch bookings for this clinic
      // Note: We'll fetch bookings and profiles separately to avoid join issues
      // First try by clinic_id, then by clinic name for backward compatibility
      let bookingsData: any[] = [];
      let bookingsError: any = null;

      // Try fetching by clinic_id first (new system)
      const { data: bookingsById, error: errorById } = await supabase
        .from('bookings')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (!errorById && bookingsById) {
        bookingsData = bookingsById;
      } else {
        // Fallback: try by clinic name (backward compatibility)
        if (clinic?.name) {
          const { data: bookingsByName, error: errorByName } = await supabase
            .from('bookings')
            .select('*')
            .eq('clinic', clinic.name)
            .order('appointment_date', { ascending: true })
            .order('appointment_time', { ascending: true });
          
          if (!errorByName && bookingsByName) {
            bookingsData = bookingsByName;
          } else {
            bookingsError = errorByName;
          }
        } else {
          bookingsError = errorById;
        }
      }

      if (bookingsError) {
        console.error('❌ Error fetching bookings:', bookingsError);
        setLoading(false);
        return;
      }

      // Fetch profiles separately if we have bookings
      let bookingsWithProfiles: any[] = [];
      if (bookingsData && bookingsData.length > 0) {
        const userIds = [...new Set(bookingsData.map((b: any) => b.user_id))];
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        // Create profile map
        const profileMap = new Map();
        profilesData?.forEach((profile: any) => {
          profileMap.set(profile.user_id, profile);
        });

        // Attach profiles to bookings
        bookingsWithProfiles = bookingsData.map((booking: any) => ({
          ...booking,
          profiles: profileMap.get(booking.user_id),
        }));
      }

      console.log('✅ Bookings fetched:', bookingsWithProfiles?.length || 0);

      // Calculate statistics
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      // Get yesterday's date for comparison
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Today's appointments (all statuses for today)
      const todayBookings = bookingsWithProfiles?.filter((b: any) => b.appointment_date === todayStr) || [];
      
      // Pending approvals (all pending status bookings)
      const pendingBookings = bookingsWithProfiles?.filter((b: any) => b.status === 'pending') || [];
      
      // Completed appointments (confirmed/cancelled with past dates, or status 'completed')
      const completedBookings = bookingsWithProfiles?.filter((b: any) => {
        const bookingDate = new Date(b.appointment_date);
        bookingDate.setHours(0, 0, 0, 0);
        return (
          b.status === 'completed' || 
          (b.status === 'confirmed' && bookingDate < today) ||
          (b.status === 'cancelled' && bookingDate < today)
        );
      }) || [];

      // New patients - patients who have bookings in the last 7 days (first-time bookings)
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
      
      // Get all unique patient IDs
      const allPatientIds = new Set(bookingsWithProfiles?.map((b: any) => b.user_id) || []);
      
      // Get patient IDs with bookings in the last 7 days
      const recentBookings = bookingsWithProfiles?.filter((b: any) => {
        const bookingDate = new Date(b.appointment_date);
        return bookingDate >= sevenDaysAgo;
      }) || [];
      
      // Find patients who had their first booking in the last 7 days
      const patientFirstBookingMap = new Map<string, Date>();
      bookingsWithProfiles?.forEach((b: any) => {
        const bookingDate = new Date(b.appointment_date);
        const existing = patientFirstBookingMap.get(b.user_id);
        if (!existing || bookingDate < existing) {
          patientFirstBookingMap.set(b.user_id, bookingDate);
        }
      });
      
      const newPatients = Array.from(patientFirstBookingMap.entries())
        .filter(([_, firstBookingDate]) => firstBookingDate >= sevenDaysAgo).length;

      // Calculate yesterday's stats for comparison
      const yesterdayBookings = bookingsWithProfiles?.filter((b: any) => b.appointment_date === yesterdayStr) || [];
      const yesterdayPending = bookingsWithProfiles?.filter((b: any) => 
        b.status === 'pending' && b.appointment_date === yesterdayStr
      ) || [];
      
      // Calculate percentage changes
      const todayAppointmentsChange = yesterdayBookings.length > 0 
        ? ((todayBookings.length - yesterdayBookings.length) / yesterdayBookings.length * 100).toFixed(0)
        : todayBookings.length > 0 ? '100' : '0';
      
      const pendingChange = yesterdayPending.length > 0
        ? (pendingBookings.length - yesterdayPending.length).toString()
        : pendingBookings.length > 0 ? pendingBookings.length.toString() : '0';

      setStats({
        todayAppointments: todayBookings.length,
        pendingApprovals: pendingBookings.length,
        newPatients: newPatients,
        completedAppointments: completedBookings.length,
        todayAppointmentsChange: todayAppointmentsChange,
        pendingChange: pendingChange,
      });

      // Format appointments
      const formatAppointments = (bookings: any[]): Appointment[] => {
        return bookings.map((booking: any) => ({
          id: booking.id,
          patient_name: booking.profiles?.full_name || 'Unknown Patient',
          doctor_name: booking.doctor_name,
          specialty: booking.specialty,
          appointment_date: booking.appointment_date,
          appointment_time: booking.appointment_time,
          status: booking.status as 'pending' | 'confirmed' | 'cancelled',
        }));
      };

      // Filter upcoming appointments based on selected time filter
      let filteredUpcomingBookings = bookingsWithProfiles || [];
      
      // First filter by date range based on selected filter
      if (selectedTimeFilter === 'today') {
        filteredUpcomingBookings = bookingsWithProfiles?.filter((b: any) => {
          const bookingDate = new Date(b.appointment_date);
          bookingDate.setHours(0, 0, 0, 0);
          return bookingDate.getTime() === today.getTime();
        }) || [];
      } else if (selectedTimeFilter === 'tomorrow') {
        filteredUpcomingBookings = bookingsWithProfiles?.filter((b: any) => {
          const bookingDate = new Date(b.appointment_date);
          bookingDate.setHours(0, 0, 0, 0);
          return bookingDate.getTime() === tomorrow.getTime();
        }) || [];
      } else if (selectedTimeFilter === 'this-week') {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        filteredUpcomingBookings = bookingsWithProfiles?.filter((b: any) => {
          const bookingDate = new Date(b.appointment_date);
          bookingDate.setHours(0, 0, 0, 0);
          return bookingDate >= weekStart && bookingDate < weekEnd;
        }) || [];
      }

      // Then filter for confirmed/rescheduled appointments (today or future)
      const upcoming = filteredUpcomingBookings
        .filter((b: any) => {
          const bookingDate = new Date(b.appointment_date);
          bookingDate.setHours(0, 0, 0, 0);
          const todayDate = new Date(today);
          todayDate.setHours(0, 0, 0, 0);
          // Include confirmed or rescheduled appointments that are today or in the future
          return (b.status === 'confirmed' || b.status === 'rescheduled') && bookingDate.getTime() >= todayDate.getTime();
        })
        .sort((a: any, b: any) => {
          // Sort by date first, then by time
          const dateCompare = new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
          if (dateCompare !== 0) return dateCompare;
          return a.appointment_time.localeCompare(b.appointment_time);
        })
        .slice(0, 10); // Limit to 10
      setUpcomingAppointments(formatAppointments(upcoming));

      // Filter pending requests based on selected pending filter
      let filteredPendingBookings = bookingsWithProfiles || [];
      if (selectedPendingFilter === 'today') {
        filteredPendingBookings = bookingsWithProfiles?.filter((b: any) => b.appointment_date === todayStr) || [];
      } else if (selectedPendingFilter === 'tomorrow') {
        filteredPendingBookings = bookingsWithProfiles?.filter((b: any) => b.appointment_date === tomorrowStr) || [];
      } else if (selectedPendingFilter === 'this-week') {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        filteredPendingBookings = bookingsWithProfiles?.filter((b: any) => {
          const bookingDate = new Date(b.appointment_date);
          return bookingDate >= weekStart && bookingDate < weekEnd;
        }) || [];
      }

      // Pending requests (pending status)
      const pending = filteredPendingBookings
        .filter((b: any) => b.status === 'pending')
        .sort((a: any, b: any) => {
          // Sort by date first, then by time
          const dateCompare = new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
          if (dateCompare !== 0) return dateCompare;
          return a.appointment_time.localeCompare(b.appointment_time);
        })
        .slice(0, 10); // Limit to 10
      setPendingRequests(formatAppointments(pending));

      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    // Convert 24-hour to 12-hour format
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
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
        .eq('user_id', appointment.user_id || bookingData.user_id)
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
          name: profileData?.full_name || appointment.patient_name || 'Unknown Patient',
          gender: profileData?.gender || 'Not specified',
          contact: profileData?.phone || 'Not provided',
          email: profileData?.email || 'Not provided',
        },
        doctor: {
          name: doctorData?.name || bookingData.doctor_name || appointment.doctor_name || 'Unknown Doctor',
          specialty: doctorData?.specialty || bookingData.specialty || appointment.specialty || 'General',
          service: bookingData.specialty || appointment.specialty || 'General Consultation',
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
      
      // Refresh dashboard data
      if (clinic?.id) {
        fetchDashboardData(clinic.id);
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
      toast.error('Failed to approve appointment');
    }
  };

  const handleCancelAppointment = () => {
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
      
      // Refresh dashboard data
      if (clinic?.id) {
        fetchDashboardData(clinic.id);
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const handleRescheduleAppointment = () => {
    if (selectedAppointmentDetails) {
      const dateParts = selectedAppointmentDetails.appointment_date.split('-');
      setNewAppointmentDate(`${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`);
      setNewAppointmentTime(selectedAppointmentDetails.appointment_time);
    }
    setIsRescheduleModalOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!selectedAppointmentDetails || !newAppointmentDate || !newAppointmentTime) {
      toast.error('Please select a new date and time');
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          appointment_date: newAppointmentDate,
          appointment_time: newAppointmentTime,
          status: 'rescheduled',
        })
        .eq('id', selectedAppointmentDetails.id);

      if (error) throw error;

      toast.success('Appointment rescheduled successfully');
      setIsRescheduleModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedAppointmentDetails(null);
      setNewAppointmentDate('');
      setNewAppointmentTime('');
      
      // Refresh dashboard data
      if (clinic?.id) {
        fetchDashboardData(clinic.id);
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Failed to reschedule appointment');
    }
  };

  const formatDateForReschedule = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
            {/* Page Header */}
            <div className="flex items-start justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              
              <div className="flex items-center gap-3">
                {/* Clinic Name and Logo */}
                {clinic?.logo_url && (
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-[#00FFA2] flex items-center justify-center flex-shrink-0">
                    <img
                      src={clinic.logo_url}
                      alt={clinic.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initial if image fails to load
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
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Today's Appointments */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Today's Appointments
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.todayAppointments}
                </p>
                <div className="flex items-center gap-1 text-sm text-[#00FFA2]">
                  <ArrowUp className="w-3 h-3" />
                  <span>{stats.todayAppointmentsChange}% since yesterday</span>
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Pending Approvals
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.pendingApprovals}
                </p>
                <div className="flex items-center gap-1 text-sm text-[#00FFA2]">
                  <ArrowUp className="w-3 h-3" />
                  <span>{stats.pendingChange} than last since yesterday</span>
                </div>
              </div>

              {/* New Patients */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  New Patients
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.newPatients}
                </p>
                <div className="flex items-center gap-1 text-sm text-[#00FFA2]">
                  <ArrowUp className="w-3 h-3" />
                  <span>Last 7 days</span>
                </div>
              </div>

              {/* Completed Appointments */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Completed Appointments
                </h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.completedAppointments}
                </p>
                <div className="flex items-center gap-1 text-sm text-[#00FFA2]">
                  <ArrowUp className="w-3 h-3" />
                  <span>All time</span>
                </div>
              </div>
            </div>

            {/* Upcoming Appointments Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upcoming Appointments
                </h2>
                <div className="flex items-center gap-2">
                  {(['today', 'tomorrow', 'this-week'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSelectedTimeFilter(filter)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedTimeFilter === filter
                          ? 'bg-[#00FFA2] text-[#0C2243] font-medium'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {filter === 'today' ? 'Today' : filter === 'tomorrow' ? 'Tomorrow' : 'This Week'}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading...</p>
                </div>
              ) : upcomingAppointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Patient Name
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Doctor's / Treatment
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Date & Time
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingAppointments.map((appointment) => (
                        <tr
                          key={appointment.id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="py-4 px-4 text-sm text-gray-900 dark:text-white font-medium">
                            {appointment.patient_name}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {appointment.doctor_name} / {appointment.specialty}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    <X className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming appointments</p>
                </div>
              )}
            </div>

            {/* Pending Request Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Pending Request
                </h2>
                <div className="flex items-center gap-2">
                  {(['today', 'tomorrow', 'this-week'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSelectedPendingFilter(filter)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedPendingFilter === filter
                          ? 'bg-[#00FFA2] text-[#0C2243] font-medium'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {filter === 'today' ? 'Today' : filter === 'tomorrow' ? 'Tomorrow' : 'This Week'}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading...</p>
                </div>
              ) : pendingRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Patient Name
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Specialty
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Date & Time
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map((request) => (
                        <tr
                          key={request.id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="py-4 px-4 text-sm text-gray-900 dark:text-white font-medium">
                            {request.patient_name}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {request.specialty}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(request.appointment_date)} at {formatTime(request.appointment_time)}
                          </td>
                          <td className="py-4 px-4">
                            <Button
                              size="sm"
                              className="bg-[#0C2243] text-white hover:bg-[#0a1a35] text-xs px-4 py-1.5 font-medium"
                              onClick={() => handleViewDetails(request)}
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
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    <X className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No pending request</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Appointment Details Modal */}
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg p-0 overflow-hidden shadow-xl border-0">
            <DialogHeader className="px-6 pt-6 pb-5 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                Appointment Details
              </DialogTitle>
            </DialogHeader>

            {loadingDetails ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading appointment details...</p>
              </div>
            ) : selectedAppointmentDetails ? (
              <div className="px-6 py-6">
                {/* PATIENT INFORMATION */}
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    PATIENT INFORMATION
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Name</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Gender</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.patient.gender}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Contact</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.patient.contact}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Email</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.patient.email}</p>
                    </div>
                  </div>
                </div>

                {/* DOCTOR'S / TREATMENT INFORMATION */}
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    DOCTOR'S / TREATMENT INFORMATION
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Name</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Specialty</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.specialty}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Service</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.service}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Availability</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.availability}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={handleCancelAppointment}
                    variant="outline"
                    className="border-red-600 text-red-600 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 px-6 py-2.5 flex items-center gap-2 rounded-lg font-medium"
                  >
                    <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                    Cancel Appointment
                  </Button>
                  <Button
                    onClick={handleRescheduleAppointment}
                    className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-6 py-2.5 flex items-center gap-2 rounded-lg font-medium"
                  >
                    <Clock className="w-4 h-4" />
                    Reschedule
                  </Button>
                  <Button
                    onClick={handleApproveAppointment}
                    className="bg-[#00FFA2] hover:bg-[#00e692] text-white px-6 py-2.5 flex items-center gap-2 rounded-lg font-medium"
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
          <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg p-0 overflow-hidden shadow-xl border-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                Approve Appointment
              </DialogTitle>
            </DialogHeader>

            {selectedAppointmentDetails ? (
              <div className="px-6 py-6">
                {/* Large Green Checkmark Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                    <div className="w-16 h-16 bg-[#00FFA2] rounded-full flex items-center justify-center">
                      <Check className="w-10 h-10 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>

                {/* Appointment Details */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Patient</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Doctor</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Date & Time</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatDate(selectedAppointmentDetails.appointment_date)} at {formatTime(selectedAppointmentDetails.appointment_time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Service</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.service}</p>
                    </div>
                  </div>
                </div>

                {/* Confirmation Message */}
                <div className="mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center leading-relaxed">
                    Are you sure you want to approve this appointment? This will confirm the booking and notify both parties.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => setIsApproveConfirmModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2.5 rounded-lg font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmApprove}
                    className="flex-1 bg-[#00FFA2] hover:bg-[#00e692] text-white px-6 py-2.5 rounded-lg font-medium"
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
          <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg p-0 overflow-hidden shadow-xl border-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                Cancel Appointment
              </DialogTitle>
            </DialogHeader>

            {selectedAppointmentDetails ? (
              <div className="px-6 py-6">
                {/* Large Red Cancel Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                      <X className="w-10 h-10 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>

                {/* Appointment Details */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Patient</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Doctor</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Date & Time</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatDate(selectedAppointmentDetails.appointment_date)} at {formatTime(selectedAppointmentDetails.appointment_time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Service</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.service}</p>
                    </div>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="mb-6">
                  <p className="text-sm text-red-600 dark:text-red-400 text-center leading-relaxed">
                    Once cancelled, this appointment will be marked as "Cancelled".
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => setIsCancelConfirmModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2.5 rounded-lg font-medium"
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
          <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg p-0 overflow-hidden shadow-xl border-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
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
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    Reschedule Appointment?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    Are you sure you want to reschedule this appointment? Previous: {formatDateForReschedule(selectedAppointmentDetails.appointment_date)} - {formatTime(selectedAppointmentDetails.appointment_time)} with {selectedAppointmentDetails.doctor.name}
                  </p>
                </div>

                {/* Date and Time Inputs */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">New date</label>
                    <div className="relative">
                      <Calendar 
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 cursor-pointer z-10" 
                        onClick={() => {
                          const dateInput = document.getElementById('dashboard-new-appointment-date') as HTMLInputElement;
                          dateInput?.showPicker?.() || dateInput?.click();
                        }}
                      />
                      <Input
                        id="dashboard-new-appointment-date"
                        type="date"
                        value={newAppointmentDate}
                        onChange={(e) => setNewAppointmentDate(e.target.value)}
                        className="h-10 border-gray-300 dark:border-gray-600 focus:border-[#0C2243] focus:ring-[#0C2243] pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">New time</label>
                    <div className="relative">
                      <Clock 
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 cursor-pointer z-10" 
                        onClick={() => {
                          const timeInput = document.getElementById('dashboard-new-appointment-time') as HTMLInputElement;
                          timeInput?.showPicker?.() || timeInput?.click();
                        }}
                      />
                      <Input
                        id="dashboard-new-appointment-time"
                        type="time"
                        value={newAppointmentTime}
                        onChange={(e) => setNewAppointmentTime(e.target.value)}
                        className="h-10 border-gray-300 dark:border-gray-600 focus:border-[#0C2243] focus:ring-[#0C2243] pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => {
                      setIsRescheduleModalOpen(false);
                      setNewAppointmentDate('');
                      setNewAppointmentTime('');
                    }}
                    variant="outline"
                    className="flex-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2.5 rounded-lg font-medium"
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

export default ClinicAdminDashboard;
