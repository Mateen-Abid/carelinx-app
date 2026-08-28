import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import FeedbackModal from '@/components/FeedbackModal';
import { clinicsData } from '@/data/clinicsData';
import { api } from '@/services/api';
import { useAuth } from './AuthContext';

export interface Appointment {
  id: string;
  doctorName: string;
  specialty?: string;
  serviceName?: string;
  clinic: string;
  clinicId?: string;
  clinicLogo?: string;
  clinicAddress?: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';
  bookedAt: Date;
  doctorId?: string;
  bookingType?: 'doctor' | 'treatment';
  treatmentId?: string;
  treatmentName?: string;
}

interface BookingContextType {
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id' | 'bookedAt'>) => Promise<{
    id: string;
    status: Appointment['status'];
  }>;
  confirmAppointment: (appointmentId: string) => Promise<void>;
  cancelAppointment: (appointmentId: string) => Promise<void>;
  getUpcomingAppointments: () => Appointment[];
  getPendingAppointments: () => Appointment[];
  getPastAppointments: () => Appointment[];
  showFeedbackModal: (bookingId: string, clinicName: string, doctorName: string) => void;
  fetchAppointments: () => Promise<void>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    bookingId: string;
    clinicName: string;
    doctorName: string;
  }>({
    isOpen: false,
    bookingId: '',
    clinicName: '',
    doctorName: ''
  });

  const { user } = useAuth();

  // Fetch appointments from backend API
  const fetchAppointments = async () => {
    try {
      if (!user) return;

      console.log('📡 Fetching bookings from backend...');
      const { bookings: data } = await api.bookings.getBookings();

      if (!data) {
        console.log('ℹ️ No bookings found');
        return;
      }

      console.log('✅ Fetched bookings from backend:', data.length);

      // Fetch all clinics from backend to get logos
      console.log('📡 Fetching clinics for logos...');
      const { clinics: clinicsDataFromDB } = await api.clinics.getClinics();

      // Create a map for quick clinic lookup by ID and name
      const clinicMapById = new Map<string, { name: string; logo_url: string | null }>();
      const clinicMapByName = new Map<string, { name: string; logo_url: string | null }>();
      
      clinicsDataFromDB?.forEach(clinic => {
        if (clinic.id) {
          clinicMapById.set(clinic.id, { name: clinic.name, logo_url: clinic.logo_url });
        }
        if (clinic.name) {
          // Normalize clinic name for matching (trim and lowercase)
          const normalizedName = clinic.name.trim().toLowerCase();
          clinicMapByName.set(normalizedName, { name: clinic.name, logo_url: clinic.logo_url });
        }
      });

      const formattedAppointments: Appointment[] = data.map((booking: any) => {
        // Try to find clinic logo from database
        // First try by clinic_id (most reliable)
        let clinicLogo = '';
        let clinicAddress = booking.clinic_address || null;
        
        if (booking.clinic_id && clinicMapById.has(booking.clinic_id)) {
          clinicLogo = clinicMapById.get(booking.clinic_id)?.logo_url || '';
        } else if (booking.clinic) {
          // Fallback: try by clinic name (normalized for matching)
          const normalizedClinicName = booking.clinic.trim().toLowerCase();
          if (clinicMapByName.has(normalizedClinicName)) {
            clinicLogo = clinicMapByName.get(normalizedClinicName)?.logo_url || '';
          } else {
            // Last resort: try hardcoded clinicsData
            const clinicData = clinicsData.find(clinic => 
              clinic.name.toLowerCase() === normalizedClinicName
            );
            if (clinicData) {
              clinicLogo = clinicData.logo || '';
              // Use hardcoded address for hardcoded clinics
              clinicAddress = clinicData.address;
            }
          }
        }
        
        // If no address found from database, check hardcoded clinics
        if (!clinicAddress && booking.clinic) {
          const normalizedClinicName = booking.clinic.trim().toLowerCase();
          const hardcodedClinic = clinicsData.find(clinic => 
            clinic.name.toLowerCase() === normalizedClinicName
          );
          if (hardcodedClinic) {
            clinicAddress = hardcodedClinic.address;
          }
        }
        
        // Ensure status is properly set - default to 'pending' if missing
        const bookingStatus = booking.status || 'pending';
        
        console.log('📋 Public user booking status:', {
          bookingId: booking.id,
          status: bookingStatus,
          rawStatus: booking.status,
          clinicLogo: clinicLogo ? 'Found' : 'Not found',
          clinicName: booking.clinic,
          clinicId: booking.clinic_id,
          clinicAddress: clinicAddress || 'Not found'
        });
        
        return {
          id: booking.id,
          doctorName: booking.doctor_name,
          specialty: booking.specialty,
          serviceName: booking.service_name || undefined,
          clinic: booking.clinic,
          clinicId: booking.clinic_id || undefined,
          clinicLogo: clinicLogo,
          clinicAddress: clinicAddress || 'Location not specified',
          date: booking.appointment_date,
          time: booking.appointment_time,
          status: bookingStatus as 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled',
          bookedAt: new Date(booking.created_at),
          doctorId: booking.doctor_id || undefined,
          bookingType: (booking.booking_type || 'doctor') as 'doctor' | 'treatment',
          treatmentId: booking.treatment_id || undefined,
          treatmentName: booking.treatment_name || undefined,
        };
      });

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  // Fetch bookings on mount
  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const addAppointment = async (appointmentData: Omit<Appointment, 'id' | 'bookedAt'>): Promise<string> => {
    try {
      if (!user) throw new Error('User not authenticated');

      const serviceName = String(appointmentData.serviceName || '').trim();
      const treatmentName = String(appointmentData.treatmentName || '').trim();
      if (!serviceName || serviceName.includes(',')) {
        throw new Error('Service is required to book this appointment');
      }
      if (treatmentName && serviceName.toLowerCase() === treatmentName.toLowerCase()) {
        throw new Error('Service is required to book this appointment');
      }

      const bookingPayload = {
        doctor_name: appointmentData.doctorName,
        specialty: appointmentData.specialty || 'General',
        service_name: serviceName,
        clinic: appointmentData.clinic,
        clinic_id: appointmentData.clinicId || null,
        appointment_date: appointmentData.date,
        appointment_time: appointmentData.time,
        doctor_id: appointmentData.doctorId || null,
        booking_type: appointmentData.bookingType || 'doctor',
        treatment_id: appointmentData.treatmentId || null,
        treatment_name: appointmentData.treatmentName || null,
      };
      
      console.log('📤 Sending booking request to backend:', {
        ...bookingPayload,
        userId: user.id.substring(0, 8) + '...' // Partially hide user_id for privacy
      });
      
      // Call the backend API to create the booking
      const { booking } = await api.bookings.createBooking(bookingPayload);

      if (!booking || !booking.id) {
        throw new Error('Failed to create booking');
      }
      
      console.log('✅ Booking created via backend:', booking.id);
      
      // Don't show feedback modal immediately - let the booking confirmation modal show first
      // The feedback modal will be triggered after the user closes the confirmation modal
      
      // Refresh appointments to get the new booking
      await fetchAppointments();
      
      return {
        id: booking.id,
        status: booking.status as Appointment['status'],
      };
    } catch (error) {
      console.error('❌ Error adding appointment:', error);
      throw error;
    }
  };

  const confirmAppointment = async (appointmentId: string): Promise<void> => {
    try {
      console.log('📤 Confirming appointment via backend:', appointmentId);
      await api.bookings.updateBooking(appointmentId, { 
        status: 'confirmed', 
        confirmed_at: new Date().toISOString() 
      });
      console.log('✅ Appointment confirmed successfully');
      await fetchAppointments();
    } catch (error) {
      console.error('❌ Error confirming appointment:', error);
      throw error;
    }
  };

  const cancelAppointment = async (appointmentId: string): Promise<void> => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('📤 Cancelling appointment via backend:', appointmentId);
      await api.bookings.updateBooking(appointmentId, { status: 'cancelled' });
      
      console.log('✅ Appointment cancelled successfully');
      await fetchAppointments();
    } catch (error) {
      console.error('❌ Error cancelling appointment:', error);
      throw error; // Re-throw to let the UI handle the error
    }
  };

  const getUpcomingAppointments = () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    return appointments.filter(apt => {
      const appointmentDate = apt.date; // Already in YYYY-MM-DD format
      return appointmentDate >= todayString && apt.status === 'confirmed';
    });
  };

  const getPendingAppointments = () => {
    // Include both 'pending' and 'rescheduled' appointments - both need user action
    return appointments.filter(apt => apt.status === 'pending' || apt.status === 'rescheduled');
  };

  const getPastAppointments = () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    return appointments.filter(apt => {
      const appointmentDate = apt.date; // Already in YYYY-MM-DD format
      return appointmentDate < todayString || apt.status === 'completed' || apt.status === 'cancelled';
    });
  };

  const showFeedbackModal = (bookingId: string, clinicName: string, doctorName: string) => {
    setFeedbackModal({
      isOpen: true,
      bookingId,
      clinicName,
      doctorName
    });
  };

  const closeFeedbackModal = async () => {
    // DON'T auto-confirm the booking - it should remain as 'pending'
    // Only clinic admin can approve it by clicking "Approve Appointment"
    // Just close the modal
    console.log('Closing feedback modal - booking remains pending until clinic admin approves');
    
    setFeedbackModal({
      isOpen: false,
      bookingId: '',
      clinicName: '',
      doctorName: ''
    });
  };

  return (
    <BookingContext.Provider value={{
      appointments,
      addAppointment,
      confirmAppointment,
      cancelAppointment,
      getUpcomingAppointments,
      getPendingAppointments,
      getPastAppointments,
      showFeedbackModal,
      fetchAppointments
    }}>
      {children}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={closeFeedbackModal}
        bookingId={feedbackModal.bookingId}
        clinicName={feedbackModal.clinicName}
        doctorName={feedbackModal.doctorName}
      />
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
