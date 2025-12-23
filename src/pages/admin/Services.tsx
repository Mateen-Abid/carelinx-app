import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, X, Check, MoreVertical } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Specialty {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Service {
  id: string;
  specialty_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  specialty_name?: string; // Joined from specialties table
}

interface ServiceRequest {
  id: string;
  clinic_id: string;
  clinic_admin_id: string;
  specialty_id: string;
  service_name: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  clinic_name?: string; // Joined from clinics table
  specialty_name?: string; // Joined from specialties table
}

interface SpecialtyRequest {
  id: string;
  clinic_id: string;
  clinic_admin_id: string;
  specialty_name: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  clinic_name?: string; // Joined from clinics table
}

const AdminServices = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { user } = useAuth();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [specialtyRequests, setSpecialtyRequests] = useState<SpecialtyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingSpecialtyRequests, setLoadingSpecialtyRequests] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [selectedSpecialtyRequest, setSelectedSpecialtyRequest] = useState<SpecialtyRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRejectSpecialtyModal, setShowRejectSpecialtyModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Modals
  const [showAddSpecialtyModal, setShowAddSpecialtyModal] = useState(false);
  const [showEditSpecialtyModal, setShowEditSpecialtyModal] = useState(false);
  const [showDeleteSpecialtyModal, setShowDeleteSpecialtyModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState(false);
  
  // Form states
  const [newSpecialty, setNewSpecialty] = useState({ name: '', description: '' });
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);
  const [deletingSpecialty, setDeletingSpecialty] = useState<Specialty | null>(null);
  const [newService, setNewService] = useState({ specialty_id: '', name: '', description: '' });
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  // Fetch specialties, services, and requests
  useEffect(() => {
    fetchData();
    fetchServiceRequests();
    fetchSpecialtyRequests();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch specialties
      const { data: specialtiesData, error: specialtiesError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('super_admin_specialties' as any)
        .select('*')
        .eq('is_active', true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .order('name', { ascending: true }) as any);

      if (specialtiesError) {
        console.error('Error fetching specialties:', specialtiesError);
        toast.error('Failed to fetch specialties');
      } else {
        setSpecialties(specialtiesData || []);
      }

      // Fetch services with specialty names
      const { data: servicesData, error: servicesError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('super_admin_services' as any)
        .select(`
          *,
          specialty:super_admin_specialties(name)
        `)
        .eq('is_active', true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .order('name', { ascending: true }) as any);

      if (servicesError) {
        console.error('Error fetching services:', servicesError);
        toast.error('Failed to fetch services');
      } else {
        // Transform services to include specialty name
        const transformedServices = (servicesData || []).map((service: any) => ({
          ...service,
          specialty_name: service.specialty?.name || 'Unknown'
        }));
        setServices(transformedServices);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Add specialty
  const handleAddSpecialty = async () => {
    if (!newSpecialty.name.trim()) {
      toast.error('Please enter a specialty name');
      return;
    }

    try {
      // First check if specialty with this name already exists (case-insensitive)
      const { data: existingSpecialty, error: checkError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('super_admin_specialties' as any)
        .select('id, name, is_active')
        .ilike('name', newSpecialty.name.trim())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .maybeSingle() as any);

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine
        console.error('Error checking existing specialty:', checkError);
      }

      if (existingSpecialty) {
        if (existingSpecialty.is_active) {
          toast.error(`Specialty "${newSpecialty.name.trim()}" already exists`);
          return;
        } else {
          // If specialty exists but is inactive, reactivate it instead
          const { error: updateError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from('super_admin_specialties' as any)
            .update({
              is_active: true,
              description: newSpecialty.description.trim() || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSpecialty.id) as any);

          if (updateError) {
            console.error('Error reactivating specialty:', updateError);
            toast.error('Failed to reactivate specialty');
            return;
          }

          toast.success('Specialty reactivated successfully');
          setShowAddSpecialtyModal(false);
          setNewSpecialty({ name: '', description: '' });
          fetchData();
          return;
        }
      }

      // If specialty doesn't exist, insert new one
      const { error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('super_admin_specialties' as any)
        .insert({
          name: newSpecialty.name.trim(),
          description: newSpecialty.description.trim() || null,
          created_by: user?.id || null
        }) as any);

      if (error) {
        console.error('Error adding specialty:', error);
        
        // Check for duplicate key error
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
          toast.error(`Specialty "${newSpecialty.name.trim()}" already exists`);
        } else {
          toast.error(`Failed to add specialty: ${error.message || 'Unknown error'}`);
        }
        return;
      }

      toast.success('Specialty added successfully');
      setShowAddSpecialtyModal(false);
      setNewSpecialty({ name: '', description: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error adding specialty:', error);
      
      if (error?.code === '23505' || error?.message?.includes('duplicate key') || error?.message?.includes('unique constraint')) {
        toast.error(`Specialty "${newSpecialty.name.trim()}" already exists`);
      } else {
        toast.error(`Failed to add specialty: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  // Edit specialty
  const handleEditSpecialty = async () => {
    if (!editingSpecialty || !editingSpecialty.name.trim()) {
      toast.error('Please enter a specialty name');
      return;
    }

    try {
      const { error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('super_admin_specialties' as any)
        .update({
          name: editingSpecialty.name.trim(),
          description: editingSpecialty.description || null
        })
        .eq('id', editingSpecialty.id) as any);

      if (error) {
        console.error('Error updating specialty:', error);
        toast.error('Failed to update specialty');
        return;
      }

      toast.success('Specialty updated successfully');
      setShowEditSpecialtyModal(false);
      setEditingSpecialty(null);
      fetchData();
    } catch (error) {
      console.error('Error updating specialty:', error);
      toast.error('Failed to update specialty');
    }
  };

  // Delete specialty (soft delete) using database function
  const handleDeleteSpecialty = async () => {
    if (!deletingSpecialty) return;

    console.log('🗑️ Deleting specialty:', deletingSpecialty.id, deletingSpecialty.name);

    try {
      // Use database function to delete specialty and all its services
      // This bypasses RLS issues by using SECURITY DEFINER
      const { data, error } = await supabase.rpc('delete_specialty_and_services', {
        specialty_uuid: deletingSpecialty.id
      });

      if (error) {
        console.error('❌ Error deleting specialty:', error);
        toast.error(`Failed to delete specialty: ${error.message || error.code || 'Unknown error'}`);
        return;
      }

      console.log('✅ Specialty and services deleted successfully:', data);
      toast.success(`Specialty and ${data?.deleted_services_count || 0} service(s) deleted successfully`);
      setShowDeleteSpecialtyModal(false);
      setDeletingSpecialty(null);
      fetchData();
    } catch (error: any) {
      console.error('❌ Exception deleting specialty:', error);
      toast.error(`Failed to delete specialty: ${error?.message || error?.code || 'Unknown error'}`);
    }
  };

  // Add service
  const handleAddService = async () => {
    if (!newService.specialty_id || !newService.name.trim()) {
      toast.error('Please select a specialty and enter a service name');
      return;
    }

    try {
      const { error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('super_admin_services' as any)
        .insert({
          specialty_id: newService.specialty_id,
          name: newService.name.trim(),
          description: newService.description.trim() || null,
          created_by: user?.id || null
        }) as any);

      if (error) {
        console.error('Error adding service:', error);
        toast.error('Failed to add service');
        return;
      }

      toast.success('Service added successfully');
      setShowAddServiceModal(false);
      setNewService({ specialty_id: '', name: '', description: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error('Failed to add service');
    }
  };

  // Edit service
  const handleEditService = async () => {
    if (!editingService || !editingService.name.trim()) {
      toast.error('Please enter a service name');
      return;
    }

    try {
      const { error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('super_admin_services' as any)
        .update({
          specialty_id: editingService.specialty_id,
          name: editingService.name.trim(),
          description: editingService.description || null
        })
        .eq('id', editingService.id) as any);

      if (error) {
        console.error('Error updating service:', error);
        toast.error('Failed to update service');
        return;
      }

      toast.success('Service updated successfully');
      setShowEditServiceModal(false);
      setEditingService(null);
      fetchData();
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Failed to update service');
    }
  };

  // Delete service (soft delete) using database function
  const handleDeleteService = async () => {
    if (!deletingService) return;

    console.log('🗑️ Deleting service:', deletingService.id, deletingService.name);

    try {
      // Use database function to delete service
      // This bypasses RLS issues by using SECURITY DEFINER
      const { data, error } = await supabase.rpc('delete_service', {
        service_uuid: deletingService.id
      });

      if (error) {
        console.error('❌ Error deleting service:', error);
        toast.error(`Failed to delete service: ${error.message || error.code || 'Unknown error'}`);
        return;
      }

      console.log('✅ Service deleted successfully:', data);
      toast.success('Service deleted successfully');
      setShowDeleteServiceModal(false);
      setDeletingService(null);
      fetchData();
    } catch (error: any) {
      console.error('❌ Exception deleting service:', error);
      toast.error(`Failed to delete service: ${error?.message || error?.code || 'Unknown error'}`);
    }
  };

  // Fetch service requests
  const fetchServiceRequests = async () => {
    try {
      setLoadingRequests(true);
      
      // Fetch pending service requests with clinic and specialty names
      const { data: requestsData, error: requestsError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('service_requests' as any)
        .select(`
          *,
          clinics:clinic_id (name),
          specialties:specialty_id (name)
        `)
        .eq('status', 'pending')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .order('requested_at', { ascending: false }) as any);

      if (requestsError) {
        console.error('Error fetching service requests:', requestsError);
        // Don't show error if table doesn't exist yet
        if (requestsError.code !== '42P01') {
          toast.error('Failed to fetch service requests');
        }
        setServiceRequests([]);
      } else {
        // Map the data to include clinic and specialty names
        const mappedRequests = (requestsData || []).map((req: any) => ({
          ...req,
          clinic_name: req.clinics?.name || 'Unknown Clinic',
          specialty_name: req.specialties?.name || 'Unknown Specialty'
        }));
        setServiceRequests(mappedRequests);
        console.log('✅ Service requests fetched:', mappedRequests.length);
      }
    } catch (error: any) {
      console.error('Error fetching service requests:', error);
      if (error?.code !== '42P01' && !error?.message?.includes('does not exist')) {
        toast.error('Failed to fetch service requests');
      }
      setServiceRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchSpecialtyRequests = async () => {
    try {
      setLoadingSpecialtyRequests(true);
      
      // Fetch pending specialty requests with clinic names
      const { data: requestsData, error: requestsError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('specialty_requests' as any)
        .select(`
          *,
          clinics:clinic_id(name)
        `)
        .eq('status', 'pending')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .order('requested_at', { ascending: false }) as any);

      if (requestsError) {
        console.error('Error fetching specialty requests:', requestsError);
        if (requestsError.code === '42P01' || requestsError.message?.includes('does not exist')) {
          console.log('Specialty requests table does not exist yet');
          setSpecialtyRequests([]);
        } else {
          setSpecialtyRequests([]);
        }
      } else {
        // Map the data to include clinic names
        const mappedRequests = (requestsData || []).map((req: any) => ({
          ...req,
          clinic_name: req.clinics?.name || 'Unknown Clinic',
        }));
        setSpecialtyRequests(mappedRequests);
        console.log('✅ Specialty requests fetched:', mappedRequests.length);
      }
    } catch (error: any) {
      console.error('Error fetching specialty requests:', error);
      if (error?.code !== '42P01' && !error?.message?.includes('does not exist')) {
        toast.error('Failed to fetch specialty requests');
      }
      setSpecialtyRequests([]);
    } finally {
      setLoadingSpecialtyRequests(false);
    }
  };

  // Handle approve request
  const handleApproveRequest = async (request: ServiceRequest) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      // First, add the service to super_admin_services
      const { data: serviceData, error: serviceError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('super_admin_services' as any)
        .insert({
          specialty_id: request.specialty_id,
          name: request.service_name,
          description: request.description,
          is_active: true,
          created_by: user.id
        })
        .select()
        .single() as any);

      if (serviceError) {
        console.error('Error adding service:', serviceError);
        toast.error('Failed to add service');
        return;
      }

      // Then, update the request status to approved
      const { error: updateError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('service_requests' as any)
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', request.id) as any);

      if (updateError) {
        console.error('Error updating request:', updateError);
        toast.error('Failed to approve request');
        return;
      }

      toast.success('Service request approved and added successfully!');
      fetchServiceRequests(); // Refresh requests list
      fetchData(); // Refresh services list
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    }
  };

  // Handle reject request
  const handleRejectRequest = async () => {
    if (!selectedRequest || !user) {
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const { error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('service_requests' as any)
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: rejectionReason.trim()
        })
        .eq('id', selectedRequest.id) as any);

      if (error) {
        console.error('Error rejecting request:', error);
        toast.error('Failed to reject request');
        return;
      }

      toast.success('Service request rejected');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRequest(null);
      fetchServiceRequests(); // Refresh requests list
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  // Handle approve specialty request
  const handleApproveSpecialtyRequest = async (request: SpecialtyRequest) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      // First, add the specialty to super_admin_specialties
      const { data: specialtyData, error: specialtyError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('super_admin_specialties' as any)
        .insert({
          name: request.specialty_name,
          description: request.description,
          is_active: true,
          created_by: user.id
        })
        .select()
        .single() as any);

      if (specialtyError) {
        console.error('Error adding specialty:', specialtyError);
        toast.error('Failed to add specialty');
        return;
      }

      // Then, update the request status to approved
      const { error: updateError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('specialty_requests' as any)
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', request.id) as any);

      if (updateError) {
        console.error('Error updating request:', updateError);
        toast.error('Failed to approve request');
        return;
      }

      toast.success('Specialty request approved and added successfully!');
      fetchSpecialtyRequests(); // Refresh requests list
      fetchData(); // Refresh specialties list
    } catch (error) {
      console.error('Error approving specialty request:', error);
      toast.error('Failed to approve request');
    }
  };

  // Handle reject specialty request
  const handleRejectSpecialtyRequest = async () => {
    if (!selectedSpecialtyRequest || !user) {
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const { error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('specialty_requests' as any)
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          rejection_reason: rejectionReason.trim()
        })
        .eq('id', selectedSpecialtyRequest.id) as any);

      if (error) {
        console.error('Error rejecting specialty request:', error);
        toast.error('Failed to reject request');
        return;
      }

      toast.success('Specialty request rejected');
      setShowRejectSpecialtyModal(false);
      setRejectionReason('');
      setSelectedSpecialtyRequest(null);
      fetchSpecialtyRequests(); // Refresh requests list
    } catch (error) {
      console.error('Error rejecting specialty request:', error);
      toast.error('Failed to reject request');
    }
  };

  // Show all services (no filtering)
  const filteredServices = services;

  // Group services by specialty for display
  const groupedServices = filteredServices.reduce((acc, service) => {
    const specialtyName = service.specialty_name || 'Unknown';
    if (!acc[specialtyName]) {
      acc[specialtyName] = [];
    }
    acc[specialtyName].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`}>
        <AdminSidebar isDarkMode={isDarkMode} onDarkModeToggle={toggleDarkMode} />
        
        <main className="flex-1 bg-[#F7F7F7] dark:bg-gray-900 min-h-screen overflow-y-auto">
          {/* Blue Bar at Top */}
          <div className="h-1 bg-[#0C2243] w-full"></div>
          
          <div className="p-8">
            {/* Page Header */}
            <div className="flex items-start justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Specialties & Services</h1>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowAddSpecialtyModal(true)}
                  className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243] font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Specialty
                </Button>
                <Button
                  onClick={() => setShowAddServiceModal(true)}
                  className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </div>
            </div>

            {/* Specialty Requests Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pending Specialty Requests</h2>
                <span className="px-3 py-1 bg-[#00FFA2] text-[#0C2243] rounded-full text-sm font-medium">
                  {specialtyRequests.length} Pending
                </span>
              </div>
              
              {loadingSpecialtyRequests ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading requests...</p>
                </div>
              ) : specialtyRequests.length > 0 ? (
                <div className="space-y-4">
                  {specialtyRequests.map((request) => (
                    <div
                      key={request.id}
                      className="border border-[#0C2243]/20 dark:border-[#0C2243]/30 bg-white dark:bg-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                              {request.specialty_name}
                            </h3>
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded text-xs font-medium">
                              Pending
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <p><span className="font-medium">Clinic:</span> {request.clinic_name || 'N/A'}</p>
                            <p><span className="font-medium">Requested:</span> {new Date(request.requested_at).toLocaleDateString()}</p>
                            {request.description && (
                              <p><span className="font-medium">Description:</span> {request.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            onClick={() => handleApproveSpecialtyRequest(request)}
                            className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243] font-medium"
                            size="sm"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedSpecialtyRequest(request);
                              setShowRejectSpecialtyModal(true);
                            }}
                            variant="outline"
                            className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            size="sm"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No pending specialty requests</p>
                </div>
              )}
            </div>

            {/* Service Requests Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pending Service Requests</h2>
                <span className="px-3 py-1 bg-[#00FFA2] text-[#0C2243] rounded-full text-sm font-medium">
                  {serviceRequests.length} Pending
                </span>
              </div>
              
              {loadingRequests ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading requests...</p>
                </div>
              ) : serviceRequests.length > 0 ? (
                <div className="space-y-4">
                  {serviceRequests.map((request) => (
                    <div
                      key={request.id}
                      className="border border-[#0C2243]/20 dark:border-[#0C2243]/30 bg-white dark:bg-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                              {request.service_name}
                            </h3>
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded text-xs font-medium">
                              Pending
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <p><span className="font-medium">Specialty:</span> {request.specialty_name || 'N/A'}</p>
                            <p><span className="font-medium">Clinic:</span> {request.clinic_name || 'N/A'}</p>
                            <p><span className="font-medium">Requested:</span> {new Date(request.requested_at).toLocaleDateString()}</p>
                            {request.description && (
                              <p><span className="font-medium">Description:</span> {request.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            onClick={() => handleApproveRequest(request)}
                            className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243] font-medium"
                            size="sm"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRejectModal(true);
                            }}
                            variant="outline"
                            className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            size="sm"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No pending service requests</p>
                </div>
              )}
            </div>

            {/* Specialties Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Specialties</h2>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading specialties...</p>
                </div>
              ) : specialties.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {specialties.map((specialty) => (
                    <div
                      key={specialty.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{specialty.name}</h3>
                        {specialty.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{specialty.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingSpecialty(specialty);
                            setShowEditSpecialtyModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingSpecialty(specialty);
                            setShowDeleteSpecialtyModal(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No specialties found. Add your first specialty!</p>
                </div>
              )}
            </div>

            {/* Services Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Services</h2>
              </div>
              
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading services...</p>
                </div>
              ) : Object.keys(groupedServices).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white w-1/4">
                          Specialty
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Service Name
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedServices).map(([specialtyName, serviceList]) => (
                        <tr
                          key={specialtyName}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="py-4 px-4 text-sm text-gray-900 dark:text-white font-semibold align-middle w-1/5">
                            {specialtyName}
                          </td>
                          <td className="py-4 px-4 align-middle">
                            <div className="flex flex-wrap gap-2">
                              {serviceList.map((service) => (
                                <span
                                  key={service.id}
                                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 whitespace-nowrap"
                                >
                                  {service.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-4 align-middle">
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
                              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg max-h-96 overflow-y-auto">
                                {serviceList.map((service, idx) => (
                                  <div key={service.id}>
                                    {idx > 0 && (
                                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                    )}
                                    <div className="px-2 py-1">
                                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1 mb-1">
                                        {service.name}
                                      </div>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditingService(service);
                                          setShowEditServiceModal(true);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md"
                                      >
                                        <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                        <span className="text-sm text-gray-900 dark:text-gray-100">Edit</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setDeletingService(service);
                                          setShowDeleteServiceModal(true);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-red-600 dark:text-red-400"
                                      >
                                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                        <span className="text-sm">Delete</span>
                                      </DropdownMenuItem>
                                    </div>
                                  </div>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No services found. Add your first service!</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add Specialty Modal */}
      <Dialog open={showAddSpecialtyModal} onOpenChange={setShowAddSpecialtyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Specialty</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Specialty Name *</Label>
              <Input
                value={newSpecialty.name}
                onChange={(e) => setNewSpecialty({ ...newSpecialty, name: e.target.value })}
                placeholder="e.g., Cardiology"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newSpecialty.description}
                onChange={(e) => setNewSpecialty({ ...newSpecialty, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSpecialtyModal(false)}>Cancel</Button>
            <Button onClick={handleAddSpecialty} className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243]">
              Add Specialty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Specialty Modal */}
      <Dialog open={showEditSpecialtyModal} onOpenChange={setShowEditSpecialtyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Specialty</DialogTitle>
          </DialogHeader>
          {editingSpecialty && (
            <div className="space-y-4">
              <div>
                <Label>Specialty Name *</Label>
                <Input
                  value={editingSpecialty.name}
                  onChange={(e) => setEditingSpecialty({ ...editingSpecialty, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingSpecialty.description || ''}
                  onChange={(e) => setEditingSpecialty({ ...editingSpecialty, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditSpecialtyModal(false)}>Cancel</Button>
            <Button onClick={handleEditSpecialty} className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Specialty Modal */}
      <Dialog open={showDeleteSpecialtyModal} onOpenChange={setShowDeleteSpecialtyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Specialty</DialogTitle>
          </DialogHeader>
          {deletingSpecialty && (
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete "{deletingSpecialty.name}"? This will also delete all services under this specialty.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteSpecialtyModal(false)}>Cancel</Button>
            <Button onClick={handleDeleteSpecialty} className="bg-red-500 hover:bg-red-600 text-white">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Service Modal */}
      <Dialog open={showAddServiceModal} onOpenChange={setShowAddServiceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Specialty *</Label>
              <Select value={newService.specialty_id} onValueChange={(value) => setNewService({ ...newService, specialty_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a specialty" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service Name *</Label>
              <Input
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                placeholder="e.g., Consultation"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddServiceModal(false)}>Cancel</Button>
            <Button onClick={handleAddService} className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243]">
              Add Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Modal */}
      <Dialog open={showEditServiceModal} onOpenChange={(open) => {
        setShowEditServiceModal(open);
        if (!open) {
          setEditingService(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          {editingService && (
            <div className="space-y-4">
              <div>
                <Label>Specialty *</Label>
                <Select value={editingService.specialty_id} onValueChange={(value) => setEditingService({ ...editingService, specialty_id: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty.id} value={specialty.id}>
                        {specialty.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Service Name *</Label>
                <Input
                  value={editingService.name}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  placeholder="Enter service name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingService.description || ''}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditServiceModal(false);
              setEditingService(null);
            }}>Cancel</Button>
            <Button onClick={handleEditService} className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Service Modal */}
      <Dialog open={showDeleteServiceModal} onOpenChange={(open) => {
        setShowDeleteServiceModal(open);
        if (!open) {
          setDeletingService(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
          </DialogHeader>
          {deletingService && (
            <div className="space-y-2">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete the service <strong>"{deletingService.name}"</strong>?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This action cannot be undone. The service will be removed from the system.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteServiceModal(false);
              setDeletingService(null);
            }}>Cancel</Button>
            <Button onClick={handleDeleteService} className="bg-red-500 hover:bg-red-600 text-white">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Request Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Reject Service Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Service: <span className="font-semibold text-gray-900 dark:text-white">{selectedRequest?.service_name}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Clinic: <span className="font-semibold text-gray-900 dark:text-white">{selectedRequest?.clinic_name}</span>
              </p>
            </div>
            <div>
              <Label htmlFor="rejection-reason" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason for Rejection <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Please provide a reason for rejecting this service request..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason('');
                setSelectedRequest(null);
              }}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectRequest}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Specialty Request Modal */}
      <Dialog open={showRejectSpecialtyModal} onOpenChange={setShowRejectSpecialtyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Reject Specialty Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Specialty: <span className="font-semibold text-gray-900 dark:text-white">{selectedSpecialtyRequest?.specialty_name}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Clinic: <span className="font-semibold text-gray-900 dark:text-white">{selectedSpecialtyRequest?.clinic_name}</span>
              </p>
            </div>
            <div>
              <Label htmlFor="rejection-reason-specialty" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason for Rejection <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejection-reason-specialty"
                placeholder="Please provide a reason for rejecting this specialty request..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectSpecialtyModal(false);
                setRejectionReason('');
                setSelectedSpecialtyRequest(null);
              }}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectSpecialtyRequest}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
};

export default AdminServices;
