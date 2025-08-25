import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useBooking, Appointment } from '@/contexts/BookingContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BookingModal } from '@/components/BookingModal';
import { MoreVertical, Calendar, X } from 'lucide-react';

const MyBookings = () => {
  const { getUpcomingAppointments, getPastAppointments, appointments, cancelAppointment } = useBooking();
  const navigate = useNavigate();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  
  const upcomingAppointments = getUpcomingAppointments();
  const pastBookings = getPastAppointments();
  
  console.log('All appointments:', appointments);
  console.log('Upcoming appointments:', upcomingAppointments);
  console.log('Past bookings:', pastBookings);

  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    cancelAppointment(appointment.id);
    setIsBookingModalOpen(true);
  };

  const handleCancel = (appointmentId: string) => {
    cancelAppointment(appointmentId);
  };

  const AppointmentCard = ({ appointment, showStatus = false, isUpcoming = false }: { 
    appointment: Appointment; 
    showStatus?: boolean; 
    isUpcoming?: boolean;
  }) => (
    <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 sm:gap-4">
        <img
          src={appointment.doctorImage || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&fit=crop&crop=face&auto=format'}
          alt={appointment.doctorName}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{appointment.doctorName}</h3>
          <p className="text-xs sm:text-sm text-gray-600 truncate">{appointment.specialty || 'General Medicine'}</p>
          <p className="text-xs sm:text-sm text-gray-500 truncate">{appointment.clinic}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right">
            <p className="text-xs sm:text-sm font-medium text-gray-900">{appointment.time}</p>
            <p className="text-xs sm:text-sm text-gray-500">{new Date(appointment.date).toLocaleDateString('en-US', { 
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
          {isUpcoming && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2" align="end">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs sm:text-sm"
                    onClick={() => handleReschedule(appointment)}
                  >
                    <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Reschedule
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm"
                    onClick={() => handleCancel(appointment.id)}
                  >
                    <X className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Cancel
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex flex-col">
            {/* Clinic Info */}
            <div className="w-full max-w-md mx-auto lg:mx-0">
              <div className="bg-white border rounded-lg p-4 sm:p-6 h-48 sm:h-64 relative overflow-hidden" style={{backgroundImage: 'url(https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop&auto=format)', backgroundSize: 'cover', backgroundPosition: 'center'}}>
                <div className="absolute inset-0 bg-white/80 rounded-lg"></div>
                <div className="relative z-10">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">My Bookings</h1>
                  <p className="text-sm sm:text-base text-gray-700">
                    View and manage all your scheduled appointments in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Appointments */}
      <section className="py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Upcoming Appointments</h2>
            <p className="text-sm sm:text-base text-gray-600">Stay prepared with your confirmed appointments. Tap for details or reschedule if needed.</p>
          </div>
          
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {upcomingAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} isUpcoming={true} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 sm:p-8 text-center border">
              <p className="text-gray-500 mb-4">No upcoming appointments scheduled.</p>
              <Button className="mt-4" onClick={() => navigate('/')}>Book New Appointment</Button>
            </div>
          )}
        </div>
      </section>

      {/* Past Bookings */}
      <section className="py-6 lg:py-8 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Past Bookings</h2>
            <p className="text-sm sm:text-base text-gray-600">Check your history of completed appointments. Perfect for quick reference or records.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {pastBookings.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} showStatus={true} />
            ))}
          </div>
        </div>
      </section>

      {/* Booking Modal for Rescheduling */}
      {selectedAppointment && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedAppointment(null);
          }}
          doctorName={selectedAppointment.doctorName}
          clinicName={selectedAppointment.clinic}
        />
      )}
    </div>
  );
};

export default MyBookings;