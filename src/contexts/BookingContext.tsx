import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Appointment {
  id: string;
  doctorName: string;
  specialty?: string;
  clinic: string;
  date: string;
  time: string;
  status: 'upcoming' | 'completed';
  doctorImage?: string;
  bookedAt: Date;
}

interface BookingContextType {
  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id' | 'bookedAt'>) => void;
  getUpcomingAppointments: () => Appointment[];
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
      doctorImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&crop=face&auto=format',
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
      doctorImage: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=80&h=80&fit=crop&crop=face&auto=format',
      bookedAt: new Date('2024-04-10')
    }
  ]);

  const addAppointment = (appointmentData: Omit<Appointment, 'id' | 'bookedAt'>) => {
    const newAppointment: Appointment = {
      ...appointmentData,
      id: Date.now().toString(),
      bookedAt: new Date(),
    };
    setAppointments(prev => [...prev, newAppointment]);
  };

  const getUpcomingAppointments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return appointments.filter(apt => {
      const appointmentDate = new Date(apt.date);
      return appointmentDate >= today && apt.status === 'upcoming';
    });
  };

  const getPastAppointments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return appointments.filter(apt => {
      const appointmentDate = new Date(apt.date);
      return appointmentDate < today || apt.status === 'completed';
    });
  };

  return (
    <BookingContext.Provider value={{
      appointments,
      addAppointment,
      getUpcomingAppointments,
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
