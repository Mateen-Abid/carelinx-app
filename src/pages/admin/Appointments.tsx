import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, X, Check, Clock, Calendar, ChevronDown, Ban, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Appointment {
  id: string;
  user_id: string;
  patientName: string;
  patientEmail?: string;
  patientGender?: string;
  patientContact?: string;
  doctorName: string;
  service: string;
  clinic: string;
  date: string;
  time: string;
  appointment_date: string;
  appointment_time: string;
  status: 'approved' | 'cancelled' | 'pending' | 'completed';
  created_at: string;
  confirmed_at?: string;
  updated_at: string;
  note?: string;
}

const AdminAppointments = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState('All Clinics');
  const [appointmentsData, setAppointmentsData] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinics, setClinics] = useState<string[]>(['All Clinics']);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Filter modal states
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterDoctor, setFilterDoctor] = useState<string>('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('');
  const [doctors, setDoctors] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  
  // Appointment action modals
  const [isApproveConfirmModalOpen, setIsApproveConfirmModalOpen] = useState(false);
  const [isCancelConfirmModalOpen, setIsCancelConfirmModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [newAppointmentDate, setNewAppointmentDate] = useState<string>('');
  const [newAppointmentTime, setNewAppointmentTime] = useState<string>('');

  useEffect(() => {
    fetchAppointments();

    // Set up real-time subscription for bookings table
    const bookingsChannel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('🔄 Booking change detected:', payload.eventType);
          // Refresh appointments when bookings change
          fetchAppointments();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(bookingsChannel);
    };
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching ALL appointments from ALL clinics (super admin view)...');
      
      // Fetch ALL bookings from ALL clinics - no filtering by clinic_id or clinic name
      // Super admin can see appointments from every clinic in the database
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('❌ Error fetching bookings:', bookingsError);
        console.error('Error details:', JSON.stringify(bookingsError, null, 2));
        setAppointmentsData([]);
        return;
      }

      console.log('✅ ALL bookings fetched from database:', bookingsData?.length || 0, 'appointments from ALL clinics');
      
      // Log clinic distribution for debugging
      if (bookingsData && bookingsData.length > 0) {
        const clinicCounts = new Map<string, number>();
        bookingsData.forEach(booking => {
          const clinicName = booking.clinic || (booking.clinic_id ? `clinic_id:${booking.clinic_id}` : 'Unknown');
          clinicCounts.set(clinicName, (clinicCounts.get(clinicName) || 0) + 1);
        });
        console.log('📊 Appointments by clinic:', Object.fromEntries(clinicCounts));
      }

      // Fetch all profiles to map user_id to patient details
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
      } else {
        console.log('✅ Profiles fetched:', profilesData?.length || 0, 'profiles');
      }

      // Fetch all clinics to map clinic_id to clinic name
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select('id, name');

      if (clinicsError) {
        console.error('❌ Error fetching clinics:', clinicsError);
      } else {
        console.log('✅ Clinics fetched:', clinicsData?.length || 0, 'clinics');
      }

      // Fetch all doctors from ALL clinics to validate appointments
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('doctors')
        .select('id, name, clinic_id');

      if (doctorsError) {
        console.error('❌ Error fetching doctors:', doctorsError);
      } else {
        console.log('✅ Doctors fetched:', doctorsData?.length || 0, 'doctors from ALL clinics');
      }

      // Create maps for lookups
      const profileMap = new Map<string, any>();
      profilesData?.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      const clinicMap = new Map<string, string>();
      clinicsData?.forEach(clinic => {
        clinicMap.set(clinic.id, clinic.name);
      });

      // Create doctor maps for validation
      const doctorIdMap = new Set<string>();
      const doctorNameMap = new Set<string>();
      doctorsData?.forEach(doctor => {
        if (doctor.id) {
          doctorIdMap.add(doctor.id);
        }
        if (doctor.name) {
          // Normalize doctor name for comparison (case-insensitive, trimmed)
          doctorNameMap.add(doctor.name.trim().toLowerCase());
        }
      });

      console.log('📊 Doctor validation maps:', {
        doctorIds: doctorIdMap.size,
        doctorNames: doctorNameMap.size,
        sampleDoctorNames: Array.from(doctorNameMap).slice(0, 5)
      });

      // Extract unique clinics from bookings and clinics table
      const uniqueClinics = new Set<string>(['All Clinics']);
      
      // Add clinics from clinics table
      clinicsData?.forEach(clinic => {
        if (clinic.name) {
          uniqueClinics.add(clinic.name);
        }
      });
      
      // Add clinics from bookings (both clinic name and mapped from clinic_id)
      bookingsData?.forEach(booking => {
        if (booking.clinic) {
          uniqueClinics.add(booking.clinic);
        }
        // Also add clinic name if we have clinic_id
        if (booking.clinic_id && clinicMap.has(booking.clinic_id)) {
          uniqueClinics.add(clinicMap.get(booking.clinic_id)!);
        }
      });
      
      setClinics(Array.from(uniqueClinics).sort());

      // Transform bookings to appointments - handle both clinic_id and clinic name
      // Only include appointments where:
      // 1. We have a valid profile (real patients)
      // 2. The appointment is linked to a real clinic (clinic_id exists in clinics table)
      // 3. The appointment is linked to a real doctor (doctor_id or doctor_name matches a real doctor)
      const bookingsWithProfiles = (bookingsData || []).filter((booking: any) => {
        // Only include bookings that have a matching profile (real patients)
        const profile = profileMap.get(booking.user_id);
        if (!profile || !(profile.full_name || profile.email)) {
          return false;
        }

        // Only include bookings from real clinics (clinic_id exists in clinics table)
        if (booking.clinic_id && !clinicMap.has(booking.clinic_id)) {
          return false;
        }

        // Only include bookings linked to real doctors
        // Check by doctor_id first (most reliable)
        if (booking.doctor_id) {
          if (!doctorIdMap.has(booking.doctor_id)) {
            return false; // doctor_id doesn't match any real doctor
          }
        } else if (booking.doctor_name) {
          // If no doctor_id, check by doctor_name (normalized for comparison)
          const normalizedDoctorName = booking.doctor_name.trim().toLowerCase();
          if (!doctorNameMap.has(normalizedDoctorName)) {
            return false; // doctor_name doesn't match any real doctor
          }
        } else {
          // No doctor_id or doctor_name - skip this booking
          return false;
        }

        return true;
      });

      console.log('📊 Filtered appointments:', {
        totalBookings: bookingsData?.length || 0,
        bookingsWithProfiles: bookingsWithProfiles.length,
        filteredOut: (bookingsData?.length || 0) - bookingsWithProfiles.length,
        reason: 'Only showing appointments with real patients, real clinics, and real doctors'
      });

      // Extract unique doctors and specialties for filter dropdowns
      // Only from real doctors and filtered appointments
      const uniqueDoctors = new Set<string>(['']);
      const uniqueSpecialties = new Set<string>(['']);
      
      // Use filtered appointments instead of all bookings
      bookingsWithProfiles.forEach(booking => {
        if (booking.doctor_name) {
          uniqueDoctors.add(booking.doctor_name);
        }
        if (booking.specialty) {
          uniqueSpecialties.add(booking.specialty);
        }
      });
      
      setDoctors(Array.from(uniqueDoctors).filter(Boolean).sort());
      setSpecialties(Array.from(uniqueSpecialties).filter(Boolean).sort());

      const appointments: Appointment[] = bookingsWithProfiles.map((booking: any) => {
        const profile = profileMap.get(booking.user_id);
        const patientName = profile?.full_name || profile?.email || 'Unknown Patient';
        
        // Get clinic name - prefer from clinic_id mapping, fallback to clinic field
        let clinicName = booking.clinic || 'Unknown Clinic';
        if (booking.clinic_id && clinicMap.has(booking.clinic_id)) {
          clinicName = clinicMap.get(booking.clinic_id)!;
        }
        
        // Format date - same as public app
        const appointmentDate = new Date(booking.appointment_date);
        const formattedDate = appointmentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Format time - same as public app
        const timeStr = booking.appointment_time;
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        const formattedTime = `${displayHour}:${minutes} ${period}`;

        // Map status: 'confirmed' -> 'approved', 'cancelled' -> 'cancelled', 'pending' -> 'pending', 'completed' -> 'completed', 'rescheduled' -> 'pending'
        let status: Appointment['status'] = 'pending';
        if (booking.status === 'confirmed') {
          status = 'approved';
        } else if (booking.status === 'cancelled') {
          status = 'cancelled';
        } else if (booking.status === 'pending') {
          status = 'pending';
        } else if (booking.status === 'completed') {
          status = 'completed';
        } else if (booking.status === 'rescheduled') {
          // Rescheduled appointments show as pending for super admin
          status = 'pending';
        }

        return {
          id: booking.id,
          user_id: booking.user_id,
          patientName: patientName,
          patientEmail: profile?.email || '',
          patientGender: profile?.gender || profile?.sex || 'N/A',
          patientContact: profile?.phone || profile?.contact || profile?.phone_number || 'N/A',
          doctorName: booking.doctor_name || 'Unknown Doctor',
          service: booking.specialty || 'Unknown Service',
          clinic: clinicName,
          date: formattedDate,
          time: formattedTime,
          appointment_date: booking.appointment_date,
          appointment_time: booking.appointment_time,
          status: status,
          created_at: booking.created_at,
          confirmed_at: booking.confirmed_at || undefined,
          updated_at: booking.updated_at,
          note: booking.note || booking.notes || booking.comment || '',
        };
      });

      console.log('📊 Appointments processed:', appointments.length);
      setAppointmentsData(appointments);
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
      setAppointmentsData([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter appointments based on status, search, clinic, and filter modal options
  const filteredAppointments = appointmentsData.filter((appointment) => {
    // Status filter
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    
    // Search filter
    const matchesSearch =
      searchQuery === '' ||
      appointment.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.clinic.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Clinic filter
    const matchesClinic = selectedClinic === 'All Clinics' || appointment.clinic === selectedClinic;
    
    // Date filter from filter modal
    let matchesDate = true;
    if (filterDate) {
      const appointmentDateStr = new Date(appointment.appointment_date).toISOString().split('T')[0];
      matchesDate = appointmentDateStr === filterDate;
    }
    
    // Doctor filter from filter modal
    const matchesDoctor = !filterDoctor || filterDoctor === 'all' || appointment.doctorName === filterDoctor;
    
    // Specialty filter from filter modal
    const matchesSpecialty = !filterSpecialty || filterSpecialty === 'all' || appointment.service === filterSpecialty;
    
    return matchesStatus && matchesSearch && matchesClinic && matchesDate && matchesDoctor && matchesSpecialty;
  });

  const handleSelectAppointment = (appointmentId: string) => {
    setSelectedAppointments((prev) =>
      prev.includes(appointmentId) ? prev.filter((id) => id !== appointmentId) : [...prev, appointmentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAppointments.length === filteredAppointments.length) {
      setSelectedAppointments([]);
    } else {
      setSelectedAppointments(filteredAppointments.map((appointment) => appointment.id));
    }
  };

  const getStatusBadge = (status: Appointment['status']) => {
    const statusConfig = {
      approved: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: Check,
        label: 'Approved',
      },
      cancelled: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: X,
        label: 'Cancelled',
      },
      pending: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        icon: Clock,
        label: 'Pending',
      },
      completed: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: Check,
        label: 'Completed',
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };


  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`}>
        <AdminSidebar isDarkMode={isDarkMode} onDarkModeToggle={toggleDarkMode} />
        
        <main className="flex-1 bg-[#F7F7F7] dark:bg-gray-900 min-h-screen overflow-y-auto">
          <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Appointments</h1>
              <div className="flex items-center gap-3">
                {/* Clinic Selection Dropdown */}
                <Select value={selectedClinic} onValueChange={setSelectedClinic}>
                  <SelectTrigger className="w-[200px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                    <SelectValue placeholder="All Clinics" />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((clinic) => (
                      <SelectItem key={clinic} value={clinic}>
                        {clinic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  onClick={() => setIsFilterModalOpen(true)}
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search by patient, doctor, or service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-full h-10"
                />
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="mb-6 flex items-center gap-2">
              {(['all', 'pending', 'approved', 'completed', 'cancelled'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-[#00FFA2] text-[#0C2243]'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Appointments Table */}
            {loading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-[#0C2243] border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="text-left py-4 px-6">
                        <input
                          type="checkbox"
                          checked={selectedAppointments.length === filteredAppointments.length && filteredAppointments.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                        />
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Patient Name</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Doctor's Name</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Service</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-1">
                          Date & Time
                          <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </div>
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.length > 0 ? (
                      filteredAppointments.map((appointment) => (
                      <tr
                        key={appointment.id}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <input
                            type="checkbox"
                            checked={selectedAppointments.includes(appointment.id)}
                            onChange={() => handleSelectAppointment(appointment.id)}
                            className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{appointment.patientName}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{appointment.doctorName}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{appointment.service}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{appointment.date}, {appointment.time}</span>
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(appointment.status)}
                        </td>
                        <td className="py-4 px-6">
                          <Button
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowDetailsModal(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white border-0 text-xs px-4 py-2 rounded-lg"
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No appointments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </main>

        {/* Filter Modal */}
        <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Filter</DialogTitle>
              <DialogDescription className="sr-only">
                Filter appointments by date, doctor, or specialty
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Date Input */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Date :</label>
                <div className="relative flex-1">
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg h-10 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Doctor Dropdown */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Doctor :</label>
                <Select value={filterDoctor || 'all'} onValueChange={(value) => setFilterDoctor(value === 'all' ? '' : value)}>
                  <SelectTrigger className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg h-10 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select a doctor's name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor} value={doctor}>
                        {doctor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Specialty Dropdown */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Specialty :</label>
                <Select value={filterSpecialty || 'all'} onValueChange={(value) => setFilterSpecialty(value === 'all' ? '' : value)}>
                  <SelectTrigger className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-lg h-10 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specialties</SelectItem>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterDate('');
                    setFilterDoctor('');
                    setFilterSpecialty('');
                    setIsFilterModalOpen(false);
                  }}
                  className="flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
                >
                  Clear filters
                </Button>
                <Button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="flex-1 bg-[#0C2243] hover:bg-[#0C2243]/90 text-white"
                >
                  Apply filters
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Appointment Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Appointment Details</DialogTitle>
            </DialogHeader>
            {selectedAppointment && (
              <div className="space-y-6 py-4">
                {/* Patient Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase">Patient Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500 text-xs">Name</Label>
                      <p className="mt-1 text-sm font-medium">{selectedAppointment.patientName}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Gender</Label>
                      <p className="mt-1 text-sm">{selectedAppointment.patientGender || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Contact</Label>
                      <p className="mt-1 text-sm">{selectedAppointment.patientContact || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Email</Label>
                      <p className="mt-1 text-sm">{selectedAppointment.patientEmail || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Doctor Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase">Doctor Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500 text-xs">Doctor Name</Label>
                      <p className="mt-1 text-sm font-medium">{selectedAppointment.doctorName}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Specialty</Label>
                      <p className="mt-1 text-sm">{selectedAppointment.service}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Service</Label>
                      <p className="mt-1 text-sm">{selectedAppointment.service}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Availability</Label>
                      <p className="mt-1 text-sm">9:00 AM - 5:00 PM</p>
                    </div>
                  </div>
                </div>

                {/* Appointment Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase">Appointment Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-500 text-xs">Date & Time</Label>
                      <p className="mt-1 text-sm font-medium">
                        {new Date(selectedAppointment.appointment_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}, {selectedAppointment.time}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Status</Label>
                      <div className="mt-1">
                        {getStatusBadge(selectedAppointment.status)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Duration</Label>
                      <p className="mt-1 text-sm">30 minutes</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Clinic</Label>
                      <p className="mt-1 text-sm">{selectedAppointment.clinic}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500 text-xs">Created At</Label>
                      <p className="mt-1 text-sm">
                        {new Date(selectedAppointment.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {selectedAppointment.confirmed_at && (
                      <div>
                        <Label className="text-gray-500 text-xs">Confirmed At</Label>
                        <p className="mt-1 text-sm">
                          {new Date(selectedAppointment.confirmed_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Note Section */}
                <div>
                  <Label className="text-gray-500 text-xs mb-2 block">Note</Label>
                  <Textarea
                    value={selectedAppointment.note || 'No notes available'}
                    readOnly
                    className="bg-gray-50 border-gray-200 min-h-[80px]"
                    placeholder="No notes available"
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCancelConfirmModalOpen(true);
                }}
                className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
              >
                <Ban className="w-4 h-4 mr-2" />
                Cancel Appointment
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedAppointment) {
                    // Set initial values to current appointment date/time
                    setNewAppointmentDate(selectedAppointment.appointment_date);
                    setNewAppointmentTime(selectedAppointment.appointment_time);
                    setIsRescheduleModalOpen(true);
                  }
                }}
                className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reschedule
              </Button>
              <Button
                onClick={() => {
                  setIsApproveConfirmModalOpen(true);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Approve Appointment
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approve Appointment Confirmation Modal */}
        <Dialog open={isApproveConfirmModalOpen} onOpenChange={setIsApproveConfirmModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Approve Appointment</DialogTitle>
              <DialogDescription className="sr-only">
                Confirm approval of this appointment
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to approve this appointment? The patient will see it in their upcoming appointments.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsApproveConfirmModalOpen(false)}
                className="border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedAppointment) return;

                  try {
                    console.log('🔄 Super Admin approving appointment:', selectedAppointment.id);
                    const { error } = await supabase
                      .from('bookings')
                      .update({ 
                        status: 'confirmed',
                        confirmed_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', selectedAppointment.id);

                    if (error) {
                      console.error('❌ Error approving appointment:', error);
                      toast.error('Error approving appointment: ' + error.message);
                    } else {
                      console.log('✅ Appointment approved successfully');
                      toast.success('Appointment approved successfully. Patient will see it in upcoming appointments.');
                      setIsApproveConfirmModalOpen(false);
                      setShowDetailsModal(false);
                      setSelectedAppointment(null);
                      await fetchAppointments(); // Refresh the list
                    }
                  } catch (error) {
                    console.error('❌ Error approving appointment:', error);
                    toast.error('Error approving appointment');
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Approve
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Appointment Confirmation Modal */}
        <Dialog open={isCancelConfirmModalOpen} onOpenChange={setIsCancelConfirmModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Cancel Appointment</DialogTitle>
              <DialogDescription className="sr-only">
                Confirm cancellation of this appointment
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to cancel this appointment? The patient will see it as cancelled in their appointments.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsCancelConfirmModalOpen(false)}
                className="border-gray-300 dark:border-gray-600"
              >
                No, Keep It
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedAppointment) return;

                  try {
                    console.log('🔄 Super Admin cancelling appointment:', selectedAppointment.id);
                    const { error } = await supabase
                      .from('bookings')
                      .update({ 
                        status: 'cancelled',
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', selectedAppointment.id);

                    if (error) {
                      console.error('❌ Error cancelling appointment:', error);
                      toast.error('Error cancelling appointment: ' + error.message);
                    } else {
                      console.log('✅ Appointment cancelled successfully');
                      toast.success('Appointment cancelled successfully. Patient will see it as cancelled.');
                      setIsCancelConfirmModalOpen(false);
                      setShowDetailsModal(false);
                      setSelectedAppointment(null);
                      await fetchAppointments(); // Refresh the list
                    }
                  } catch (error) {
                    console.error('❌ Error cancelling appointment:', error);
                    toast.error('Error cancelling appointment');
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reschedule Appointment Modal */}
        <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Reschedule Appointment</DialogTitle>
              <DialogDescription className="sr-only">
                Select new date and time for this appointment
              </DialogDescription>
            </DialogHeader>
            {selectedAppointment && (
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="reschedule-date" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    New Date
                  </Label>
                  <div className="relative">
                    <Calendar 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 cursor-pointer z-10" 
                      onClick={() => {
                        const dateInput = document.getElementById('reschedule-date') as HTMLInputElement;
                        dateInput?.showPicker?.() || dateInput?.click();
                      }}
                    />
                    <Input
                      id="reschedule-date"
                      type="date"
                      value={newAppointmentDate}
                      onChange={(e) => setNewAppointmentDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border-gray-300 dark:border-gray-600 rounded-lg h-10 pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="reschedule-time" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    New Time
                  </Label>
                  <div className="relative">
                    <Clock 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 cursor-pointer z-10" 
                      onClick={() => {
                        const timeInput = document.getElementById('reschedule-time') as HTMLInputElement;
                        timeInput?.showPicker?.() || timeInput?.click();
                      }}
                    />
                    <Input
                      id="reschedule-time"
                      type="time"
                      value={newAppointmentTime}
                      onChange={(e) => setNewAppointmentTime(e.target.value)}
                      className="w-full border-gray-300 dark:border-gray-600 rounded-lg h-10 pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                    />
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> The appointment will be marked as "rescheduled" and the patient will need to approve the new date and time.
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRescheduleModalOpen(false);
                  setNewAppointmentDate('');
                  setNewAppointmentTime('');
                }}
                className="border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedAppointment) return;

                  if (!newAppointmentDate || !newAppointmentTime) {
                    toast.error('Please select both date and time');
                    return;
                  }

                  try {
                    console.log('🔄 Super Admin rescheduling appointment:', selectedAppointment.id);
                    const { error } = await supabase
                      .from('bookings')
                      .update({ 
                        appointment_date: newAppointmentDate,
                        appointment_time: newAppointmentTime,
                        status: 'rescheduled',
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', selectedAppointment.id);

                    if (error) {
                      console.error('❌ Error rescheduling appointment:', error);
                      toast.error('Error rescheduling appointment: ' + error.message);
                    } else {
                      console.log('✅ Appointment rescheduled successfully');
                      toast.success('Appointment rescheduled successfully. Patient will see it in pending appointments.');
                      setIsRescheduleModalOpen(false);
                      setShowDetailsModal(false);
                      setNewAppointmentDate('');
                      setNewAppointmentTime('');
                      setSelectedAppointment(null);
                      await fetchAppointments(); // Refresh the list
                    }
                  } catch (error) {
                    console.error('❌ Error rescheduling appointment:', error);
                    toast.error('Error rescheduling appointment');
                  }
                }}
                className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white"
              >
                Confirm Reschedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default AdminAppointments;

