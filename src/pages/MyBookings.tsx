import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { useBooking, Appointment } from '@/contexts/BookingContext';
import { BookingModal } from '@/components/BookingModal';
import { MoreVertical, Calendar, X, Clock, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';

const MyBookings = () => {
  const { getUpcomingAppointments, getPendingAppointments, getPastAppointments, appointments, cancelAppointment } = useBooking();
  const navigate = useNavigate();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  
  const upcomingAppointments = getUpcomingAppointments();
  const pendingAppointments = getPendingAppointments();
  const pastBookings = getPastAppointments();
  
  console.log('All appointments:', appointments);
  console.log('Pending appointments:', pendingAppointments);
  console.log('Upcoming appointments:', upcomingAppointments);
  console.log('Past bookings:', pastBookings);

  const handleCancelAppointment = (id: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      cancelAppointment(id);
    }
  };

  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    cancelAppointment(appointment.id);
    setIsBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">{/* Added bottom padding for mobile nav */}
      <Header />
      
      {/* Upcoming Appointments Section */}
      <section className="py-6 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Upcoming Appointments</h2>
          <p className="text-sm text-gray-600 mb-6">Stay prepared with your confirmed appointments. Tap for details or reschedule if needed.</p>
          
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-3">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-start gap-3">
                    {/* Clinic Icon */}
                    <div className="w-10 h-10 bg-[#00FFA2] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#0C2243]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                    </div>
                    
                    {/* Appointment Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">{appointment.clinic}</h3>
                      <p className="text-lg font-semibold text-gray-900">{appointment.specialty}</p>
                      <p className="text-sm text-gray-600">{appointment.doctorName}</p>
                      
                      {/* Time and Date */}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(appointment.date), 'd MMM, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReschedule(appointment)}
                        className="text-xs"
                      >
                        Reschedule
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCancelAppointment(appointment.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No upcoming appointments scheduled.</p>
              <Button className="mt-4" onClick={() => navigate('/')}>Book New Appointment</Button>
            </div>
          )}
        </div>
      </section>

      {/* Booking Pending Section */}
      <section className="py-6 px-4 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Booking Pending</h2>
          <p className="text-sm text-gray-600 mb-6">Your booking request has been received. Once confirmed, we'll notify you here.</p>
          
          {pendingAppointments.length > 0 ? (
            <div className="space-y-3">
              {pendingAppointments.map((appointment) => (
                <div key={appointment.id} className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-start gap-3">
                    {/* Clinic Icon */}
                    <div className="w-10 h-10 bg-[#00FFA2] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#0C2243]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                    </div>
                    
                    {/* Appointment Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">{appointment.clinic}</h3>
                      <p className="text-lg font-semibold text-gray-900">{appointment.specialty}</p>
                      <p className="text-sm text-gray-600">{appointment.doctorName}</p>
                      
                      {/* Time and Date */}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(appointment.date), 'd MMM, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Pending Status */}
                    <div className="bg-[#0C2243] text-white px-3 py-1 rounded-full text-xs font-medium">
                      Pending
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No pending appointments.</p>
            </div>
          )}
        </div>
      </section>

      {/* Past Bookings Section */}
      <section className="py-6 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Past Bookings</h2>
          <p className="text-sm text-gray-600 mb-6">Your completed appointment history for reference and records.</p>
          
          {pastBookings.length > 0 ? (
            <div className="space-y-3">
              {pastBookings.map((appointment) => (
                <div key={appointment.id} className="bg-white rounded-lg p-4 shadow-sm border opacity-75">
                  <div className="flex items-start gap-3">
                    {/* Clinic Icon */}
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                    </div>
                    
                    {/* Appointment Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">{appointment.clinic}</h3>
                      <p className="text-lg font-semibold text-gray-900">{appointment.specialty}</p>
                      <p className="text-sm text-gray-600">{appointment.doctorName}</p>
                      
                      {/* Time and Date */}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(appointment.date), 'd MMM, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Completed Status */}
                    <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                      Completed
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No past appointments.</p>
            </div>
          )}
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

      {/* Bottom Navigation - Mobile Only */}
      <BottomNavigation 
        viewMode="services" 
        onViewModeChange={() => {}} 
      />
    </div>
  );
};

export default MyBookings;