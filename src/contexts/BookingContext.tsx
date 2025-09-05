import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Appointment {
  id: string;
  doctorName: string;
  specialty?: string;
  clinic: string;
  date: string;
  time: string;
  status: 'pending' | 'upcoming' | 'completed';
  bookedAt: Date;
}

interface BookingContextType {
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id' | 'bookedAt'>) => string;
  confirmAppointment: (appointmentId: string) => void;
  cancelAppointment: (appointmentId: string) => void;
  getUpcomingAppointments: () => Appointment[];
  getPendingAppointments: () => Appointment[];
  getPastAppointments: () => Appointment[];
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([
    // Keep one sample past appointment for demo
    {
      id: '2',
      doctorName: 'Dr. Lisa Wilson',
      specialty: 'Cardiologist',
      clinic: 'Cypress Wellness Center',
      date: '2024-04-20',
      time: '2:00 PM',
      status: 'completed',
      
      bookedAt: new Date('2024-04-15')
    },
    {
      id: '3',
      doctorName: 'Dr. Steven White',
      specialty: 'Orthopedist',
      clinic: 'Redwood Family Practice',
      date: '2024-04-18',
      time: '11:00 AM',
      status: 'completed',
      
      bookedAt: new Date('2024-04-10')
    }
  ]);

  const addAppointment = (appointmentData: Omit<Appointment, 'id' | 'bookedAt'>) => {
    const newAppointment: Appointment = {
      ...appointmentData,
      id: Date.now().toString(),
      bookedAt: new Date(),
    };
    console.log('Adding new appointment:', newAppointment);
    setAppointments(prev => {
      const updated = [...prev, newAppointment];
      console.log('Updated appointments:', updated);
      return updated;
    });
    return newAppointment.id;
  };

  const confirmAppointment = (appointmentId: string) => {
    setAppointments(prev => 
      prev.map(apt => 
        apt.id === appointmentId ? { ...apt, status: 'upcoming' as const } : apt
      )
    );
  };

  const cancelAppointment = (appointmentId: string) => {
    setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
  };

  const getUpcomingAppointments = () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    console.log('Today string for comparison:', todayString);
    
    const upcoming = appointments.filter(apt => {
      const appointmentDate = apt.date; // Already in YYYY-MM-DD format
      const isUpcoming = appointmentDate >= todayString && apt.status === 'upcoming';
      console.log(`Appointment ${apt.id}: date=${appointmentDate}, status=${apt.status}, isUpcoming=${isUpcoming}`);
      return isUpcoming;
    });
    
    console.log('Filtered upcoming appointments:', upcoming);
    return upcoming;
  };

  const getPendingAppointments = () => {
    return appointments.filter(apt => apt.status === 'pending');
  };

  const getPastAppointments = () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    return appointments.filter(apt => {
      const appointmentDate = apt.date; // Already in YYYY-MM-DD format
      return appointmentDate < todayString || apt.status === 'completed';
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
