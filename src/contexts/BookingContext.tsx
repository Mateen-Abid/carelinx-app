import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import FeedbackModal from '@/components/FeedbackModal';

export interface Appointment {
  id: string;
  doctorName: string;
  specialty?: string;
  clinic: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  bookedAt: Date;
}

interface BookingContextType {
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id' | 'bookedAt'>) => Promise<string>;
  confirmAppointment: (appointmentId: string) => Promise<void>;
  cancelAppointment: (appointmentId: string) => Promise<void>;
  getUpcomingAppointments: () => Appointment[];
  getPendingAppointments: () => Appointment[];
  getPastAppointments: () => Appointment[];
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

  // Fetch appointments from database
  const fetchAppointments = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching appointments:', error);
        return;
      }

      const formattedAppointments: Appointment[] = data.map(booking => ({
        id: booking.id,
        doctorName: booking.doctor_name,
        specialty: booking.specialty,
        clinic: booking.clinic,
        date: booking.appointment_date,
        time: booking.appointment_time,
        status: booking.status === 'confirmed' ? 'confirmed' : booking.status as 'pending' | 'cancelled' | 'completed',
        bookedAt: new Date(booking.created_at)
      }));

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  // Set up real-time subscription for booking updates
  useEffect(() => {
    fetchAppointments();

    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('Booking update received:', payload);
          
          // Check if feedback should be shown (after 5 seconds, booking still pending)
          if (payload.eventType === 'UPDATE' && 
              payload.new?.show_feedback === true && 
              payload.new?.status === 'pending') {
            
            console.log('Feedback modal triggered for pending booking');
            
            // Show feedback modal
            setFeedbackModal({
              isOpen: true,
              bookingId: payload.new.id,
              clinicName: payload.new.clinic,
              doctorName: payload.new.doctor_name
            });
          }
          
          // Refetch appointments to update the UI in real-time
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addAppointment = async (appointmentData: Omit<Appointment, 'id' | 'bookedAt'>): Promise<string> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Call the edge function to process the booking
      const { data, error } = await supabase.functions.invoke('process-booking', {
        body: {
          doctorName: appointmentData.doctorName,
          specialty: appointmentData.specialty || 'General',
          clinic: appointmentData.clinic,
          date: appointmentData.date,
          time: appointmentData.time,
          userId: user.user.id
        }
      });

      if (error) throw error;
      
      console.log('Booking created:', data);
      
      // Refresh appointments to get the new booking
      await fetchAppointments();
      
      return data.bookingId;
    } catch (error) {
      console.error('Error adding appointment:', error);
      throw error;
    }
  };

  const confirmAppointment = async (appointmentId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (error) throw error;
      await fetchAppointments();
    } catch (error) {
      console.error('Error confirming appointment:', error);
    }
  };

  const cancelAppointment = async (appointmentId: string): Promise<void> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)
        .eq('user_id', user.user.id); // Ensure user can only cancel their own bookings

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Appointment cancelled successfully');
      await fetchAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
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
    return appointments.filter(apt => apt.status === 'pending');
  };

  const getPastAppointments = () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    return appointments.filter(apt => {
      const appointmentDate = apt.date; // Already in YYYY-MM-DD format
      return appointmentDate < todayString || apt.status === 'completed' || apt.status === 'cancelled';
    });
  };

  const closeFeedbackModal = () => {
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
      getPastAppointments
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