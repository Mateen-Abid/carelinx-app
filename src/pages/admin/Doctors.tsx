import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Filter, X, Info, Eye, Trash2, MoreVertical } from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  availability: string;
  contact: string;
  status: 'active' | 'inactive' | 'on-leave';
  clinic_id: string;
  clinic_name?: string;
  email?: string | null;
  phone?: string | null;
  services?: string | null;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  clinic?: string;
  clinics?: { name: string };
  status: string;
  doctor_name?: string;
}

const AdminDoctors = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'on-leave'>('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [isSpecialtyModalOpen, setIsSpecialtyModalOpen] = useState(false);
  const [doctorsData, setDoctorsData] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isDoctorDetailsModalOpen, setIsDoctorDetailsModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [doctorAppointments, setDoctorAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [deletingDoctor, setDeletingDoctor] = useState(false);

  useEffect(() => {
    fetchDoctors();

    // Set up real-time subscription for doctors table
    const doctorsChannel = supabase
      .channel('doctors-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'doctors',
        },
        (payload) => {
          console.log('🔄 Doctor change detected:', payload.eventType);
          // Refresh doctors when doctors table changes
          fetchDoctors();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(doctorsChannel);
    };
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching ALL doctors from ALL clinics (super admin view)...');
      
      // Fetch ALL doctors from ALL clinics - super admin can see all doctors
      const { data: doctorsData, error: doctorsError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('doctors' as any)
        .select('*')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .order('name', { ascending: true }) as any);

      if (doctorsError) {
        console.error('❌ Error fetching doctors:', doctorsError);
        setDoctorsData([]);
        return;
      }

      console.log('✅ Doctors fetched from database:', doctorsData?.length || 0, 'doctors from ALL clinics');

      // Fetch all clinics to map clinic_id to clinic name
      const { data: clinicsData, error: clinicsError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('clinics' as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select('id, name') as any);

      if (clinicsError) {
        console.error('❌ Error fetching clinics:', clinicsError);
      } else {
        console.log('✅ Clinics fetched:', clinicsData?.length || 0, 'clinics');
      }

      // Create clinic map
      const clinicMap = new Map<string, string>();
      clinicsData?.forEach(clinic => {
        clinicMap.set(clinic.id, clinic.name);
      });

      // Extract unique specialties
      const specialtiesSet = new Set<string>(['All']);
      doctorsData?.forEach(doctor => {
        if (doctor.specialty) {
          specialtiesSet.add(doctor.specialty);
        }
      });

      // Transform doctors data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doctors: Doctor[] = ((doctorsData || []) as any[]).map((doctor: any) => {
        const clinicName = clinicMap.get(doctor.clinic_id) || 'Unknown Clinic';
        
        return {
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty || 'General',
          availability: doctor.availability || '9:00 AM - 5:00 PM',
          contact: doctor.phone || doctor.email || 'N/A',
          status: (doctor.status || 'active') as 'active' | 'inactive' | 'on-leave',
          clinic_id: doctor.clinic_id,
          clinic_name: clinicName,
          email: doctor.email,
          phone: doctor.phone,
          services: doctor.services || null,
        };
      });

      console.log('📊 Doctors processed:', doctors.length);
      console.log('🏥 Specialties found:', Array.from(specialtiesSet));
      console.log('📋 Doctors by clinic:', doctors.reduce((acc, d) => {
        acc[d.clinic_name || 'Unknown'] = (acc[d.clinic_name || 'Unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));

      setDoctorsData(doctors);
      setSpecialties(Array.from(specialtiesSet).sort());
    } catch (error) {
      console.error('❌ Error fetching doctors:', error);
      setDoctorsData([]);
    } finally {
      setLoading(false);
    }
  };


  // Filter doctors based on status and specialty
  const filteredDoctors = doctorsData.filter((doctor) => {
    const matchesStatus = statusFilter === 'all' || doctor.status === statusFilter;
    const matchesSpecialty = selectedSpecialty === 'all' || doctor.specialty === selectedSpecialty;
    return matchesStatus && matchesSpecialty;
  });

  const handleSelectDoctor = (doctorId: string) => {
    setSelectedDoctors((prev) =>
      prev.includes(doctorId) ? prev.filter((id) => id !== doctorId) : [...prev, doctorId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDoctors.length === filteredDoctors.length) {
      setSelectedDoctors([]);
    } else {
      setSelectedDoctors(filteredDoctors.map((doctor) => doctor.id));
    }
  };

  const getStatusBadge = (status: Doctor['status']) => {
    const statusConfig = {
      active: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Active',
      },
      inactive: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        label: 'Inactive',
      },
      'on-leave': {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'On Leave',
      },
    };

    const config = statusConfig[status];

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  const handleViewDoctorDetails = async (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsDoctorDetailsModalOpen(true);
    setLoadingAppointments(true);

    try {
      // Fetch appointments for this doctor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: appointments, error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('bookings' as any)
        .select('*')
        .eq('doctor_name', doctor.name)
        .order('appointment_date', { ascending: false })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .limit(10) as any);

      if (error) {
        console.error('Error fetching appointments:', error);
      } else {
        setDoctorAppointments((appointments as Appointment[]) || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoadingAppointments(false);
    }
  };


  const handleDeleteDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsDeleteConfirmModalOpen(true);
  };

  const handleConfirmDeleteDoctor = async () => {
    if (!selectedDoctor) return;

    setDeletingDoctor(true);
    try {
      const { error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('doctors' as any)
        .delete()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq('id', selectedDoctor.id)) as any;

      if (error) {
        console.error('Error deleting doctor:', error);
        toast.error('Failed to delete doctor: ' + error.message);
        return;
      }

      toast.success('Doctor deleted successfully');
      setIsDeleteConfirmModalOpen(false);
      setSelectedDoctor(null);
      fetchDoctors();
    } catch (error) {
      console.error('Error deleting doctor:', error);
      toast.error('Failed to delete doctor');
    } finally {
      setDeletingDoctor(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`}>
        <AdminSidebar isDarkMode={isDarkMode} onDarkModeToggle={toggleDarkMode} />
        
        <main className="flex-1 bg-[#F7F7F7] dark:bg-gray-900 min-h-screen overflow-y-auto">
          <div className="p-8">
            {/* Page Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Doctors</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Doctor's List</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsSpecialtyModalOpen(true)}
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Specialty
                </Button>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="mb-6 flex items-center gap-2">
              {(['all', 'active', 'on-leave', 'inactive'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-[#00FFA2] text-[#0C2243]'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {status === 'on-leave' ? 'On Leave' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Doctors Table */}
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
                          checked={selectedDoctors.length === filteredDoctors.length && filteredDoctors.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                        />
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Doctor's Name</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Clinic</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Specialty</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Availability</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Contact</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDoctors.length > 0 ? (
                      filteredDoctors.map((doctor) => (
                      <tr
                        key={doctor.id}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <input
                            type="checkbox"
                            checked={selectedDoctors.includes(doctor.id)}
                            onChange={() => handleSelectDoctor(doctor.id)}
                            className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{doctor.name}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{doctor.clinic_name || 'Unknown Clinic'}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{doctor.specialty}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{doctor.availability}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{doctor.contact}</span>
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(doctor.status)}
                        </td>
                        <td className="py-4 px-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="text-gray-600 dark:text-gray-400 hover:text-[#0C2243] dark:hover:text-[#00FFA2] transition-colors"
                                aria-label="View doctor actions"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => handleViewDoctorDetails(doctor)}
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400"
                                onClick={() => handleDeleteDoctor(doctor)}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Doctor
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No doctors found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </main>

        {/* Specialty Filter Modal */}
        <Dialog open={isSpecialtyModalOpen} onOpenChange={setIsSpecialtyModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Specialty</DialogTitle>
            </DialogHeader>
            <div className="mt-6">
              {/* Specialty Buttons Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {specialties.map((specialty) => (
                  <button
                    key={specialty}
                    onClick={() => setSelectedSpecialty(specialty.toLowerCase() === 'all' ? 'all' : specialty)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      (selectedSpecialty === 'all' && specialty === 'All') ||
                      (selectedSpecialty === specialty && specialty !== 'All')
                        ? 'bg-[#00FFA2] text-[#0C2243]'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {specialty}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedSpecialty('all');
                    setIsSpecialtyModalOpen(false);
                  }}
                  className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-700"
                >
                  Clear filters
                </Button>
                <Button
                  onClick={() => setIsSpecialtyModalOpen(false)}
                  className="flex-1 bg-[#0C2243] hover:bg-[#0C2243]/90 text-white"
                >
                  Apply filters
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Doctor Details Modal */}
        <Dialog open={isDoctorDetailsModalOpen} onOpenChange={setIsDoctorDetailsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Doctor Details</DialogTitle>
              <DialogDescription className="sr-only">
                View detailed information about the doctor
              </DialogDescription>
            </DialogHeader>
            {selectedDoctor && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">Name</Label>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{selectedDoctor.name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">Specialty</Label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedDoctor.specialty}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">Clinic</Label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedDoctor.clinic_name || 'Unknown Clinic'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedDoctor.status)}</div>
                  </div>
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">Email</Label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedDoctor.email || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">Phone</Label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedDoctor.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">Availability</Label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedDoctor.availability}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400 text-xs">Services</Label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedDoctor.services || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-500 dark:text-gray-400 text-xs mb-2 block">Appointment History</Label>
                  {loadingAppointments ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                  ) : doctorAppointments.length > 0 ? (
                    <div className="space-y-2">
                      {doctorAppointments.map((apt) => (
                        <div key={apt.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{apt.clinic || apt.clinics?.name || 'Unknown Clinic'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(apt.appointment_date).toLocaleDateString()} at {apt.appointment_time}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Status: {apt.status}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No appointment history</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteConfirmModalOpen} onOpenChange={setIsDeleteConfirmModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Delete Doctor</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this doctor? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedDoctor && (
              <div className="py-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Doctor: <span className="font-semibold text-gray-900 dark:text-white">{selectedDoctor.name}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Clinic: <span className="font-semibold text-gray-900 dark:text-white">{selectedDoctor.clinic_name || 'Unknown'}</span>
                </p>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteConfirmModalOpen(false)}
                disabled={deletingDoctor}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDeleteDoctor}
                disabled={deletingDoctor}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deletingDoctor ? 'Deleting...' : 'Delete Doctor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDoctors;

