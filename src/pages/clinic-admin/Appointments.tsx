import React, { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClinicAdminSidebar from '@/components/clinic-admin/ClinicAdminSidebar';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Check, Clock, X, ArrowUpDown, RotateCcw, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTableSort } from '@/hooks/useTableSort';
import { TableSortHeader } from '@/components/ui/TableSortHeader';
import BookAppointmentModal from '@/components/clinic-admin/BookAppointmentModal';
import { Switch } from '@/components/ui/switch';
import { resolveBookedServiceName } from '@/utils/bookingService';

interface Appointment {
  id: string;
  user_id: string | null;
  patientName: string;
  doctorName: string;
  service: string;
  serviceName?: string | null;
  bookingType?: 'doctor' | 'treatment';
  treatmentName?: string | null;
  treatmentId?: string | null;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'approved' | 'cancelled' | 'completed';
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
  auto_booking_enabled?: boolean;
}

const ClinicAdminAppointments = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [isBookAppointmentModalOpen, setIsBookAppointmentModalOpen] = useState(false);
  const [newAppointmentDate, setNewAppointmentDate] = useState<string>('');
  const [newAppointmentTime, setNewAppointmentTime] = useState<string>('');
  const [autoBookingEnabled, setAutoBookingEnabled] = useState(false);
  const [updatingAutoBooking, setUpdatingAutoBooking] = useState(false);

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
        setAutoBookingEnabled(clinicData.auto_booking_enabled === true);
        setCheckingClinic(false);
      } catch (error) {
        console.error('Error in checkClinicExists:', error);
        setCheckingClinic(false);
      }
    };

    checkClinicExists();
  }, [user, navigate]);

  const handleAutoBookingChange = async (enabled: boolean) => {
    const previousValue = autoBookingEnabled;
    setAutoBookingEnabled(enabled);
    setUpdatingAutoBooking(true);

    try {
      const result = await api.clinicAdmin.updateAutoBooking(enabled);
      const savedValue = result.autoBookingEnabled === true;
      setAutoBookingEnabled(savedValue);
      setClinic((currentClinic) => currentClinic
        ? { ...currentClinic, auto_booking_enabled: savedValue }
        : currentClinic);
      toast.success(savedValue
        ? t('Auto booking enabled')
        : t('Auto booking disabled'));
    } catch (error: unknown) {
      setAutoBookingEnabled(previousValue);
      toast.error(error instanceof Error ? error.message : t('Failed to update auto booking'));
    } finally {
      setUpdatingAutoBooking(false);
    }
  };

  useEffect(() => {
    if (clinic?.id) {
      fetchAppointments(clinic.id);
    }
  }, [clinic?.id, dateFilter]);

  const fetchAppointments = async (clinicId: string) => {
    try {
      setLoading(true);
      console.log('🔍 Fetching appointments for clinic ID:', clinicId);

      // Fetch bookings via backend
      // Only pass timeFilter if it's 'today' or 'tomorrow' (backend only supports these)
      const timeFilterParam = (dateFilter === 'today' || dateFilter === 'tomorrow') ? dateFilter : undefined;
      const { bookings } = await api.clinicAdmin.getBookings(timeFilterParam);
      
      console.log('📡 Fetched bookings with timeFilter:', timeFilterParam);
      console.log('📊 Bookings returned:', bookings?.length || 0);

      // Fetch profiles separately for each unique user_id (since backend attachment isn't working reliably)
      const uniqueUserIds = [...new Set((bookings || []).map((b: any) => b.user_id).filter((id: any) => id !== null && id !== undefined))];
      console.log('👥 Unique user IDs to fetch profiles for:', uniqueUserIds.length);
      
      const profileMap = new Map();
      if (uniqueUserIds.length > 0) {
        // Fetch profiles in parallel for all unique user IDs
        const profilePromises = uniqueUserIds.map(async (userId: string) => {
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
        console.log('✅ Profiles fetched and mapped:', profileMap.size, 'out of', uniqueUserIds.length);
      }

      // Attach profiles to bookings
      const bookingsWithProfiles = (bookings || []).map((booking: any) => {
        const profile = booking.user_id ? profileMap.get(booking.user_id) || booking.profile || null : null;
        return {
          ...booking,
          profile: profile,
        };
      });
      
      console.log('📊 Bookings with profiles after frontend fetch:', bookingsWithProfiles.filter((b: any) => b.profile).length);

      // Helper function to format date in YYYY-MM-DD format using local timezone
      const formatDateLocal = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Apply date filter locally if needed (backend already handles timeFilter, but we can filter further)
      let filteredBookings = bookingsWithProfiles || [];
      if (dateFilter === 'this-week') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekStartStr = formatDateLocal(weekStart);
        const weekEndStr = formatDateLocal(weekEnd);
        
        filteredBookings = filteredBookings.filter((b: any) => {
          return b.appointment_date >= weekStartStr && b.appointment_date < weekEndStr;
        });
      }

      // Debug: Check profiles in bookings
      console.log('📊 Total filtered bookings:', filteredBookings.length);
      console.log('📊 Bookings with profiles:', filteredBookings.filter((b: any) => b.profile).length);
      console.log('📊 Bookings without profiles:', filteredBookings.filter((b: any) => !b.profile).length);
      if (filteredBookings.length > 0) {
        const sampleBooking = filteredBookings[0];
        console.log('📋 Sample booking:', {
          id: sampleBooking.id,
          userId: sampleBooking.user_id,
          hasProfile: !!sampleBooking.profile,
          profileData: sampleBooking.profile ? {
            user_id: sampleBooking.profile.user_id,
            full_name: sampleBooking.profile.full_name,
            email: sampleBooking.profile.email
          } : null
        });
      }
      
      // Transform bookings to appointments
      const appointments: Appointment[] = filteredBookings.map((booking: any) => {
        const profile = booking.profile;
        
        // Debug logging for patient name
        if (!profile) {
          console.log('⚠️ No profile attached for booking:', {
            bookingId: booking.id,
            userId: booking.user_id,
            clinic: booking.clinic,
            bookingKeys: Object.keys(booking)
          });
        } else {
          console.log('✅ Profile found for booking:', {
            bookingId: booking.id,
            userId: booking.user_id,
            profileKeys: Object.keys(profile),
            full_name: profile.full_name,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            profileStringified: JSON.stringify(profile)
          });
        }
        
        // Map database status to UI status
        let mappedStatus: 'pending' | 'approved' | 'completed' | 'cancelled';
        const dbStatus = booking.status || 'pending';
        
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
        
        // Get patient name with better fallback - check all possible fields
        let patientName = booking.patient_name || t('Unknown Patient');
        if (profile) {
          patientName = profile.full_name || profile.name || profile.email || t('Unknown Patient');
        } else if (booking.user_id) {
          // If profile is missing but we have user_id, try to get name from booking data
          // This shouldn't happen if backend is working correctly, but as a fallback
          console.warn('⚠️ Profile missing for booking, user_id:', booking.user_id);
        }
        
        // Log the final patient name for debugging
        if (patientName === t('Unknown Patient') && booking.user_id) {
          console.log('⚠️ Using "Unknown Patient" for booking:', {
            bookingId: booking.id,
            userId: booking.user_id,
            hasProfile: !!profile,
            profileKeys: profile ? Object.keys(profile) : []
          });
        }
        
        const appointmentLabel =
          booking.booking_type === 'treatment' && booking.treatment_name
            ? booking.treatment_name
            : booking.doctor_name || t('Unknown Doctor');

        return {
          id: booking.id,
          user_id: booking.user_id,
          patientName: patientName,
          doctorName: appointmentLabel,
          service: booking.specialty || t('General Consultation'),
          serviceName: resolveBookedServiceName({
            serviceName: booking.service_name,
            bookingType: booking.booking_type,
            treatmentName: booking.treatment_name,
          }) || null,
          bookingType: (booking.booking_type || 'doctor') as 'doctor' | 'treatment',
          treatmentName: booking.treatment_name || null,
          treatmentId: booking.treatment_id || null,
          appointment_date: booking.appointment_date,
          appointment_time: booking.appointment_time,
          status: mappedStatus,
          created_at: booking.created_at,
          doctor_id: booking.doctor_id,
        };
      });
      
      console.log('📊 Appointments created:', appointments.length);
      console.log('📊 Appointments with patient names:', appointments.filter(a => a.patientName !== 'Unknown Patient').length);
      console.log('📊 Appointments with "Unknown Patient":', appointments.filter(a => a.patientName === 'Unknown Patient').length);

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

      // Fetch full appointment details via backend (use same filter as main list)
      const { bookings: allBookings } = await api.clinicAdmin.getBookings(dateFilter === 'today' ? 'today' : dateFilter === 'tomorrow' ? 'tomorrow' : undefined);
      const bookingData = allBookings.find((b: any) => b.id === appointment.id);

      console.log('🔍 Looking for booking:', appointment.id);
      console.log('📊 Total bookings fetched:', allBookings?.length || 0);
      console.log('📋 Booking data found:', bookingData ? 'Yes' : 'No');

      if (!bookingData) {
        console.error('❌ Booking not found for ID:', appointment.id);
        toast.error(t('Failed to load appointment details'));
        setIsDetailsModalOpen(false);
        return;
      }

      // Patient profile is already attached from backend
      const profileData = bookingData.profile;
      
      console.log('👤 Profile data:', profileData ? {
        user_id: profileData.user_id,
        full_name: profileData.full_name,
        email: profileData.email,
        phone: profileData.phone,
        gender: profileData.gender,
        sex: profileData.sex
      } : 'No profile attached');
      
      console.log('📋 Booking user_id:', bookingData.user_id);

      // Fetch doctor details if doctor_id exists
      let doctorData = null;
      if (bookingData.doctor_id && clinic?.id) {
        const { doctors } = await api.doctors.getDoctors(clinic.id);
        doctorData = doctors.find((d: any) => d.id === bookingData.doctor_id);
      }

      let treatmentData: any = null;
      if (bookingData.booking_type === 'treatment' && bookingData.treatment_id) {
        try {
          const { treatments } = await api.services.getBookableTreatments({ id: bookingData.treatment_id });
          treatmentData = treatments?.[0] || null;
        } catch (error) {
          console.error('Error fetching treatment details:', error);
        }
      }

      // Build appointment details
      // Handle gender with fallback to sex field
      const genderValue = profileData?.gender || profileData?.sex;
      let patientGender = t('Not specified');
      if (genderValue) {
        const genderLower = String(genderValue).toLowerCase();
        if (genderLower === 'male' || genderLower === 'm') {
          patientGender = t('Male');
        } else if (genderLower === 'female' || genderLower === 'f') {
          patientGender = t('Female');
        } else {
          patientGender = t('Other');
        }
      }

      // If profile is missing, try to fetch it directly
      let finalProfileData = profileData;
      if (!profileData && bookingData.user_id) {
        console.log('⚠️ Profile not attached, trying to fetch directly for user_id:', bookingData.user_id);
        try {
          const { profile: directProfile } = await api.clinicAdmin.getPatientProfile(bookingData.user_id);
          if (directProfile) {
            finalProfileData = directProfile;
            console.log('✅ Fetched profile directly:', directProfile);
          }
        } catch (error) {
          console.error('❌ Error fetching profile directly:', error);
        }
      }

      // Re-calculate gender with the final profile data
      const finalGenderValue = finalProfileData?.gender || finalProfileData?.sex;
      let finalPatientGender = t('Not specified');
      if (finalGenderValue) {
        const genderLower = String(finalGenderValue).toLowerCase();
        if (genderLower === 'male' || genderLower === 'm') {
          finalPatientGender = t('Male');
        } else if (genderLower === 'female' || genderLower === 'f') {
          finalPatientGender = t('Female');
        } else {
          finalPatientGender = t('Other');
        }
      }

      const isTreatmentBooking = bookingData.booking_type === 'treatment';
      const resolvedSpecialty =
        treatmentData?.specialty || doctorData?.specialty || bookingData.specialty || appointment.service || t('General');
      const resolvedService =
        resolveBookedServiceName({
          serviceName: bookingData.service_name,
          bookingType: bookingData.booking_type,
          treatmentName: bookingData.treatment_name || treatmentData?.name,
          treatmentService: treatmentData?.service,
          doctorServices: doctorData?.services,
        }) || t('N/A');

      const details: AppointmentDetails = {
        id: appointment.id,
        patient: {
          name: finalProfileData?.full_name || bookingData.patient_name || appointment.patientName || t('Unknown Patient'),
          gender: finalProfileData ? finalPatientGender : bookingData.patient_gender || t('Not specified'),
          contact:
            finalProfileData?.phone ||
            bookingData.patient_phone ||
            finalProfileData?.email ||
            bookingData.patient_email ||
            t('Not provided'),
          email: finalProfileData?.email || bookingData.patient_email || t('Not provided'),
        },
        doctor: {
          name:
            isTreatmentBooking && bookingData.treatment_name
              ? bookingData.treatment_name
              : doctorData?.name || bookingData.doctor_name || appointment.doctorName || t('Unknown Doctor'),
          specialty: resolvedSpecialty,
          service: resolvedService,
          availability: treatmentData?.availability || doctorData?.availability || t('9:00 AM - 5:00 PM'),
        },
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        status: appointment.status,
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
      await api.bookings.updateBooking(selectedAppointmentDetails.id, {
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      });

      toast.success(t('Appointment approved successfully'));
      setIsApproveConfirmModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedAppointmentDetails(null);
      
      // Refresh appointments
      if (clinic?.id) {
        fetchAppointments(clinic.id);
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
      await api.bookings.updateBooking(selectedAppointmentDetails.id, {
        status: 'cancelled'
      });

      toast.success(t('Appointment cancelled successfully'));
      setIsCancelConfirmModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedAppointmentDetails(null);
      
      // Refresh appointments
      if (clinic?.id) {
        fetchAppointments(clinic.id);
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

      // Update appointment via backend - set status to 'rescheduled' so public user knows they need to approve
      await api.bookings.updateBooking(selectedAppointmentDetails.id, {
        appointment_date: formattedDate,
        appointment_time: newAppointmentTime,
        status: 'rescheduled', // Set status to rescheduled so public user sees it in pending
        updated_at: new Date().toISOString()
      });

      toast.success(t('Appointment rescheduled successfully'));
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
      const errorMessage = error?.message || t('Failed to reschedule appointment');
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
  const filteredAppointmentsData = useMemo(() => {
    return appointmentsData.filter((appointment) => {
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'approved' && appointment.status === 'approved') ||
        (statusFilter === 'pending' && appointment.status === 'pending') ||
        (statusFilter === 'cancelled' && appointment.status === 'cancelled');
      
      const matchesSearch = searchQuery === '' ||
        appointment.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (appointment.serviceName || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }, [appointmentsData, statusFilter, searchQuery]);

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
              <div className="flex items-start justify-between mb-4 gap-6">
                <div className="flex-1 min-w-0">
                  {/* Status Filter Tabs */}
                  <div className="flex gap-2 mb-4">
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
                        {filter === 'all' ? t('All') : t(filter.charAt(0).toUpperCase() + filter.slice(1))}
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder={t('Search by patient, doctor/treatment, or service...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-lg"
                    />
                  </div>
                </div>

                {/* Date Range Filters */}
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-2">
                    {(['today', 'tomorrow', 'this-week'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setDateFilter(filter)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          dateFilter === filter
                            ? 'bg-[#00FFA2] text-[#0C2243] font-medium'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {filter === 'today' ? t('Today') :
                         filter === 'tomorrow' ? t('Tomorrow') :
                         t('This week')}
                      </button>
                    ))}
                    <button
                      onClick={() => setDateFilter('all-time')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        dateFilter === 'all-time'
                          ? 'bg-[#00FFA2] text-[#0C2243] font-medium'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {t('To date')}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                      <div className="text-left">
                        <p className="text-sm font-semibold text-[#0C2243] dark:text-white">
                          {t('Auto booking')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {autoBookingEnabled
                            ? t('Patient requests are approved automatically')
                            : t('Patient requests require approval')}
                        </p>
                      </div>
                      <Switch
                        checked={autoBookingEnabled}
                        onCheckedChange={handleAutoBookingChange}
                        disabled={updatingAutoBooking}
                        aria-label={t('Auto booking')}
                        className="data-[state=checked]:bg-[#00D98B] data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                      />
                    </div>
                    <Button
                      onClick={() => setIsBookAppointmentModalOpen(true)}
                      className="bg-[#0C2243] text-white hover:bg-[#0A1D39] dark:bg-[#00FFA2] dark:text-[#0C2243] dark:hover:bg-[#00E693]"
                    >
                      {t('Book Appointment')}
                    </Button>
                  </div>
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
                        <th className="text-left py-4 px-4">
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
                          sortDirection={getSortDirection('serviceName')}
                          onSort={() => handleSort('serviceName')}
                        >
                          {t('Service')}
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
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
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
                            {appointment.serviceName || t('N/A')}
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
          <DialogContent className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg p-0 overflow-hidden shadow-xl border-0">
            <DialogHeader className="px-6 pt-6 pb-5 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('Appointment Details')}
              </DialogTitle>
            </DialogHeader>

            {loadingDetails ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">{t('Loading appointment details...')}</p>
              </div>
            ) : selectedAppointmentDetails ? (
              <div className="px-6 py-6">
                {/* PATIENT INFORMATION */}
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    {t('Patient Information')}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Name')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Gender')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.patient.gender}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Contact')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.patient.contact}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Email')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.patient.email}</p>
                    </div>
                  </div>
                </div>

                {/* DOCTOR'S / TREATMENT INFORMATION */}
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    {t('Doctor / Treatment Information')}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Name')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Specialty')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.specialty}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Service')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.service}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Availability')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.availability}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedAppointmentDetails.status !== 'cancelled' && (
                  <div className="flex items-center justify-between gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      onClick={handleCancelAppointment}
                      variant="outline"
                      className="flex-1 border-red-600 dark:border-red-500 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 px-6 py-2.5 rounded-lg font-medium"
                    >
                      <X className="w-4 h-4 mr-2 text-red-600 dark:text-red-400" />
                      {t('Cancel Appointment')}
                    </Button>
                    <Button
                      onClick={handleRescheduleAppointment}
                      className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      {t('Reschedule')}
                    </Button>
                    {selectedAppointmentDetails.status === 'pending' && (
                      <Button
                        onClick={handleApproveAppointment}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-4 h-4 mr-2 text-white" />
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
          <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg p-0 overflow-hidden shadow-xl border-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('Approve Appointment')}
              </DialogTitle>
            </DialogHeader>

            {selectedAppointmentDetails ? (
              <div className="px-6 py-6">
                {/* Large Green Checkmark Icon */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    {/* Outer circle */}
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
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
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Patient')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Doctor')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Date & Time')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatDate(selectedAppointmentDetails.appointment_date)} {t('at')} {formatTime(selectedAppointmentDetails.appointment_time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Service')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.service}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Status')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('Pending Approval')}</p>
                    </div>
                  </div>
                </div>

                {/* Confirmation Message */}
                <div className="mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                    {t('Are you sure you want to approve this appointment? This will confirm the booking and notify both parties.')}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => setIsApproveConfirmModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2.5 rounded-lg font-medium"
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
          <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg p-0 overflow-hidden shadow-xl border-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('Cancel Appointment')}
              </DialogTitle>
            </DialogHeader>

            {selectedAppointmentDetails ? (
              <div className="px-6 py-6">
                {/* Large Red Cancel Icon */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    {/* Outer circle */}
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
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
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Patient')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Doctor')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Date & Time')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatDate(selectedAppointmentDetails.appointment_date)} {t('at')} {formatTime(selectedAppointmentDetails.appointment_time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Service')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAppointmentDetails.doctor.service}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('Status')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('Pending Approval')}</p>
                    </div>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="mb-6">
                  <p className="text-sm text-red-600 dark:text-red-400 text-center leading-relaxed">
                    {t('Once cancelled, this appointment will be marked as "Cancelled".')}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => setIsCancelConfirmModalOpen(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2.5 rounded-lg font-medium"
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
          <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg p-0 overflow-hidden shadow-xl border-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('Confirmation')}
              </DialogTitle>
            </DialogHeader>

            {selectedAppointmentDetails ? (
              <div className="px-6 py-6">
                {/* Calendar Icon with Clock */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-[#0C2243] dark:bg-[#0C2243] rounded-full flex items-center justify-center">
                    <div className="relative">
                      <Calendar className="w-8 h-8 text-white" />
                      <Clock className="w-4 h-4 text-white absolute -bottom-1 -right-1 bg-[#00FFA2] rounded-full p-0.5" />
                    </div>
                  </div>
                </div>

                {/* Question */}
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {t('Reschedule Appointment?')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {t(
                      'Are you sure you want to reschedule this appointment? Previous: {{date}} - {{time}} with {{doctor}}',
                      {
                        date: formatDateForReschedule(selectedAppointmentDetails.appointment_date),
                        time: formatTime(selectedAppointmentDetails.appointment_time),
                        doctor: selectedAppointmentDetails.doctor.name,
                      }
                    )}
                  </p>
                </div>

                {/* Date and Time Inputs */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">{t('New date')}</label>
                    <div className="relative">
                      <Calendar 
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 cursor-pointer z-10" 
                        onClick={() => {
                          const dateInput = document.getElementById('new-appointment-date') as HTMLInputElement;
                          if (dateInput && typeof dateInput.showPicker === 'function') {
                            dateInput.showPicker();
                          } else {
                            dateInput?.click();
                          }
                        }}
                      />
                      <Input
                        id="new-appointment-date"
                        type="date"
                        value={newAppointmentDate}
                        onChange={(e) => setNewAppointmentDate(e.target.value)}
                        className="h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#0C2243] dark:focus:border-[#00FFA2] focus:ring-[#0C2243] dark:focus:ring-[#00FFA2] pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">{t('New time')}</label>
                    <div className="relative">
                      <Clock 
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 cursor-pointer z-10" 
                        onClick={() => {
                          const timeInput = document.getElementById('new-appointment-time') as HTMLInputElement;
                          if (timeInput && typeof timeInput.showPicker === 'function') {
                            timeInput.showPicker();
                          } else {
                            timeInput?.click();
                          }
                        }}
                      />
                      <Input
                        id="new-appointment-time"
                        type="time"
                        value={newAppointmentTime}
                        onChange={(e) => setNewAppointmentTime(e.target.value)}
                        className="h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-[#0C2243] dark:focus:border-[#00FFA2] focus:ring-[#0C2243] dark:focus:ring-[#00FFA2] pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
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
                    {t('Cancel')}
                  </Button>
                  <Button
                    onClick={handleConfirmReschedule}
                    className="flex-1 bg-[#0C2243] hover:bg-[#0a1a35] dark:bg-[#00FFA2] dark:hover:bg-[#00FFA2]/90 text-white px-6 py-2.5 rounded-lg font-medium"
                  >
                    {t('Confirm Reschedule')}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
        <BookAppointmentModal
          clinic={clinic}
          open={isBookAppointmentModalOpen}
          onOpenChange={setIsBookAppointmentModalOpen}
          onBooked={async () => {
            if (clinic?.id) {
              await fetchAppointments(clinic.id);
            }
          }}
        />
      </div>
    </ProtectedRoute>
  );
};

export default ClinicAdminAppointments;
