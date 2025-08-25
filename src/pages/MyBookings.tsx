import React from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  clinic: string;
  date: string;
  time: string;
  status: 'upcoming' | 'completed';
  doctorImage: string;
}

const MyBookings = () => {
  // Mock data for bookings
  const upcomingAppointments: Appointment[] = [
    {
      id: '1',
      doctorName: 'Dr. Sarah Ali',
      specialty: 'Dermatologist',
      clinic: 'Heart Center',
      date: '2024-04-25',
      time: '10:00 AM',
      status: 'upcoming',
      doctorImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&fit=crop&crop=face&auto=format'
    }
  ];

  const pastBookings: Appointment[] = [
    {
      id: '2',
      doctorName: 'Dr. Lisa Wilson',
      specialty: 'Cardiologist',
      clinic: 'Cypress Wellness Center',
      date: '2024-04-20',
      time: '2:00 PM',
      status: 'completed',
      doctorImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&crop=face&auto=format'
    },
    {
      id: '3',
      doctorName: 'Dr. Steven White',
      specialty: 'Orthopedist',
      clinic: 'Redwood Family Practice',
      date: '2024-04-18',
      time: '11:00 AM',
      status: 'completed',
      doctorImage: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=80&h=80&fit=crop&crop=face&auto=format'
    },
    {
      id: '4',
      doctorName: 'Dr. Anna Black',
      specialty: 'Neurologist',
      clinic: 'Pine Hill Healthcare',
      date: '2024-04-15',
      time: '3:30 PM',
      status: 'completed',
      doctorImage: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=80&h=80&fit=crop&crop=face&auto=format'
    }
  ];

  const AppointmentCard = ({ appointment, showStatus = false }: { appointment: Appointment; showStatus?: boolean }) => (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <div className="flex items-center gap-4">
        <img
          src={appointment.doctorImage}
          alt={appointment.doctorName}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{appointment.doctorName}</h3>
          <p className="text-sm text-gray-600">{appointment.specialty}</p>
          <p className="text-sm text-gray-500">{appointment.clinic}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{appointment.time}</p>
          <p className="text-sm text-gray-500">{new Date(appointment.date).toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })}</p>
          {showStatus && (
            <span className="inline-block mt-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
              Completed
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left side - Bookings Info */}
            <div className="lg:w-1/3">
              <div className="bg-gray-100 rounded-lg p-6 h-64">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">My Bookings</h1>
                <p className="text-gray-600">
                  View and manage all your scheduled appointments in one place.
                </p>
              </div>
            </div>
            
            {/* Right side - Hero Image */}
            <div className="lg:w-2/3">
              <div className="bg-gradient-to-r from-purple-200 via-blue-200 to-teal-200 rounded-lg h-64 flex items-center justify-center overflow-hidden">
                <img
                  src="/lovable-uploads/6aac7cdd-c5b9-437c-b36e-f208bb88251e.png"
                  alt="Medical Booking Illustration"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Appointments */}
      <section className="py-8 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Upcoming Appointments</h2>
            <p className="text-gray-600">Stay prepared with your confirmed appointments. Tap for details or reschedule if needed.</p>
          </div>
          
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-8 text-center border">
              <p className="text-gray-500">No upcoming appointments scheduled.</p>
              <Button className="mt-4">Book New Appointment</Button>
            </div>
          )}
        </div>
      </section>

      {/* Past Bookings */}
      <section className="py-8 px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Past Bookings</h2>
            <p className="text-gray-600">Check your history of completed appointments. Perfect for quick reference or records.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastBookings.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} showStatus={true} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default MyBookings;