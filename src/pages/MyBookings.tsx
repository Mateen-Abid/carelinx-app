import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { useBooking, Appointment } from '@/contexts/BookingContext';
import { useAuth } from '@/contexts/AuthContext';
import { CancelBookingModal } from '@/components/CancelBookingModal';
import { MoreVertical, Calendar, X, Clock, MapPin, User, RotateCcw, History } from 'lucide-react';
import { format } from 'date-fns';
import EnablePushNotifications from '@/assets/Enable Push Notifications@3x.svg';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { toast } from 'sonner';
import { clinicsData } from '@/data/clinicsData';

const MyBookings = () => {
  const { getUpcomingAppointments, getPendingAppointments, getPastAppointments, appointments, cancelAppointment } = useBooking();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Function to find service ID by specialty name
  const findServiceIdBySpecialty = (specialty: string): string => {
    for (const clinic of clinicsData) {
      for (const categoryName in clinic.categories) {
        const services = clinic.categories[categoryName];
        const service = services.find(s => s.name === specialty);
        if (service) {
          return service.id;
        }
      }
    }
    // Fallback to a default service if not found
    return 'general-consultation';
  };
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'upcoming' | 'pending' | 'history'>('pending');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  
  const upcomingAppointments = getUpcomingAppointments();
  const pendingAppointments = getPendingAppointments();
  const pastBookings = getPastAppointments();
  
  // Show auth prompt if not logged in
  useEffect(() => {
    if (!user) {
      setShowAuthPrompt(true);
    }
  }, [user]);
  
  // Show auth prompt modal if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
        <Header />
        <AuthPromptModal
          isOpen={showAuthPrompt}
          onClose={() => {
            setShowAuthPrompt(false);
            navigate('/');
          }}
          message="Please sign in to view your bookings"
        />
      </div>
    );
  }
  
  console.log('All appointments:', appointments);
  console.log('Pending appointments:', pendingAppointments);
  console.log('Upcoming appointments:', upcomingAppointments);
  console.log('Past bookings:', pastBookings);

  const handleCancelAppointment = (appointment: Appointment) => {
    setAppointmentToCancel(appointment);
    setIsCancelModalOpen(true);
  };

  const confirmCancelAppointment = async () => {
    if (appointmentToCancel) {
      try {
        await cancelAppointment(appointmentToCancel.id);
        setAppointmentToCancel(null);
        setIsCancelModalOpen(false);
        console.log('Appointment cancelled successfully');
      } catch (error) {
        console.error('Failed to cancel appointment:', error);
        toast.error('Failed to cancel appointment. Please try again.');
      }
    }
  };

  const handleReschedule = async (appointment: Appointment) => {
    try {
      // Cancel the current appointment first
      await cancelAppointment(appointment.id);
      
      // Find the service ID from the appointment data
      // We need to map from specialty name to service ID
      const serviceId = findServiceIdBySpecialty(appointment.specialty || 'General Consultation');
      
      // Navigate to the service page for rebooking
      navigate(`/service/${serviceId}`);
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Failed to reschedule appointment. Please try again.');
    }
  };

  // Get filtered appointments based on selected filter
  const getFilteredAppointments = () => {
    switch (selectedFilter) {
      case 'upcoming':
        return upcomingAppointments;
      case 'pending':
        return pendingAppointments;
      case 'history':
        return pastBookings.filter(appointment => appointment.status !== 'cancelled');
      default:
        return [];
    }
  };

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Header />
      
      {/* Blue Header Section with Filter Buttons */}
      <section className="bg-[#0C2243] text-white py-6 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-6 text-center">Booking</h1>
          
          {/* Filter Buttons - Circular Panel */}
          <div className="flex justify-center">
            <div className="flex bg-[#00FFA2] rounded-full p-1 border border-gray-200 w-full sm:w-auto">
              <button
                onClick={() => setSelectedFilter('upcoming')}
                className={`flex items-center justify-center gap-1 sm:gap-2 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-full text-sm sm:text-base font-medium transition-colors flex-1 sm:flex-none ${
                  selectedFilter === 'upcoming'
                    ? 'bg-[#0C2243] text-white'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Upcoming</span>
              </button>
              
              <button
                onClick={() => setSelectedFilter('pending')}
                className={`flex items-center justify-center gap-1 sm:gap-2 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-full text-sm sm:text-base font-medium transition-colors flex-1 sm:flex-none ${
                  selectedFilter === 'pending'
                    ? 'bg-[#0C2243] text-white'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Pending</span>
              </button>
              
              <button
                onClick={() => setSelectedFilter('history')}
                className={`flex items-center justify-center gap-1 sm:gap-2 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-full text-sm sm:text-base font-medium transition-colors flex-1 sm:flex-none ${
                  selectedFilter === 'history'
                    ? 'bg-[#0C2243] text-white'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <History className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>History</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Appointments List */}
      <section className="py-6 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          {filteredAppointments.length > 0 ? (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div key={appointment.id} className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-start gap-3">
                    {/* Clinic Logo */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {appointment.clinicLogo ? (
                        <img
                          src={appointment.clinicLogo}
                          alt={`${appointment.clinic} logo`}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-[#00FFA2] rounded-full flex items-center justify-center">
                          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                            <div className="w-4 h-4 bg-[#00FFA2] rounded"></div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Appointment Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-base leading-tight pr-2">{appointment.clinic}</h3>
                        
                        {/* Status Badge or Actions */}
                        {selectedFilter === 'pending' && (
                          <div className="bg-[#0C2243] text-white px-2 py-1 rounded-full text-xs font-medium flex-shrink-0">
                            Pending
                          </div>
                        )}
                        
                        {selectedFilter === 'upcoming' && (
                          <div className="flex gap-1 flex-shrink-0">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleReschedule(appointment)}
                              className="text-xs px-2 py-1 h-auto"
                            >
                              Reschedule
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCancelAppointment(appointment)}
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs px-2 py-1 h-auto"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                        
                        {selectedFilter === 'history' && (
                          <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0">
                            Completed
                          </div>
                        )}
                      </div>
                      
                      {/* Address with proper truncation */}
                      <div className="flex items-start gap-1 text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-3 leading-relaxed">
                          1st Floor, Icon Mall, 2001, 12th Main Rd, Indiranagar...
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-3">{appointment.specialty}</p>
                      
                      {/* Time and Date - optimized for mobile */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">{appointment.time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">{format(new Date(appointment.date), 'd MMM, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-32 h-32 mx-auto mb-6">
                <img
                  src={EnablePushNotifications}
                  alt="No appointments"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-gray-500 text-lg font-medium mb-4">
                {selectedFilter === 'upcoming' && 'No upcoming appointments scheduled.'}
                {selectedFilter === 'pending' && 'No pending appointments.'}
                {selectedFilter === 'history' && 'No past appointments.'}
              </p>
              {(selectedFilter === 'upcoming' || selectedFilter === 'pending') && (
                <Button 
                  onClick={() => navigate('/')}
                  className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white rounded-full px-8 py-3 font-medium"
                >
                  Book New Appointment
                </Button>
              )}
            </div>
          )}
        </div>
      </section>


      {/* Cancel Booking Modal */}
      <CancelBookingModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setAppointmentToCancel(null);
        }}
        onConfirm={confirmCancelAppointment}
        appointmentDetails={appointmentToCancel ? {
          clinic: appointmentToCancel.clinic,
          specialty: appointmentToCancel.specialty,
          doctorName: appointmentToCancel.doctorName,
          date: format(new Date(appointmentToCancel.date), 'd MMM, yyyy'),
          time: appointmentToCancel.time
        } : undefined}
      />

      {/* Bottom Navigation - Mobile Only */}
      <BottomNavigation 
        viewMode="services" 
        onViewModeChange={() => {}} 
      />
    </div>
  );
};

export default MyBookings;