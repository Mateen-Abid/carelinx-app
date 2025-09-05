import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { useBooking, Appointment } from '@/contexts/BookingContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BookingModal } from '@/components/BookingModal';
import { MoreVertical, Calendar, X, Clock, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';

const MyBookings = () => {
  const { getUpcomingAppointments, getPendingAppointments, getPastAppointments, appointments, cancelAppointment } = useBooking();
  const navigate = useNavigate();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  
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

  const AppointmentCard = ({ appointment, showStatus = false, isUpcoming = false }: { 
    appointment: Appointment; 
    showStatus?: boolean; 
    isUpcoming?: boolean;
  }) => (
    <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 sm:gap-4">
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
                    onClick={() => handleCancelAppointment(appointment.id)}
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
      <section className="bg-white py-8 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600">View and manage all your scheduled appointments</p>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="py-8 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="pending">Pending ({pendingAppointments.length})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({upcomingAppointments.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <div className="space-y-4">
                {pendingAppointments.length > 0 ? (
                  pendingAppointments.map((appointment) => (
                    <Card key={appointment.id} className="p-6 bg-yellow-50 border-yellow-200">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900">{appointment.specialty}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{appointment.doctorName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{appointment.clinic}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                          Pending
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(appointment.date), 'MMMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.time}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCancelAppointment(appointment.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Cancel
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No pending appointments.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="upcoming">
              <div className="space-y-4">
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((appointment) => (
                    <Card key={appointment.id} className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900">{appointment.specialty}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{appointment.doctorName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{appointment.clinic}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          Confirmed
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(appointment.date), 'MMMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.time}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReschedule(appointment)}
                        >
                          Reschedule
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCancelAppointment(appointment.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Cancel
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No upcoming appointments.</p>
                    <Button className="mt-4" onClick={() => navigate('/')}>Book New Appointment</Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="past">
              <div className="space-y-4">
                {pastBookings.length > 0 ? (
                  pastBookings.map((appointment) => (
                    <Card key={appointment.id} className="p-6 opacity-75">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900">{appointment.specialty}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{appointment.doctorName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{appointment.clinic}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                          Completed
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(appointment.date), 'MMMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.time}</span>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No past appointments.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
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