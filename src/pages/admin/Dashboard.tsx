import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useNavigate } from 'react-router-dom';
import { X, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Clinic {
  id: string;
  name: string;
  email: string;
  address: string;
  contact_phone?: string;
  contact_email?: string;
  website?: string;
  logo_url?: string;
  description?: string;
  specialties: string[];
  status: 'active' | 'pending' | 'suspended';
  plan_type?: string;
  registration_date: string;
  created_at: string;
  updated_at: string;
  suspended_reason?: string;
  clinic_admin_id?: string;
}

const AdminDashboard = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'today' | 'tomorrow' | 'this-week' | 'all-time'>('all-time');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended' | null>(null);
  const [stats, setStats] = useState({
    totalClinics: 0,
    activeClinics: 0,
    pendingApproval: 0,
    suspendedClinics: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
  });
  const [recentClinics, setRecentClinics] = useState<Clinic[]>([]);
  const [allClinics, setAllClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicStats, setClinicStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time subscription for clinics table
    const clinicsChannel = supabase
      .channel('clinics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clinics',
        },
        (payload) => {
          console.log('🔄 Clinic change detected:', payload.eventType);
          // Refresh dashboard data when clinics change
          fetchDashboardData();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(clinicsChannel);
    };
  }, [selectedTimeFilter, selectedStatusFilter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching dashboard data...');
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Authentication error:', authError);
        return;
      }
      console.log('✅ User authenticated:', user.id, user.email);
      
      // Fetch all clinics from clinics table
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false });

      if (clinicsError) {
        console.error('❌ Error fetching clinics:', clinicsError);
        setStats({
          totalClinics: 0,
          activeClinics: 0,
          pendingApproval: 0,
          suspendedClinics: 0,
          totalDoctors: 0,
          totalPatients: 0,
          totalAppointments: 0,
        });
        setRecentClinics([]);
        setAllClinics([]);
        setLoading(false);
        return;
      }

      console.log('✅ Clinics fetched:', clinicsData?.length || 0);

      // Transform clinics data
      const clinics: Clinic[] = (clinicsData || []).map((clinic: any) => ({
        id: clinic.id,
        name: clinic.name,
        email: clinic.email,
        address: clinic.address,
        contact_phone: clinic.contact_phone,
        contact_email: clinic.contact_email,
        website: clinic.website,
        logo_url: clinic.logo_url,
        description: clinic.description,
        specialties: clinic.specialties || [],
        status: clinic.status,
        plan_type: clinic.plan_type,
        registration_date: clinic.registration_date || clinic.created_at,
        created_at: clinic.created_at,
        updated_at: clinic.updated_at,
        suspended_reason: clinic.suspended_reason,
        clinic_admin_id: clinic.clinic_admin_id,
      }));

      setAllClinics(clinics);

      // Calculate stats
      const totalClinics = clinics.length;
      const activeClinics = clinics.filter(c => c.status === 'active').length;
      const pendingClinics = clinics.filter(c => c.status === 'pending').length;
      const suspendedClinics = clinics.filter(c => c.status === 'suspended').length;

      // Fetch additional statistics
      const { count: totalPatients } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'patient');

      const { count: totalAppointments } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // Get total doctors from doctors table
      const { count: totalDoctors } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalClinics: totalClinics || 0,
        activeClinics: activeClinics || 0,
        pendingApproval: pendingClinics || 0,
        suspendedClinics: suspendedClinics || 0,
        totalDoctors: totalDoctors || 0,
        totalPatients: totalPatients || 0,
        totalAppointments: totalAppointments || 0,
      });

      // Filter clinics based on date filter and status filter
      let filteredClinics = [...clinics];

      // Apply status filter
      if (selectedStatusFilter === 'all') {
        // Show all clinics (no filter)
        filteredClinics = filteredClinics;
      } else if (selectedStatusFilter === 'active') {
        filteredClinics = filteredClinics.filter(c => c.status === 'active');
      } else if (selectedStatusFilter === 'pending') {
        filteredClinics = filteredClinics.filter(c => c.status === 'pending');
      } else if (selectedStatusFilter === 'suspended') {
        filteredClinics = filteredClinics.filter(c => c.status === 'suspended');
      }

      // Apply date filter
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

      filteredClinics = filteredClinics.filter(clinic => {
        const clinicDate = new Date(clinic.created_at);
        
        if (selectedTimeFilter === 'today') {
          return clinicDate >= today && clinicDate < tomorrow;
        } else if (selectedTimeFilter === 'tomorrow') {
          return clinicDate >= tomorrow && clinicDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
        } else if (selectedTimeFilter === 'this-week') {
          return clinicDate >= thisWeekStart;
        } else {
          // all-time
          return true;
        }
      });

      // Sort by creation date (most recent first) and limit to 10
      filteredClinics.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setRecentClinics(filteredClinics.slice(0, 10));
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setStats({
        totalClinics: 0,
        activeClinics: 0,
        pendingApproval: 0,
        suspendedClinics: 0,
        totalDoctors: 0,
        totalPatients: 0,
        totalAppointments: 0,
      });
      setRecentClinics([]);
      setAllClinics([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${month} ${day}, ${displayHours}:${displayMinutes} ${period}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const fetchClinicStats = async (clinic: Clinic) => {
    try {
      setLoadingStats(true);
      console.log('📊 Fetching stats for clinic:', clinic.id, clinic.name);

      const clinicId = clinic.id;
      const clinicName = clinic.name;

      // Fetch total doctors for this clinic
      const { count: totalDoctors, error: doctorsError } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId);

      if (doctorsError) {
        console.error('❌ Error fetching doctors count:', doctorsError);
      }

      // Fetch total appointments for this clinic
      // First try by clinic_id
      const { count: appointmentsByClinicId, error: appointmentsErrorById } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId);

      // Also fetch by clinic name for NULL clinic_id bookings
      let appointmentsByClinicName = 0;
      if (clinicName) {
        const { count: countByName, error: appointmentsErrorByName } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .is('clinic_id', null)
          .ilike('clinic', clinicName);

        if (!appointmentsErrorByName && countByName) {
          appointmentsByClinicName = countByName;
        }
      }

      const totalAppointments = (appointmentsByClinicId || 0) + appointmentsByClinicName;

      // Fetch total patients (unique users who have booked with this clinic)
      // First get bookings by clinic_id
      const { data: bookingsByClinicId, error: bookingsErrorById } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('clinic_id', clinicId);

      // Also get bookings by clinic name for NULL clinic_id
      let bookingsByClinicName: any[] = [];
      if (clinicName) {
        const { data: bookingsByName, error: bookingsErrorByName } = await supabase
          .from('bookings')
          .select('user_id')
          .is('clinic_id', null)
          .ilike('clinic', clinicName);

        if (!bookingsErrorByName && bookingsByName) {
          bookingsByClinicName = bookingsByName;
        }
      }

      // Combine both sets and get unique user_ids
      const allBookings = [...(bookingsByClinicId || []), ...bookingsByClinicName];
      const uniqueUserIds = new Set(allBookings.map(b => b.user_id).filter(Boolean));
      const totalPatients = uniqueUserIds.size;

      setClinicStats({
        totalDoctors: totalDoctors || 0,
        totalPatients: totalPatients || 0,
        totalAppointments: totalAppointments || 0,
      });

      console.log('✅ Clinic stats:', {
        totalDoctors: totalDoctors || 0,
        totalPatients: totalPatients || 0,
        totalAppointments: totalAppointments || 0,
      });
    } catch (error) {
      console.error('❌ Error fetching clinic stats:', error);
      setClinicStats({
        totalDoctors: 0,
        totalPatients: 0,
        totalAppointments: 0,
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleViewDetails = async (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setShowDetailsModal(true);
    // Fetch stats when modal opens
    await fetchClinicStats(clinic);
  };

  const handleStatusCardClick = (status: 'all' | 'active' | 'pending' | 'suspended') => {
    setSelectedStatusFilter(status);
    // Also set time filter to all-time to show all clinics of that status
    setSelectedTimeFilter('all-time');
  };

  const handleClearStatusFilter = () => {
    setSelectedStatusFilter(null);
  };

  const timeFilters = [
    { id: 'today', label: 'Today' },
    { id: 'tomorrow', label: 'Tomorrow' },
    { id: 'this-week', label: 'This week' },
    { id: 'all-time', label: 'All time' },
  ];

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`}>
        <AdminSidebar 
          isDarkMode={isDarkMode} 
          onDarkModeToggle={toggleDarkMode} 
        />
        
        <main className="flex-1 bg-[#F7F7F7] dark:bg-gray-900 min-h-screen overflow-y-auto">
          <div className="p-8">
            {/* Page Title */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Dashboard</h1>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-16 h-16 border-4 border-[#0C2243] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* Quick Stats Section */}
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Clinics Card */}
                    <div 
                      onClick={() => handleStatusCardClick('all')}
                      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${
                        selectedStatusFilter === 'all' ? 'ring-2 ring-[#00FFA2] cursor-pointer' : 'cursor-pointer hover:shadow-md transition-shadow'
                      }`}
                    >
                      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Clinics</h3>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stats.totalClinics}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">All registered clinics across the platform.</p>
                    </div>

                    {/* Active Clinics Card */}
                    <div 
                      onClick={() => handleStatusCardClick('active')}
                      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${
                        selectedStatusFilter === 'active' ? 'ring-2 ring-[#00FFA2] cursor-pointer' : 'cursor-pointer hover:shadow-md transition-shadow'
                      }`}
                    >
                      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Active Clinics</h3>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stats.activeClinics}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Currently operational and visible to patients.</p>
                    </div>

                    {/* Pending Approval Card */}
                    <div 
                      onClick={() => handleStatusCardClick('pending')}
                      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${
                        selectedStatusFilter === 'pending' ? 'ring-2 ring-[#00FFA2] cursor-pointer' : 'cursor-pointer hover:shadow-md transition-shadow'
                      }`}
                    >
                      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Pending Approval</h3>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stats.pendingApproval}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Awaiting verification or setup completion.</p>
                    </div>

                    {/* Suspended Clinics Card */}
                    <div 
                      onClick={() => handleStatusCardClick('suspended')}
                      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${
                        selectedStatusFilter === 'suspended' ? 'ring-2 ring-[#00FFA2] cursor-pointer' : 'cursor-pointer hover:shadow-md transition-shadow'
                      }`}
                    >
                      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Suspended Clinics</h3>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stats.suspendedClinics}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Temporarily deactivated by Carelinx admin.</p>
                    </div>
                  </div>
                </div>

                {/* Recently Added Clinics Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recently Added Clinics</h2>
                      {selectedStatusFilter && (
                        <button
                          onClick={handleClearStatusFilter}
                          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                        >
                          Clear filter
                        </button>
                      )}
                    </div>
                    
                    {/* Time Filter Pills */}
                    <div className="flex items-center gap-2">
                      {timeFilters.map((filter) => (
                        <button
                          key={filter.id}
                          onClick={() => setSelectedTimeFilter(filter.id as any)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            selectedTimeFilter === filter.id
                              ? 'bg-[#00FFA2] text-[#0C2243]'
                              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clinics Table */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <tr>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Clinics Name
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Locations
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Date & Time
                          </th>
                          <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentClinics.length > 0 ? (
                          recentClinics.map((clinic) => (
                            <tr key={clinic.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">
                                {clinic.name}
                              </td>
                              <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                                {clinic.address || 'N/A'}
                              </td>
                              <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                                {formatDateTime(clinic.created_at)}
                              </td>
                              <td className="py-4 px-6">
                                <Button
                                  onClick={() => handleViewDetails(clinic)}
                                  className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white text-sm px-4 py-2 rounded-lg"
                                >
                                  View Details
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-gray-500 dark:text-gray-400">
                              No clinics found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        {/* Clinic Details Modal */}
        <Dialog 
          open={showDetailsModal} 
          onOpenChange={(open) => {
            setShowDetailsModal(open);
            if (!open) {
              // Reset stats when modal closes
              setClinicStats({
                totalDoctors: 0,
                totalPatients: 0,
                totalAppointments: 0,
              });
              setSelectedClinic(null);
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 bg-white dark:bg-gray-800">
            {/* Custom Header with X button */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Clinic Details</DialogTitle>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {selectedClinic && (
              <div className="px-6 pb-6 space-y-6">
                {/* CLINIC OVERVIEW Section */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4 tracking-wider">CLINIC OVERVIEW</h3>
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                      {selectedClinic.logo_url ? (
                        <img
                          src={selectedClinic.logo_url}
                          alt={selectedClinic.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<span class="text-gray-600 dark:text-gray-300 text-xl font-bold">${selectedClinic.name.charAt(0).toUpperCase()}</span>`;
                            }
                          }}
                        />
                      ) : (
                        <span className="text-gray-600 dark:text-gray-300 text-xl font-bold">
                          {selectedClinic.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      {/* Clinic Name */}
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">{selectedClinic.name}</h4>
                      
                      {/* Status with colored dot */}
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedClinic.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : selectedClinic.status === 'pending'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            selectedClinic.status === 'active'
                              ? 'bg-green-600'
                              : selectedClinic.status === 'pending'
                              ? 'bg-orange-600'
                              : 'bg-red-600'
                          }`}></span>
                          {selectedClinic.status.charAt(0).toUpperCase() + selectedClinic.status.slice(1)}
                        </span>
                      </div>
                      
                      {/* Registration Date */}
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Registration Date:</span> {formatDate(selectedClinic.registration_date)}
                      </p>
                      
                      {/* Specialties as tags */}
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <span className="font-medium">Specialties:</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedClinic.specialties && selectedClinic.specialties.length > 0 ? (
                            selectedClinic.specialties.map((spec, idx) => (
                              <span key={idx} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">
                                {spec}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">No specialties listed</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Description */}
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selectedClinic.description || 'No description provided'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CONTACT INFO Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4 tracking-wider">CONTACT INFO</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5 block">Address</Label>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedClinic.address}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5 block">Contact</Label>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedClinic.contact_phone || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5 block">Email</Label>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedClinic.contact_email || selectedClinic.email}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5 block">Website</Label>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedClinic.website || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* STATS OVERVIEW Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4 tracking-wider">STATS OVERVIEW</h3>
                  {loadingStats ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-8 h-8 border-4 border-[#0C2243] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5 block">Total Doctors</Label>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{clinicStats.totalDoctors}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5 block">Total Patients</Label>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{clinicStats.totalPatients}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5 block">Total Appointments</Label>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{clinicStats.totalAppointments}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Action Buttons Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <Button
                onClick={() => {
                  if (selectedClinic) {
                    setShowDetailsModal(false);
                    navigate('/admin/clinics');
                  }
                }}
                className="bg-red-600 border-2 border-white text-white hover:bg-red-700 flex items-center gap-2 px-4 py-2 rounded-lg"
              >
                <X className="w-4 h-4 text-white" />
                <span className="text-white">Suspend Clinic</span>
              </Button>
              <Button
                onClick={() => {
                  if (selectedClinic) {
                    setShowDetailsModal(false);
                    navigate('/admin/clinics');
                  }
                }}
                variant="outline"
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 px-4 py-2 rounded-lg"
              >
                <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span>Edit Clinic Info</span>
              </Button>
              <Button
                onClick={() => {
                  setShowDetailsModal(false);
                  navigate('/admin/clinics');
                }}
                className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white px-4 py-2 rounded-lg"
              >
                View Full Profile
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;

