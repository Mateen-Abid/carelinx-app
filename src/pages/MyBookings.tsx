import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { useBooking, Appointment } from '@/contexts/BookingContext';
import { useAuth } from '@/contexts/AuthContext';
import { CancelBookingModal } from '@/components/CancelBookingModal';
import { MoreVertical, Calendar, X, Clock, MapPin, User, RotateCcw, History, Check } from 'lucide-react';
import { format } from 'date-fns';
import EnablePushNotifications from '@/assets/Enable Push Notifications@3x.svg';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import { toast } from 'sonner';
import { clinicsData } from '@/data/clinicsData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/services/api';
import { useTranslation } from 'react-i18next';

const MyBookings = () => {
  const { getUpcomingAppointments, getPendingAppointments, getPastAppointments, appointments, cancelAppointment, confirmAppointment, fetchAppointments } = useBooking();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Function to find service ID by specialty name and optionally clinic name
  const findServiceIdBySpecialty = (specialty: string, clinicName?: string): string => {
    console.log('🔍 Finding service ID for specialty:', specialty, 'clinic:', clinicName);
    
    // If clinic name is provided, try to match clinic first
    if (clinicName) {
      const clinic = clinicsData.find(c => 
        c.name.toLowerCase().includes(clinicName.toLowerCase()) ||
        clinicName.toLowerCase().includes(c.name.toLowerCase())
      );
      
      if (clinic) {
        console.log('✅ Found matching clinic:', clinic.name);
        // Look for service in this clinic
        for (const categoryName in clinic.categories) {
          const services = clinic.categories[categoryName];
          // Try exact match first
          let service = services.find(s => s.name.toLowerCase() === specialty.toLowerCase());
          if (!service) {
            // Try partial match
            service = services.find(s => 
              s.name.toLowerCase().includes(specialty.toLowerCase()) ||
              specialty.toLowerCase().includes(s.name.toLowerCase())
            );
          }
          if (service) {
            console.log('✅ Found service:', service.id);
            return service.id;
          }
        }
      }
    }
    
    // If no clinic match or no clinic provided, search all clinics
    for (const clinic of clinicsData) {
      for (const categoryName in clinic.categories) {
        const services = clinic.categories[categoryName];
        // Try exact match first
        let service = services.find(s => s.name.toLowerCase() === specialty.toLowerCase());
        if (!service) {
          // Try partial match
          service = services.find(s => 
            s.name.toLowerCase().includes(specialty.toLowerCase()) ||
            specialty.toLowerCase().includes(s.name.toLowerCase())
          );
        }
        if (service) {
          console.log('✅ Found service in clinic:', clinic.name, 'service:', service.id);
          return service.id;
        }
      }
    }
    
    // Fallback to a default service if not found
    console.warn('⚠️ Service not found, using fallback: general-consultation');
    return 'general-consultation';
  };
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'upcoming' | 'pending' | 'history'>('pending');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [isRescheduleConfirmModalOpen, setIsRescheduleConfirmModalOpen] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());
  
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
          message={t('Please sign in to view your bookings')}
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
        toast.error(t('Failed to cancel appointment. Please try again.'));
      }
    }
  };

  const handleApproveRescheduled = async (appointment: Appointment) => {
    try {
      console.log('✅ Approving rescheduled appointment via backend:', appointment.id);
      // Use the context method which handles refetching automatically
      await confirmAppointment(appointment.id);

      toast.success(t('Appointment approved successfully'));
      // The context method already refreshes appointments, but ensure it's called
      await fetchAppointments();
    } catch (error: any) {
      console.error('❌ Error approving rescheduled appointment:', error);
      toast.error(error.message || t('Failed to approve appointment. Please try again.'));
    }
  };

  const handleReschedule = async (appointment: Appointment) => {
    // If it's a rescheduled appointment, show confirmation modal first
    if (appointment.status === 'rescheduled') {
      setAppointmentToReschedule(appointment);
      setIsRescheduleConfirmModalOpen(true);
      return;
    }

    try {
      if (appointment.bookingType === 'treatment' && appointment.treatmentId) {
        navigate(`/service/treatment-${appointment.treatmentId}`, {
          state: {
            rescheduleOriginalBookingId: appointment.id,
            bookingType: appointment.bookingType,
            clinicId: appointment.clinicId,
            selectedServiceName: appointment.serviceName,
            selectedSpecialty: appointment.specialty,
          },
        });
        return;
      }

      // Determine service ID - if appointment has doctorId, use database service format
      let serviceId: string;
      if (appointment.doctorId) {
        // This is a database doctor - use doctor-{id} format
        serviceId = `doctor-${appointment.doctorId}`;
        console.log('🔄 Rescheduling database doctor appointment:', serviceId);
      } else {
        // This is a hardcoded service - find by specialty name and clinic
        serviceId = findServiceIdBySpecialty(
          appointment.specialty || 'General Consultation',
          appointment.clinic
        );
        console.log('🔄 Rescheduling hardcoded service appointment:', serviceId);
      }
      
      // Navigate to the service page for rebooking
      navigate(`/service/${serviceId}`, {
        state: {
          rescheduleOriginalBookingId: appointment.id,
          bookingType: appointment.bookingType,
          clinicId: appointment.clinicId,
          selectedServiceName: appointment.serviceName,
          selectedSpecialty: appointment.specialty,
        },
      });
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error(t('Failed to reschedule appointment. Please try again.'));
    }
  };

  const handleConfirmRescheduleFromModal = async () => {
    if (!appointmentToReschedule) {
      console.error('❌ No appointment to reschedule');
      return;
    }

    console.log('🔄 Starting reschedule process for appointment:', appointmentToReschedule.id);
    console.log('📋 Appointment details:', {
      doctorId: appointmentToReschedule.doctorId,
      specialty: appointmentToReschedule.specialty,
      clinic: appointmentToReschedule.clinic,
      doctorName: appointmentToReschedule.doctorName
    });

    try {
      if (appointmentToReschedule.bookingType === 'treatment' && appointmentToReschedule.treatmentId) {
        setIsRescheduleConfirmModalOpen(false);
        setAppointmentToReschedule(null);
        navigate(`/service/treatment-${appointmentToReschedule.treatmentId}`, {
          state: {
            rescheduleOriginalBookingId: appointmentToReschedule.id,
            bookingType: appointmentToReschedule.bookingType,
            clinicId: appointmentToReschedule.clinicId,
            selectedServiceName: appointmentToReschedule.serviceName,
            selectedSpecialty: appointmentToReschedule.specialty,
          },
        });
        return;
      }
      
      // Determine service ID - if appointment has doctorId, use database service format
      let serviceId: string;
      
      if (appointmentToReschedule.doctorId) {
        // This is a database doctor - use doctor-{id} format
        serviceId = `doctor-${appointmentToReschedule.doctorId}`;
        console.log('🔄 Rescheduling database doctor appointment:', serviceId);
      } else {
        // Try to find doctor by name and clinic from database via backend
        console.log('🔍 No doctorId found, trying to lookup doctor from backend...');
        try {
          // Fetch all clinics and find matching one
          const { clinics: clinicsData } = await api.clinics.getClinics();
          const clinicData = clinicsData?.find((c: any) => 
            c.name.toLowerCase().includes(appointmentToReschedule.clinic.toLowerCase()) ||
            appointmentToReschedule.clinic.toLowerCase().includes(c.name.toLowerCase())
          );

          if (clinicData?.id && appointmentToReschedule.doctorName) {
            // Fetch doctors for this clinic
            const { doctors: doctorsData } = await api.doctors.getDoctors(clinicData.id);
            const doctorData = doctorsData?.find((d: any) => 
              d.name.toLowerCase().includes(appointmentToReschedule.doctorName?.toLowerCase() || '') ||
              appointmentToReschedule.doctorName?.toLowerCase().includes(d.name.toLowerCase() || '')
            );

            if (doctorData?.id) {
              serviceId = `doctor-${doctorData.id}`;
              console.log('✅ Found doctor in database:', serviceId);
            } else {
              // Fallback to hardcoded service lookup with clinic name
              serviceId = findServiceIdBySpecialty(
                appointmentToReschedule.specialty || 'General Consultation',
                appointmentToReschedule.clinic
              );
              console.log('⚠️ Doctor not found in database, using hardcoded service:', serviceId);
            }
          } else {
            // Fallback to hardcoded service lookup with clinic name
            serviceId = findServiceIdBySpecialty(
              appointmentToReschedule.specialty || 'General Consultation',
              appointmentToReschedule.clinic
            );
            console.log('⚠️ Clinic not found in database, using hardcoded service:', serviceId);
          }
        } catch (lookupError) {
          console.error('❌ Error looking up doctor:', lookupError);
          // Fallback to hardcoded service lookup with clinic name
          serviceId = findServiceIdBySpecialty(
            appointmentToReschedule.specialty || 'General Consultation',
            appointmentToReschedule.clinic
          );
          console.log('🔄 Rescheduling hardcoded service appointment:', serviceId);
        }
      }
      
      // Close modal first
      setIsRescheduleConfirmModalOpen(false);
      setAppointmentToReschedule(null);
      
      console.log('🧭 Navigating to service page:', `/service/${serviceId}`);
      
      // Navigate to the service page for rebooking
      navigate(`/service/${serviceId}`, {
        state: {
          rescheduleOriginalBookingId: appointmentToReschedule.id,
          bookingType: appointmentToReschedule.bookingType,
          clinicId: appointmentToReschedule.clinicId,
          selectedServiceName: appointmentToReschedule.serviceName,
          selectedSpecialty: appointmentToReschedule.specialty,
        },
      });
    } catch (error) {
      console.error('❌ Error rescheduling appointment:', error);
      toast.error(t('Failed to reschedule appointment. Please try again.'));
      // Don't close modal on error so user can try again
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
        return pastBookings;
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
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-6 text-center">{t('Booking')}</h1>
          
          {/* Filter Buttons - Circular Panel */}
          <div className="flex justify-center">
            <div className="flex bg-[#00FFA2] rounded-full p-1 w-full sm:w-auto">
              <button
                onClick={() => setSelectedFilter('upcoming')}
                className={`flex items-center justify-center gap-1 sm:gap-2 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-full text-sm sm:text-base font-medium transition-colors flex-1 sm:flex-none ${
                  selectedFilter === 'upcoming'
                    ? 'bg-[#0C2243] text-white border border-white'
                    : 'text-[#0C2243]'
                }`}
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{t('Upcoming')}</span>
              </button>
              
              <button
                onClick={() => setSelectedFilter('pending')}
                className={`flex items-center justify-center gap-1 sm:gap-2 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-full text-sm sm:text-base font-medium transition-colors flex-1 sm:flex-none ${
                  selectedFilter === 'pending'
                    ? 'bg-[#0C2243] text-white border border-white'
                    : 'text-[#0C2243]'
                }`}
              >
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{t('Pending')}</span>
              </button>
              
              <button
                onClick={() => setSelectedFilter('history')}
                className={`flex items-center justify-center gap-1 sm:gap-2 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-full text-sm sm:text-base font-medium transition-colors flex-1 sm:flex-none ${
                  selectedFilter === 'history'
                    ? 'bg-[#0C2243] text-white border border-white'
                    : 'text-[#0C2243]'
                }`}
              >
                <History className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{t('History')}</span>
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
                <div key={appointment.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-start gap-3">
                    {/* Clinic Logo */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-[#00FFA2]">
                      {appointment.clinicLogo && !failedLogos.has(appointment.id) ? (
                        <img
                          src={appointment.clinicLogo}
                          alt={t('Clinic logo', { clinic: appointment.clinic })}
                          className="w-full h-full object-cover rounded-full"
                          onError={() => {
                            // If image fails to load, add to failed set
                            setFailedLogos(prev => new Set(prev).add(appointment.id));
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-[#00FFA2] rounded-full flex items-center justify-center">
                          <span className="text-[#0C2243] font-bold text-lg">
                            {appointment.clinic?.charAt(0).toUpperCase() || 'C'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Appointment Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-base leading-tight pr-2">{appointment.clinic}</h3>
                        
                        {/* Status Badge */}
                        {selectedFilter === 'pending' && appointment.status === 'rescheduled' && (
                          <div className="bg-[#0C2243] text-white px-2 py-1 rounded-full text-xs font-medium flex-shrink-0">
                            {t('Rescheduled')}
                          </div>
                        )}
                        {selectedFilter === 'pending' && appointment.status !== 'rescheduled' && (
                          <div className="bg-[#0C2243] text-white px-2 py-1 rounded-full text-xs font-medium flex-shrink-0">
                            {t('Pending')}
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
                              {t('Reschedule')}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCancelAppointment(appointment)}
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs px-2 py-1 h-auto"
                            >
                              {t('Cancel')}
                            </Button>
                          </div>
                        )}
                        
                        {selectedFilter === 'history' && (
                          <div
                            className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                              appointment.status === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {appointment.status === 'cancelled' ? t('Cancelled') : t('Completed')}
                          </div>
                        )}
                      </div>
                      
                      {/* Address with proper truncation */}
                      <div className="flex items-start gap-1 text-sm text-gray-600 mb-2">
                        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-3 leading-relaxed">
                          {appointment.clinicAddress || t('Location not specified')}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-1">
                        {appointment.treatmentName || appointment.specialty}
                      </p>
                      {appointment.treatmentName && appointment.specialty && (
                        <p className="text-xs text-gray-400 mb-3">{appointment.specialty}</p>
                      )}
                      
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

                      {/* Action Buttons for Rescheduled Appointments */}
                      {selectedFilter === 'pending' && appointment.status === 'rescheduled' && (
                        <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-gray-200">
                          <Button 
                            onClick={() => handleApproveRescheduled(appointment)}
                            className="flex-1 bg-[#0C2243] hover:bg-[#0a1a35] text-white px-4 py-2 rounded-lg font-medium text-sm"
                          >
                            {t('Approve')}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => handleReschedule(appointment)}
                            className="flex-1 border-[#0C2243] text-[#0C2243] hover:bg-[#0C2243]/10 px-4 py-2 rounded-lg font-medium text-sm"
                          >
                            {t('Reschedule')}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => handleCancelAppointment(appointment)}
                            className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium text-sm"
                          >
                            {t('Cancel')}
                          </Button>
                        </div>
                      )}
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
                  alt={t('No appointments')}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-gray-500 text-lg font-medium mb-4">
                {selectedFilter === 'upcoming' && t('No upcoming appointments scheduled.')}
                {selectedFilter === 'pending' && t('No pending appointments.')}
                {selectedFilter === 'history' && t('No past appointments.')}
              </p>
              {(selectedFilter === 'upcoming' || selectedFilter === 'pending') && (
                <Button 
                  onClick={() => navigate('/')}
                  className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white rounded-full px-8 py-3 font-medium"
                >
                  {t('Book New Appointment')}
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

      {/* Reschedule Confirmation Modal */}
      <Dialog open={isRescheduleConfirmModalOpen} onOpenChange={setIsRescheduleConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl font-bold text-gray-900">
              {t('Event Rescheduled')}
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 mt-2">
              {t('The clinic has rescheduled your appointment. Please review the new date and time below and confirm if it works for you.')}
            </DialogDescription>
          </DialogHeader>

          {appointmentToReschedule && (
            <div className="mt-6 space-y-4">
              {/* Hospital Name */}
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{appointmentToReschedule.clinic}</h3>
              </div>

              {/* Location */}
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{appointmentToReschedule.clinicAddress || t('Location not specified')}</span>
              </div>

              {/* Treatment Type */}
              <div>
                <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                  {appointmentToReschedule.specialty || t('General Consultation')}
                </span>
              </div>

              {/* Time */}
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>{appointmentToReschedule.time}</span>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{format(new Date(appointmentToReschedule.date), 'd MMM, yyyy')}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200 mt-6">
                <Button
                  onClick={handleConfirmRescheduleFromModal}
                  variant="outline"
                  className="flex-1 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium"
                >
                  {t('Reschedule')}
                </Button>
                <Button
                  onClick={() => {
                    if (appointmentToReschedule) {
                      handleApproveRescheduled(appointmentToReschedule);
                      setIsRescheduleConfirmModalOpen(false);
                      setAppointmentToReschedule(null);
                    }
                  }}
                  className="flex-1 bg-[#0C2243] hover:bg-[#0a1a35] text-white px-6 py-2.5 rounded-lg font-medium"
                >
                  {t('Approve')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNavigation 
        viewMode="services" 
        onViewModeChange={() => {}} 
      />
    </div>
  );
};

export default MyBookings;