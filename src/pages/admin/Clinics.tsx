import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Check, X, Eye, Edit, Ban, Trash2, MoreVertical, ChevronRight, AlertTriangle, OctagonAlert } from 'lucide-react';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

const AdminClinics = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'this-week' | 'all-time'>('all-time');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClinics, setSelectedClinics] = useState<string[]>([]);
  const [clinicsData, setClinicsData] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newlyAddedClinic, setNewlyAddedClinic] = useState<Clinic | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  
  // Add clinic form state - step tracking
  const [addClinicStep, setAddClinicStep] = useState<'credentials' | 'details'>('credentials');
  const [newClinic, setNewClinic] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    contact_phone: '',
    contact_email: '',
    website: '',
    description: '',
    specialties: [] as string[],
  });
  
  // Suspend/Remove form state
  const [suspendReason, setSuspendReason] = useState('');
  const [removeConfirmName, setRemoveConfirmName] = useState('');
  const [suspendConfirmName, setSuspendConfirmName] = useState('');
  const [showSuspendWarningModal, setShowSuspendWarningModal] = useState(false);
  
  // Edit clinic form state
  const [editClinicForm, setEditClinicForm] = useState({
    name: '',
    description: '',
    specialties: [] as string[],
    contact_email: '',
    contact_phone: '',
    address: '',
  });
  const [editSpecialtyInput, setEditSpecialtyInput] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Clinic stats state
  const [clinicStats, setClinicStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    fetchClinics();

    // Set up real-time subscription for clinics table
    const clinicsChannel = supabase
      .channel('clinics-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'clinics',
        },
        (payload) => {
          console.log('🔄 Clinic change detected:', payload.eventType, payload.new || payload.old);
          // Refresh clinics list when any change occurs
          fetchClinics();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(clinicsChannel);
    };
  }, []);

  const fetchClinics = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching clinics from database...');
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Authentication error:', authError);
        setClinicsData([]);
        setLoading(false);
        return;
      }
      console.log('✅ User authenticated:', user.id, user.email);
      
      // Check user role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
      } else {
        console.log('✅ User role:', profile?.role);
      }
      
      // Fetch ALL clinics from clinics table ONLY (no bookings merge)
      const { data: clinicsTableData, error: clinicsError } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false });

      if (clinicsError) {
        console.error('❌ Error fetching clinics table:', clinicsError);
        console.error('Error code:', clinicsError.code);
        console.error('Error message:', clinicsError.message);
        setClinicsData([]);
        setLoading(false);
        return;
      }

      console.log('✅ Clinics table fetched:', clinicsTableData?.length || 0, 'clinics');

      // Transform clinics data directly from clinics table
      const clinics: Clinic[] = (clinicsTableData || []).map((clinic: any) => ({
        id: clinic.id,
        name: clinic.name,
        email: clinic.email,
        address: clinic.address,
        contact_phone: clinic.contact_phone,
        contact_email: clinic.contact_email,
        website: clinic.website,
        logo_url: clinic.logo_url, // This will be updated in real-time when clinic admin changes it
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

      console.log('📊 Total clinics loaded:', clinics.length);
      setClinicsData(clinics);
    } catch (error) {
      console.error('❌ Error fetching clinics:', error);
      setClinicsData([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter clinics based on status, date, and search
  const filteredClinics = clinicsData.filter((clinic) => {
    const matchesStatus = statusFilter === 'all' || clinic.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.specialties.some((spec) => spec.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Apply date filter
    let matchesDate = true;
    if (dateFilter !== 'all-time') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      
      const clinicDate = new Date(clinic.created_at);
      
      if (dateFilter === 'today') {
        matchesDate = clinicDate >= today && clinicDate < tomorrow;
      } else if (dateFilter === 'tomorrow') {
        matchesDate = clinicDate >= tomorrow && clinicDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
      } else if (dateFilter === 'this-week') {
        // Show clinics from the start of this week (Sunday) up to end of today
        const endOfToday = new Date(tomorrow);
        matchesDate = clinicDate >= thisWeekStart && clinicDate < endOfToday;
      }
    }
    
    return matchesStatus && matchesSearch && matchesDate;
  });

  const handleSelectClinic = (clinicId: string) => {
    setSelectedClinics((prev) =>
      prev.includes(clinicId) ? prev.filter((id) => id !== clinicId) : [...prev, clinicId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClinics.length === filteredClinics.length) {
      setSelectedClinics([]);
    } else {
      setSelectedClinics(filteredClinics.map((clinic) => clinic.id));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleNextStep = () => {
    // Validate credentials step
    if (!newClinic.email || !newClinic.password || !newClinic.confirmPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (newClinic.password !== newClinic.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (newClinic.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    // Move to details step
    setAddClinicStep('details');
  };

  const handleAddClinic = async () => {
    try {
      // Validate details step
      if (!newClinic.name || !newClinic.address) {
        alert('Please fill in clinic name and address');
        return;
      }

      // Create clinic admin user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newClinic.email,
        password: newClinic.password,
        options: {
          data: {
            full_name: newClinic.name,
            role: 'clinic_admin',
          },
        },
      });

      if (authError) {
        console.error('Error creating clinic admin:', authError);
        alert('Error creating clinic admin: ' + authError.message);
        return;
      }

      // Insert clinic into database
      const { data, error } = await supabase
        .from('clinics')
        .insert({
          name: newClinic.name,
          email: newClinic.email,
          address: newClinic.address,
          contact_phone: newClinic.contact_phone,
          contact_email: newClinic.contact_email || newClinic.email,
          website: newClinic.website,
          description: newClinic.description,
          specialties: newClinic.specialties,
          status: 'active',
          clinic_admin_id: authData.user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating clinic:', error);
        alert('Error creating clinic: ' + error.message);
        return;
      }

      // Update profile role
      if (authData.user) {
        await supabase
          .from('profiles')
          .update({ role: 'clinic_admin' })
          .eq('user_id', authData.user.id);
      }

      console.log('✅ Clinic created:', data);
      
      // Transform to Clinic interface
      const createdClinic: Clinic = {
        id: data.id,
        name: data.name,
        email: data.email,
        address: data.address,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        website: data.website,
        description: data.description,
        specialties: data.specialties || [],
        status: data.status,
        plan_type: data.plan_type,
        registration_date: data.registration_date,
        created_at: data.created_at,
        updated_at: data.updated_at,
        suspended_reason: data.suspended_reason,
        clinic_admin_id: data.clinic_admin_id,
      };
      
      setNewlyAddedClinic(createdClinic);
      setShowAddModal(false);
      setAddClinicStep('credentials'); // Reset to first step
      setShowSuccessModal(true);
      setNewClinic({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        address: '',
        contact_phone: '',
        contact_email: '',
        website: '',
        description: '',
        specialties: [],
      });
      fetchClinics(); // Refresh list
    } catch (error) {
      console.error('Error adding clinic:', error);
      alert('Error adding clinic');
    }
  };

  const fetchClinicStats = async (clinic: Clinic) => {
    try {
      setLoadingStats(true);
      console.log('📊 Fetching stats for clinic:', clinic.id, clinic.name);

      // Get clinic ID - handle both UUID and string IDs
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

  const handleSuspendClinic = async () => {
    if (!selectedClinic || !suspendReason.trim()) {
      alert('Please provide a reason for suspension');
      return;
    }

    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          status: 'suspended',
          suspended_reason: suspendReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedClinic.id);

      if (error) {
        console.error('Error suspending clinic:', error);
        alert('Error suspending clinic: ' + error.message);
        return;
      }

      // Update the selected clinic state to reflect the change
      setSelectedClinic({
        ...selectedClinic,
        status: 'suspended',
        suspended_reason: suspendReason,
      });

      // Close both modals
      setShowSuspendWarningModal(false);
      setShowSuspendModal(false);
      setSuspendReason('');
      setSuspendConfirmName('');
      
      // Refresh the clinics list to show updated status
      await fetchClinics();
      
      // Show success message
      alert(`Clinic "${selectedClinic.name}" has been suspended successfully. The status will be updated in the dashboard.`);
      
      setSelectedClinic(null);
    } catch (error) {
      console.error('Error suspending clinic:', error);
      alert('Error suspending clinic');
    }
  };

  const handleRemoveClinic = async () => {
    if (!selectedClinic || removeConfirmName !== selectedClinic.name) {
      alert('Please type the clinic name correctly to confirm');
      return;
    }

    try {
      const { error } = await supabase
        .from('clinics')
        .delete()
        .eq('id', selectedClinic.id);

      if (error) {
        console.error('Error removing clinic:', error);
        alert('Error removing clinic: ' + error.message);
        return;
      }

      setShowRemoveModal(false);
      setRemoveConfirmName('');
      setSelectedClinic(null);
      fetchClinics();
    } catch (error) {
      console.error('Error removing clinic:', error);
      alert('Error removing clinic');
    }
  };

  const handleOpenEditModal = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setEditClinicForm({
      name: clinic.name || '',
      description: clinic.description || '',
      specialties: clinic.specialties || [],
      contact_email: clinic.contact_email || '',
      contact_phone: clinic.contact_phone || '',
      address: clinic.address || '',
    });
    setEditSpecialtyInput('');
    setShowEditModal(true);
  };

  const handleAddEditSpecialty = () => {
    if (editSpecialtyInput.trim() && !editClinicForm.specialties.includes(editSpecialtyInput.trim())) {
      setEditClinicForm({
        ...editClinicForm,
        specialties: [...editClinicForm.specialties, editSpecialtyInput.trim()],
      });
      setEditSpecialtyInput('');
    }
  };

  const handleRemoveEditSpecialty = (specialty: string) => {
    setEditClinicForm({
      ...editClinicForm,
      specialties: editClinicForm.specialties.filter((s) => s !== specialty),
    });
  };

  const handleSaveEditClinic = async () => {
    if (!selectedClinic) return;

    if (!editClinicForm.name || !editClinicForm.address) {
      alert('Please fill in clinic name and address');
      return;
    }

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          name: editClinicForm.name,
          description: editClinicForm.description || null,
          specialties: editClinicForm.specialties.length > 0 ? editClinicForm.specialties : null,
          contact_email: editClinicForm.contact_email || null,
          contact_phone: editClinicForm.contact_phone || null,
          address: editClinicForm.address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedClinic.id);

      if (error) {
        console.error('Error updating clinic:', error);
        alert('Error updating clinic: ' + error.message);
        return;
      }

      // Update the selectedClinic state to reflect changes immediately
      setSelectedClinic({
        ...selectedClinic,
        name: editClinicForm.name,
        description: editClinicForm.description || undefined,
        specialties: editClinicForm.specialties,
        contact_email: editClinicForm.contact_email || undefined,
        contact_phone: editClinicForm.contact_phone || undefined,
        address: editClinicForm.address,
      });

      setShowEditModal(false);
      // Refresh the clinics list to show updated data
      await fetchClinics();
      alert('Clinic updated successfully. Changes will be reflected in the clinic admin profile.');
    } catch (error) {
      console.error('Error updating clinic:', error);
      alert('Error updating clinic');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenSuspendModal = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setSuspendReason('');
    setSuspendConfirmName('');
    // Show suspend modal first (with reason field)
    setShowSuspendModal(true);
  };

  const handleSuspendClinicClick = () => {
    // When user clicks "Suspend Clinic" in the first modal, show warning modal
    if (!suspendReason.trim()) {
      alert('Please provide a reason for suspension');
      return;
    }
    setShowSuspendModal(false);
    setShowSuspendWarningModal(true);
  };

  const handleConfirmSuspendWarning = () => {
    if (!selectedClinic || suspendConfirmName !== selectedClinic.name) {
      alert('Please type the clinic name correctly to confirm');
      return;
    }
    // Now actually suspend the clinic
    handleSuspendClinic();
  };

  const handleOpenRemoveModal = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setRemoveConfirmName('');
    setShowRemoveModal(true);
  };


  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`}>
        <AdminSidebar isDarkMode={isDarkMode} onDarkModeToggle={toggleDarkMode} />
        
        <main className="flex-1 bg-[#F7F7F7] dark:bg-gray-900 min-h-screen overflow-y-auto">
          <div className="p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clinics</h1>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Filter
                </Button>
                <Button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243] font-medium px-6"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Clinic
                </Button>
              </div>
            </div>

            {/* Filters Section */}
            <div className="mb-6 space-y-4">
              {/* Status and Date Filters Row */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Status Filter Tabs */}
                <div className="flex items-center gap-2">
                  {(['all', 'active', 'pending', 'suspended'] as const).map((status) => (
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

                {/* Date Filter Tabs */}
                <div className="flex items-center gap-2 ml-auto">
                  {(['today', 'tomorrow', 'this-week', 'all-time'] as const).map((date) => (
                    <button
                      key={date}
                      onClick={() => setDateFilter(date)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        dateFilter === date
                          ? 'bg-[#00FFA2] text-[#0C2243]'
                          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      {date === 'this-week' ? 'This week' : date === 'all-time' ? 'All time' : date.charAt(0).toUpperCase() + date.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="w-full">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search by clinic name, location, or specialty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-full h-10"
                  />
                </div>
              </div>
            </div>

            {/* Clinics Table */}
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
                          checked={selectedClinics.length === filteredClinics.length && filteredClinics.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                        />
                      </th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Clinics Name</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Locations</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Specialties</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClinics.length > 0 ? (
                      filteredClinics.map((clinic) => (
                      <tr
                        key={clinic.id}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <input
                            type="checkbox"
                            checked={selectedClinics.includes(clinic.id)}
                            onChange={() => handleSelectClinic(clinic.id)}
                            className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{clinic.name}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{clinic.address}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 flex-wrap">
                            {clinic.specialties && clinic.specialties.length > 0 ? (
                              clinic.specialties.map((specialty, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full whitespace-nowrap"
                                >
                                  {specialty}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">No specialties</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                              clinic.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : clinic.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {clinic.status === 'active' ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : clinic.status === 'suspended' ? (
                              <X className="w-3.5 h-3.5" />
                            ) : null}
                            {clinic.status.charAt(0).toUpperCase() + clinic.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(clinic)}
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2"
                              >
                                <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                <span className="text-sm text-gray-900 dark:text-gray-100">View Details</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenEditModal(clinic)}
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2"
                              >
                                <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                <span className="text-sm text-gray-900 dark:text-gray-100">Edit Clinic Info</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenSuspendModal(clinic)}
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 text-red-600 dark:text-red-400"
                              >
                                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <span className="text-sm">Suspend Clinic</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenRemoveModal(clinic)}
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 text-red-600 dark:text-red-400"
                              >
                                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <span className="text-sm">Remove Clinic</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No clinics found
                      </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add New Clinic Modal */}
      <Dialog 
        open={showAddModal} 
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) {
            // Reset form when closing
            setAddClinicStep('credentials');
            setNewClinic({
              name: '',
              email: '',
              password: '',
              confirmPassword: '',
              address: '',
              contact_phone: '',
              contact_email: '',
              website: '',
              description: '',
              specialties: [],
            });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Clinic</DialogTitle>
          </DialogHeader>
          
          {addClinicStep === 'credentials' ? (
            <>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter clinic email"
                    value={newClinic.email}
                    onChange={(e) => setNewClinic({ ...newClinic, email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={newClinic.password}
                    onChange={(e) => setNewClinic({ ...newClinic, password: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm Password"
                    value={newClinic.confirmPassword}
                    onChange={(e) => setNewClinic({ ...newClinic, confirmPassword: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleNextStep} className="bg-[#0C2243] dark:bg-[#00FFA2] hover:bg-[#0C2243]/90 dark:hover:bg-[#00FFA2]/90 text-white dark:text-[#0C2243] flex items-center gap-2">
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="name">Clinic Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter clinic name"
                    value={newClinic.name}
                    onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter clinic address"
                    value={newClinic.address}
                    onChange={(e) => setNewClinic({ ...newClinic, address: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    placeholder="Enter contact phone"
                    value={newClinic.contact_phone}
                    onChange={(e) => setNewClinic({ ...newClinic, contact_phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    placeholder="Enter contact email (optional)"
                    value={newClinic.contact_email}
                    onChange={(e) => setNewClinic({ ...newClinic, contact_email: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="Enter website URL (optional)"
                    value={newClinic.website}
                    onChange={(e) => setNewClinic({ ...newClinic, website: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter clinic description (optional)"
                    value={newClinic.description}
                    onChange={(e) => setNewClinic({ ...newClinic, description: e.target.value })}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddClinicStep('credentials')}>
                  Back
                </Button>
                <Button onClick={handleAddClinic} className="bg-[#0C2243] dark:bg-[#00FFA2] hover:bg-[#0C2243]/90 dark:hover:bg-[#00FFA2]/90 text-white dark:text-[#0C2243]">
                  Create Clinic
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
                  handleOpenSuspendModal(selectedClinic);
                  setShowDetailsModal(false);
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
                  handleOpenEditModal(selectedClinic);
                  setShowDetailsModal(false);
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
              }}
              className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white px-4 py-2 rounded-lg"
            >
              View Full Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Clinic Modal (First Modal - with reason field) */}
      <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
        <DialogContent className="max-w-md p-0">
          {/* Custom Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">Suspend Clinic</DialogTitle>
          </div>
          
          <div className="px-6 py-6">
            {/* Warning Icon Section - Red Octagon with White Exclamation Mark */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                {/* Red Octagon Stop Sign */}
                <div className="w-20 h-20 bg-red-600 flex items-center justify-center" style={{
                  clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
                }}>
                  {/* White Exclamation Mark */}
                  <span className="text-white text-4xl font-bold">!</span>
                </div>
              </div>
            </div>

            {/* Main Heading */}
            <h3 className="text-xl font-bold text-center mb-3 text-gray-900 dark:text-white">Remove Clinic</h3>
            
            {/* Description Text */}
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center mb-6">
              You're about to suspend <span className="font-bold text-red-600">'{selectedClinic?.name}'</span>. This action will temporarily restrict their access to the platform.
            </p>

            {/* Reason Input Field */}
            <div>
              <Label htmlFor="suspendReason" className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                Reason
              </Label>
              <Textarea
                id="suspendReason"
                placeholder="Add a reason for suspending"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full min-h-[100px] border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={4}
              />
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowSuspendModal(false);
                setSuspendReason('');
              }}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSuspendClinicClick} 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
            >
              Suspend Clinic
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warning Modal (Second Modal - confirmation with clinic name) */}
      <Dialog open={showSuspendWarningModal} onOpenChange={setShowSuspendWarningModal}>
        <DialogContent className="max-w-md p-0">
          {/* Custom Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">Warning</DialogTitle>
          </div>
          
          <div className="px-6 py-6">
            {/* Trash Icon Section */}
            <div className="flex justify-center mb-6">
              <Trash2 className="w-16 h-16 text-red-600" />
            </div>

            {/* Main Heading */}
            <h3 className="text-xl font-bold text-center mb-3 text-gray-900 dark:text-white">Remove Clinic</h3>
            
            {/* Warning Message */}
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
              This action cannot be undone. All clinic data, doctors, and associated records will be permanently deleted.
            </p>

            {/* Confirmation Prompt */}
            <p className="text-sm text-gray-900 dark:text-white mb-3 text-center">
              To confirm, please type the clinic name below
            </p>

            {/* Input Field */}
            <Input
              placeholder="Enter clinic name"
              value={suspendConfirmName}
              onChange={(e) => setSuspendConfirmName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowSuspendWarningModal(false);
                setSuspendConfirmName('');
              }}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSuspendWarning} 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
            >
              Remove Clinic
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Clinic Onboarding</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-center mb-4">Clinic Added Successfully</h3>
            {newlyAddedClinic && (
              <div className="space-y-2 text-center">
                <p>
                  <span className="font-semibold">Clinic:</span> <span className="font-bold">{newlyAddedClinic.name}</span>
                </p>
                <p>
                  <span className="font-semibold">Status:</span> <span className="font-bold">{newlyAddedClinic.status.charAt(0).toUpperCase() + newlyAddedClinic.status.slice(1)}</span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuccessModal(false)}>
              Close
            </Button>
            <Button 
              onClick={() => {
                if (newlyAddedClinic) {
                  handleViewDetails(newlyAddedClinic);
                  setShowSuccessModal(false);
                }
              }}
              className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white"
            >
              View Clinic Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Clinic Info Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Clinic Info</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Clinic Name *</Label>
              <Input
                id="edit-name"
                value={editClinicForm.name}
                onChange={(e) => setEditClinicForm({ ...editClinicForm, name: e.target.value })}
                className="mt-1"
                placeholder="Enter clinic name"
              />
            </div>

            <div>
              <Label htmlFor="edit-address">Address *</Label>
              <Input
                id="edit-address"
                value={editClinicForm.address}
                onChange={(e) => setEditClinicForm({ ...editClinicForm, address: e.target.value })}
                className="mt-1"
                placeholder="Enter clinic address"
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editClinicForm.description}
                onChange={(e) => setEditClinicForm({ ...editClinicForm, description: e.target.value })}
                className="mt-1"
                placeholder="Enter clinic description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-contact-email">Contact Email</Label>
              <Input
                id="edit-contact-email"
                type="email"
                value={editClinicForm.contact_email}
                onChange={(e) => setEditClinicForm({ ...editClinicForm, contact_email: e.target.value })}
                className="mt-1"
                placeholder="Enter contact email"
              />
            </div>

            <div>
              <Label htmlFor="edit-contact-phone">Contact Phone</Label>
              <Input
                id="edit-contact-phone"
                value={editClinicForm.contact_phone}
                onChange={(e) => setEditClinicForm({ ...editClinicForm, contact_phone: e.target.value })}
                className="mt-1"
                placeholder="Enter contact phone"
              />
            </div>

            <div>
              <Label>Specialties</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={editSpecialtyInput}
                  onChange={(e) => setEditSpecialtyInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEditSpecialty();
                    }
                  }}
                  placeholder="Add specialty"
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddEditSpecialty}
                  variant="outline"
                  className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white border-0"
                >
                  Add
                </Button>
              </div>
              {editClinicForm.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editClinicForm.specialties.map((specialty, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full"
                    >
                      {specialty}
                      <button
                        type="button"
                        onClick={() => handleRemoveEditSpecialty(specialty)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditClinic}
              disabled={savingEdit}
              className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white"
            >
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Clinic Modal */}
      <Dialog open={showRemoveModal} onOpenChange={setShowRemoveModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Warning</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-center mb-4">
              <Trash2 className="w-16 h-16 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-center mb-2">Remove Clinic</h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              This action cannot be undone. All clinic data, doctors, and associated records will be permanently deleted.
            </p>
            <p className="text-sm text-gray-600 mb-2">To confirm, please type the clinic name below</p>
            <Input
              placeholder="Enter clinic name"
              value={removeConfirmName}
              onChange={(e) => setRemoveConfirmName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRemoveClinic} 
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={removeConfirmName !== selectedClinic?.name}
            >
              Remove Clinic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
};

export default AdminClinics;

