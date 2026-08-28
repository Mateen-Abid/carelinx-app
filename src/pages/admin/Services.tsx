import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
// import { supabase } from '@/integrations/supabase/client'; // Removed - Using backend API
import { api } from '@/services/api';
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
import { useTableSort } from '@/hooks/useTableSort';
import { TableSortHeader } from '@/components/ui/TableSortHeader';
import { useTranslation } from 'react-i18next';
import { localizedStoredText } from '@/utils/localizedContent';

interface Specialty {
  id: string;
  name: string;
  name_ar?: string | null;
  description: string | null;
  is_active: boolean;
}

interface Service {
  id: string;
  specialty_id: string;
  name: string;
  name_ar?: string | null;
  description: string | null;
  is_active: boolean;
  specialty_name?: string; // Joined from specialties table
  specialty_name_ar?: string | null;
}

interface ServiceRequest {
  id: string;
  clinic_id: string;
  clinic_admin_id: string;
  specialty_id: string;
  service_name: string;
  service_name_ar?: string | null;
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
  specialty_name_ar?: string | null;
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
  const { t, i18n } = useTranslation();
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
  const [showApproveSpecialtyModal, setShowApproveSpecialtyModal] = useState(false);
  const [showApproveServiceModal, setShowApproveServiceModal] = useState(false);
  const [approvalName, setApprovalName] = useState('');
  const [approvalNameAr, setApprovalNameAr] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  
  // Modals
  const [showAddSpecialtyModal, setShowAddSpecialtyModal] = useState(false);
  const [showEditSpecialtyModal, setShowEditSpecialtyModal] = useState(false);
  const [showDeleteSpecialtyModal, setShowDeleteSpecialtyModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState(false);
  
  // Form states
  const [newSpecialty, setNewSpecialty] = useState({ name: '', name_ar: '', description: '' });
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);
  const [deletingSpecialty, setDeletingSpecialty] = useState<Specialty | null>(null);
  const [newService, setNewService] = useState({ specialty_id: '', name: '', name_ar: '', description: '' });
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  // Fetch specialties, services, and requests
  useEffect(() => {
    const fetchInitialData = async () => {
      await Promise.all([
        fetchData(),
        fetchServiceRequests(),
        fetchSpecialtyRequests(),
      ]);
    };
    fetchInitialData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch specialties and services from backend in parallel
      const [
        { specialties: specialtiesData },
        { services: servicesData },
      ] = await Promise.all([
        api.adminServices.getSpecialties(),
        api.adminServices.getServices(),
      ]);
      setSpecialties(specialtiesData || []);
      // Transform services to include specialty name
      const transformedServices = (servicesData || []).map((service: any) => ({
        ...service,
        specialty_name: service.specialty?.name || 'Unknown',
        specialty_name_ar: service.specialty?.name_ar || null,
      }));
      setServices(transformedServices);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  };

  // Add specialty
  const handleAddSpecialty = async () => {
    if (!newSpecialty.name.trim()) {
      toast.error(t('Please enter the English name'));
      return;
    }
    if (!newSpecialty.name_ar.trim()) {
      toast.error(t('Please enter the Arabic name'));
      return;
    }

    try {
      // Create specialty via backend (handles checking for existing and reactivation)
      const result = await api.adminServices.createSpecialty({
        name: newSpecialty.name.trim(),
        name_ar: newSpecialty.name_ar.trim(),
        description: newSpecialty.description.trim() || null,
      });

      if (result.reactivated) {
        toast.success(t('Specialty "{{name}}" has been reactivated', { name: result.specialty.name }));
      } else {
        toast.success(t('Specialty added successfully'));
      }

      setShowAddSpecialtyModal(false);
      setNewSpecialty({ name: '', name_ar: '', description: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error adding specialty:', error);
      if (error?.message?.includes('already exists')) {
        toast.error(t('Specialty "{{name}}" already exists', { name: newSpecialty.name.trim() }));
      } else {
        toast.error(t('Failed to add specialty: {{message}}', { message: error?.message || t('Unknown error') }));
      }
    }
  };

  // Edit specialty
  const handleEditSpecialty = async () => {
    if (!editingSpecialty || !editingSpecialty.name.trim()) {
      toast.error(t('Please enter a specialty name'));
      return;
    }

    try {
      const updatedSpecialty = await api.adminServices.updateSpecialty(editingSpecialty.id, {
        name: editingSpecialty.name.trim(),
        name_ar: editingSpecialty.name_ar?.trim() || null,
        description: editingSpecialty.description || null
      });

      console.log('✅ Specialty updated successfully:', updatedSpecialty);

      // Update the specialties list immediately to reflect the change
      setSpecialties(prevSpecialties => 
        prevSpecialties.map(specialty => 
          specialty.id === editingSpecialty.id 
            ? {
                ...specialty,
                name: editingSpecialty.name.trim(),
                name_ar: editingSpecialty.name_ar?.trim() || null,
                description: editingSpecialty.description || null,
              }
            : specialty
        )
      );

      // Also update the specialty_name in services that belong to this specialty
      setServices(prevServices => 
        prevServices.map(service => 
          service.specialty_id === editingSpecialty.id
            ? {
                ...service,
                specialty_name: editingSpecialty.name.trim(),
              }
            : service
        )
      );

      toast.success(t('Specialty updated successfully. Changes will be reflected immediately.'));
      setShowEditSpecialtyModal(false);
      setEditingSpecialty(null);
      
      // Refresh to ensure data is in sync with database
      await fetchData();
    } catch (error: any) {
      console.error('❌ Error updating specialty:', error);
      toast.error(t('Failed to update specialty: {{message}}', { message: error?.message || t('Unknown error') }));
    }
  };

  // Delete specialty (soft delete) using database function
  const handleDeleteSpecialty = async () => {
    if (!deletingSpecialty) return;

    console.log('🗑️ Deleting specialty:', {
      id: deletingSpecialty.id,
      name: deletingSpecialty.name,
      is_active: deletingSpecialty.is_active,
      idType: typeof deletingSpecialty.id,
      idLength: deletingSpecialty.id?.length
    });

    try {
      console.log('🗑️ Calling deleteSpecialty API with ID:', deletingSpecialty.id);
      const response = await api.adminServices.deleteSpecialty(deletingSpecialty.id);
      console.log('✅ Delete specialty API response:', response);
      const deleted_services_count = response?.deleted_services_count || 0;
      
      // Verify the deletion was successful
      if (!response?.success && !response?.specialty) {
        throw new Error('Delete operation did not return success confirmation');
      }

      console.log('✅ Specialty and services deleted successfully');

      // Update the specialties list immediately to reflect the deletion
      // Since it's a soft delete (is_active = false), remove it from the UI
      setSpecialties(prevSpecialties => {
        const updated = prevSpecialties.filter(specialty => specialty.id !== deletingSpecialty.id);
        console.log('🔄 Updated specialties list:', updated.length, 'specialties remaining');
        return updated;
      });

      // Also remove all services that belong to this specialty from the services list
      setServices(prevServices => {
        const updated = prevServices.filter(service => service.specialty_id !== deletingSpecialty.id);
        console.log('🔄 Updated services list:', updated.length, 'services remaining');
        return updated;
      });

      toast.success(`Specialty and ${deleted_services_count || 0} service(s) deleted successfully. The specialty and its services will no longer be visible to public users or clinic admins.`);
      setShowDeleteSpecialtyModal(false);
      setDeletingSpecialty(null);
      
      // Refresh to ensure data is in sync with database
      // This will fetch only active specialties (is_active = true), so deleted ones won't appear
      await fetchData();
    } catch (error: any) {
      console.error('❌ Error deleting specialty:', error);
      toast.error(`Failed to delete specialty: ${error?.message || 'Unknown error'}`);
      
      // Revert optimistic update on error by refreshing
      await fetchData();
    }
  };

  // Add service
  const handleAddService = async () => {
    if (!newService.specialty_id || !newService.name.trim()) {
      toast.error(t('Please select a specialty and enter a service name'));
      return;
    }
    if (!newService.name_ar.trim()) {
      toast.error(t('Please enter the Arabic name'));
      return;
    }

    try {
      await api.adminServices.createService({
        specialty_id: newService.specialty_id,
        name: newService.name.trim(),
        name_ar: newService.name_ar.trim(),
        description: newService.description.trim() || null,
      });

      toast.success(t('Service added successfully'));
      setShowAddServiceModal(false);
      setNewService({ specialty_id: '', name: '', name_ar: '', description: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error adding service:', error);
      // Show user-friendly error message
      const errorMessage = error.message || 'Failed to add service';
      if (errorMessage.includes('already exists')) {
        toast.error(errorMessage);
      } else if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        toast.error(t('This service already exists for the selected specialty'));
      } else {
        toast.error(errorMessage);
      }
    }
  };

  // Edit service
  const handleEditService = async () => {
    if (!editingService || !editingService.name.trim()) {
      toast.error(t('Please enter a service name'));
      return;
    }

    try {
      const updatedService = await api.adminServices.updateService(editingService.id, {
        specialty_id: editingService.specialty_id,
        name: editingService.name.trim(),
        name_ar: editingService.name_ar?.trim() || null,
        description: editingService.description || null
      });

      console.log('✅ Service updated successfully:', updatedService);

      // Update the services list immediately to reflect the change
      setServices(prevServices => 
        prevServices.map(service => 
          service.id === editingService.id 
            ? {
                ...service,
                name: editingService.name.trim(),
                name_ar: editingService.name_ar?.trim() || null,
                specialty_id: editingService.specialty_id,
                specialty_name: specialties.find(s => s.id === editingService.specialty_id)?.name || service.specialty_name,
                specialty_name_ar: specialties.find(s => s.id === editingService.specialty_id)?.name_ar || service.specialty_name_ar,
                description: editingService.description || null,
              }
            : service
        )
      );

      toast.success(t('Service updated successfully. Changes will be reflected immediately.'));
      setShowEditServiceModal(false);
      setEditingService(null);
      
      // Refresh to ensure data is in sync with database
      await fetchData();
    } catch (error: any) {
      console.error('❌ Error updating service:', error);
      toast.error(t('Failed to update service: {{message}}', { message: error?.message || t('Unknown error') }));
    }
  };

  // Delete service (soft delete) using database function
  const handleDeleteService = async () => {
    if (!deletingService) return;

    console.log('🗑️ Deleting service:', deletingService.id, deletingService.name);

    try {
      console.log('🗑️ Deleting service via backend:', deletingService.id);
      await api.adminServices.deleteService(deletingService.id);
      console.log('✅ Service deleted successfully');

      // Update the services list immediately to reflect the deletion
      // Since it's a soft delete (is_active = false), remove it from the UI
      setServices(prevServices => 
        prevServices.filter(service => service.id !== deletingService.id)
      );

      toast.success(t('Service deleted successfully. The service will no longer be visible to public users or clinic admins.'));
      setShowDeleteServiceModal(false);
      setDeletingService(null);
      
      // Refresh to ensure data is in sync with database
      await fetchData();
    } catch (error: any) {
      console.error('❌ Exception deleting service:', error);
      toast.error(`Failed to delete service: ${error?.message || error?.code || 'Unknown error'}`);
    }
  };

  // Fetch service requests
  const fetchServiceRequests = async () => {
    try {
      setLoadingRequests(true);
      
      // Fetch pending service requests from backend
      const { requests: requestsData } = await api.adminServices.getServiceRequests();

      // Map the data to include clinic and specialty names
      const mappedRequests = (requestsData || []).map((req: any) => ({
        ...req,
        clinic_name: req.clinics?.name || 'Unknown Clinic',
        specialty_name: req.specialties?.name || 'Unknown Specialty'
      }));
      setServiceRequests(mappedRequests);
      console.log('✅ Service requests fetched:', mappedRequests.length);
    } catch (error: any) {
      console.error('Error fetching service requests:', error);
      if (error?.code !== '42P01' && !error?.message?.includes('does not exist')) {
        toast.error(t('Failed to fetch service requests'));
      }
      setServiceRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchSpecialtyRequests = async () => {
    try {
      setLoadingSpecialtyRequests(true);
      
      // Fetch pending specialty requests from backend
      const { requests: requestsData } = await api.adminServices.getSpecialtyRequests();

      // Map the data to include clinic names
      const mappedRequests = (requestsData || []).map((req: any) => ({
        ...req,
        clinic_name: req.clinics?.name || 'Unknown Clinic'
      }));
      setSpecialtyRequests(mappedRequests);
      console.log('✅ Specialty requests fetched:', mappedRequests.length);
    } catch (error: any) {
      console.error('Error fetching specialty requests:', error);
      if (error?.code !== '42P01' && !error?.message?.includes('does not exist')) {
        toast.error(t('Failed to fetch specialty requests'));
      }
      setSpecialtyRequests([]);
    } finally {
      setLoadingSpecialtyRequests(false);
    }
  };

  const approveServiceRequestWithNames = async (
    request: ServiceRequest,
    name: string,
    nameAr: string
  ) => {
    if (!user) {
      toast.error(t('User not authenticated'));
      return;
    }

    if (!name.trim()) {
      toast.error(t('Please enter the English name'));
      return;
    }
    if (!nameAr.trim()) {
      toast.error(t('Please enter the Arabic name'));
      return;
    }

    setApprovingRequestId(request.id);
    try {
      await api.adminServices.approveServiceRequest(request.id, {
        name: name.trim(),
        name_ar: nameAr.trim(),
      });

      toast.success(t('Service request approved and added successfully!'));
      setShowApproveServiceModal(false);
      setSelectedRequest(null);
      setApprovalName('');
      setApprovalNameAr('');
      fetchServiceRequests();
      fetchData();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error instanceof Error ? error.message : t('Failed to approve request'));
    } finally {
      setApprovingRequestId(null);
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    await approveServiceRequestWithNames(selectedRequest, approvalName, approvalNameAr);
  };

  const handleApproveServiceDirect = async (request: ServiceRequest) => {
    await approveServiceRequestWithNames(
      request,
      request.service_name || '',
      request.service_name_ar || ''
    );
  };

  // Handle reject request
  const handleRejectRequest = async () => {
    if (!selectedRequest || !user) {
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error(t('Please provide a reason for rejection'));
      return;
    }

    try {
      await api.adminServices.rejectServiceRequest(selectedRequest.id, rejectionReason.trim());

      toast.success(t('Service request rejected'));
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRequest(null);
      fetchServiceRequests(); // Refresh requests list
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(t('Failed to reject request'));
    }
  };

  const approveSpecialtyRequestWithNames = async (
    request: SpecialtyRequest,
    name: string,
    nameAr: string
  ) => {
    if (!user) {
      toast.error(t('User not authenticated'));
      return;
    }

    if (!name.trim()) {
      toast.error(t('Please enter the English name'));
      return;
    }
    if (!nameAr.trim()) {
      toast.error(t('Please enter the Arabic name'));
      return;
    }

    setApprovingRequestId(request.id);
    try {
      await api.adminServices.approveSpecialtyRequest(request.id, {
        name: name.trim(),
        name_ar: nameAr.trim(),
      });

      toast.success(t('Specialty request approved and added successfully!'));
      setShowApproveSpecialtyModal(false);
      setSelectedSpecialtyRequest(null);
      setApprovalName('');
      setApprovalNameAr('');
      fetchSpecialtyRequests();
      fetchData();
    } catch (error) {
      console.error('Error approving specialty request:', error);
      toast.error(error instanceof Error ? error.message : t('Failed to approve specialty request'));
    } finally {
      setApprovingRequestId(null);
    }
  };

  const handleApproveSpecialtyRequest = async () => {
    if (!selectedSpecialtyRequest) return;
    await approveSpecialtyRequestWithNames(selectedSpecialtyRequest, approvalName, approvalNameAr);
  };

  const handleApproveSpecialtyDirect = async (request: SpecialtyRequest) => {
    await approveSpecialtyRequestWithNames(
      request,
      request.specialty_name || '',
      request.specialty_name_ar || ''
    );
  };

  // Handle reject specialty request
  const handleRejectSpecialtyRequest = async () => {
    if (!selectedSpecialtyRequest || !user) {
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error(t('Please provide a reason for rejection'));
      return;
    }

    try {
      await api.adminServices.rejectSpecialtyRequest(selectedSpecialtyRequest.id, rejectionReason.trim());

      toast.success(t('Specialty request rejected'));
      setShowRejectSpecialtyModal(false);
      setRejectionReason('');
      setSelectedSpecialtyRequest(null);
      fetchSpecialtyRequests(); // Refresh requests list
    } catch (error) {
      console.error('Error rejecting specialty request:', error);
      toast.error(t('Failed to reject request'));
    }
  };

  // Show all services (no filtering)
  const filteredServices = services;

  // Use table sort hook for column sorting
  const { sortedData: sortedServices, handleSort, getSortDirection } = useTableSort<Service>(
    filteredServices
  );

  // Group services by specialty for display (after sorting)
  const groupedServices = sortedServices.reduce((acc, service) => {
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('Specialties & Services')}</h1>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowAddSpecialtyModal(true)}
                  className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243] font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('Add Specialty')}
                </Button>
                <Button
                  onClick={() => setShowAddServiceModal(true)}
                  className="bg-[#0C2243] hover:bg-[#0C2243]/90 text-white font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('Add Service')}
                </Button>
              </div>
            </div>

            {/* Specialty Requests Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Pending Specialty Requests')}</h2>
                <span className="px-3 py-1 bg-[#00FFA2] text-[#0C2243] rounded-full text-sm font-medium">
                  {specialtyRequests.length} {t('Pending')}
                </span>
              </div>
              
              {loadingSpecialtyRequests ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">{t('Loading requests...')}</p>
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
                              {localizedStoredText(request.specialty_name, request.specialty_name_ar, i18n.language)}
                            </h3>
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded text-xs font-medium">
                              {t('Pending')}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <p><span className="font-medium">{t('Clinic')}:</span> {request.clinic_name || t('N/A')}</p>
                            <p><span className="font-medium">{t('Requested')}:</span> {new Date(request.requested_at).toLocaleDateString()}</p>
                            {request.description && (
                              <p><span className="font-medium">{t('Description')}:</span> {request.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            onClick={() => handleApproveSpecialtyDirect(request)}
                            className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243] font-medium"
                            size="sm"
                            disabled={approvingRequestId === request.id}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {t('Approve')}
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedSpecialtyRequest(request);
                              setApprovalName(request.specialty_name || '');
                              setApprovalNameAr(request.specialty_name_ar || '');
                              setShowApproveSpecialtyModal(true);
                            }}
                            variant="outline"
                            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            size="sm"
                            disabled={approvingRequestId === request.id}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            {t('Edit')}
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedSpecialtyRequest(request);
                              setShowRejectSpecialtyModal(true);
                            }}
                            variant="outline"
                            className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            size="sm"
                            disabled={approvingRequestId === request.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            {t('Reject')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">{t('No pending specialty requests')}</p>
                </div>
              )}
            </div>

            {/* Service Requests Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('Pending Service Requests')}</h2>
                <span className="px-3 py-1 bg-[#00FFA2] text-[#0C2243] rounded-full text-sm font-medium">
                  {serviceRequests.length} {t('Pending')}
                </span>
              </div>
              
              {loadingRequests ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">{t('Loading requests...')}</p>
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
                              {localizedStoredText(request.service_name, request.service_name_ar, i18n.language)}
                            </h3>
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded text-xs font-medium">
                              {t('Pending')}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <p><span className="font-medium">{t('Specialty')}:</span> {request.specialty_name || t('N/A')}</p>
                            <p><span className="font-medium">{t('Clinic')}:</span> {request.clinic_name || t('N/A')}</p>
                            <p><span className="font-medium">{t('Requested')}:</span> {new Date(request.requested_at).toLocaleDateString()}</p>
                            {request.description && (
                              <p><span className="font-medium">{t('Description')}:</span> {request.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            onClick={() => handleApproveServiceDirect(request)}
                            className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243] font-medium"
                            size="sm"
                            disabled={approvingRequestId === request.id}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {t('Approve')}
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedRequest(request);
                              setApprovalName(request.service_name || '');
                              setApprovalNameAr(request.service_name_ar || '');
                              setShowApproveServiceModal(true);
                            }}
                            variant="outline"
                            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            size="sm"
                            disabled={approvingRequestId === request.id}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            {t('Edit')}
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRejectModal(true);
                            }}
                            variant="outline"
                            className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            size="sm"
                            disabled={approvingRequestId === request.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            {t('Reject')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">{t('No pending service requests')}</p>
                </div>
              )}
            </div>

            {/* Specialties Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('Specialties')}</h2>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">{t('Loading specialties...')}</p>
                </div>
              ) : specialties.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {specialties.map((specialty) => (
                    <div
                      key={specialty.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {localizedStoredText(specialty.name, specialty.name_ar, i18n.language)}
                        </h3>
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
                  <p className="text-gray-500 dark:text-gray-400">{t('No specialties found. Add your first specialty!')}</p>
                </div>
              )}
            </div>

            {/* Services Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('Services')}</h2>
              </div>
              
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">{t('Loading services...')}</p>
                </div>
              ) : Object.keys(groupedServices).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <TableSortHeader
                          sortDirection={getSortDirection('specialty_name')}
                          onSort={() => handleSort('specialty_name')}
                          className="w-1/4"
                        >
                          {t('Specialty')}
                        </TableSortHeader>
                        <TableSortHeader
                          sortDirection={getSortDirection('name')}
                          onSort={() => handleSort('name')}
                        >
                          {t('Service Name')}
                        </TableSortHeader>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white w-24">
                          {t('Actions')}
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
                            {localizedStoredText(specialtyName, serviceList[0]?.specialty_name_ar, i18n.language)}
                          </td>
                          <td className="py-4 px-4 align-middle">
                            <div className="flex flex-wrap gap-2">
                              {serviceList.map((service) => (
                                <span
                                  key={service.id}
                                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 whitespace-nowrap"
                                >
                                  {localizedStoredText(service.name, service.name_ar, i18n.language)}
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
                                        <span className="text-sm text-gray-900 dark:text-gray-100">{t('Edit')}</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setDeletingService(service);
                                          setShowDeleteServiceModal(true);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-red-600 dark:text-red-400"
                                      >
                                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                        <span className="text-sm">{t('Delete')}</span>
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
                  <p className="text-gray-500 dark:text-gray-400">{t('No services found. Add your first service!')}</p>
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
            <DialogTitle>{t('Add New Specialty')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Specialty name (English)')} *</Label>
              <Input
                value={newSpecialty.name}
                onChange={(e) => setNewSpecialty({ ...newSpecialty, name: e.target.value })}
                placeholder={t('e.g., Cardiology')}
              />
            </div>
            <div>
              <Label>{t('Specialty name (Arabic)')} *</Label>
              <Input
                dir="rtl"
                value={newSpecialty.name_ar}
                onChange={(e) => setNewSpecialty({ ...newSpecialty, name_ar: e.target.value })}
                placeholder={t('e.g., Cardiology in Arabic')}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('Arabic is shown when the app language is Arabic')}
              </p>
            </div>
            <div>
              <Label>{t('Description')}</Label>
              <Textarea
                value={newSpecialty.description}
                onChange={(e) => setNewSpecialty({ ...newSpecialty, description: e.target.value })}
                placeholder={t('Optional description')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSpecialtyModal(false)}>{t('Cancel')}</Button>
            <Button onClick={handleAddSpecialty} className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243]">
              {t('Add Specialty')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Specialty Modal */}
      <Dialog open={showEditSpecialtyModal} onOpenChange={setShowEditSpecialtyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Edit Specialty')}</DialogTitle>
          </DialogHeader>
          {editingSpecialty && (
            <div className="space-y-4">
              <div>
                <Label>{t('Specialty name (English)')} *</Label>
                <Input
                  value={editingSpecialty.name}
                  onChange={(e) => setEditingSpecialty({ ...editingSpecialty, name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('Specialty name (Arabic)')}</Label>
                <Input
                  dir="rtl"
                  value={editingSpecialty.name_ar || ''}
                  onChange={(e) => setEditingSpecialty({ ...editingSpecialty, name_ar: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('Description')}</Label>
                <Textarea
                  value={editingSpecialty.description || ''}
                  onChange={(e) => setEditingSpecialty({ ...editingSpecialty, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditSpecialtyModal(false)}>{t('Cancel')}</Button>
            <Button onClick={handleEditSpecialty} className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243]">
              {t('Save Changes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Specialty Modal */}
      <Dialog open={showDeleteSpecialtyModal} onOpenChange={setShowDeleteSpecialtyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete Specialty')}</DialogTitle>
          </DialogHeader>
          {deletingSpecialty && (
            <p className="text-gray-600 dark:text-gray-400">
              {t('Are you sure you want to delete "{{name}}"? This will also delete all services under this specialty.', { name: deletingSpecialty.name })}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteSpecialtyModal(false)}>{t('Cancel')}</Button>
            <Button onClick={handleDeleteSpecialty} className="bg-red-500 hover:bg-red-600 text-white">
              {t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Service Modal */}
      <Dialog open={showAddServiceModal} onOpenChange={setShowAddServiceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Add New Service')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Specialty')} *</Label>
              <Select value={newService.specialty_id} onValueChange={(value) => setNewService({ ...newService, specialty_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select a specialty')} />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty.id} value={specialty.id}>
                      {localizedStoredText(specialty.name, specialty.name_ar, i18n.language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('Service name (English)')} *</Label>
              <Input
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                placeholder={t('e.g., Consultation')}
              />
            </div>
            <div>
              <Label>{t('Service name (Arabic)')} *</Label>
              <Input
                dir="rtl"
                value={newService.name_ar}
                onChange={(e) => setNewService({ ...newService, name_ar: e.target.value })}
                placeholder={t('e.g., Consultation in Arabic')}
              />
            </div>
            <div>
              <Label>{t('Description')}</Label>
              <Textarea
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                placeholder={t('Optional description')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddServiceModal(false)}>{t('Cancel')}</Button>
            <Button onClick={handleAddService} className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243]">
              {t('Add Service')}
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
            <DialogTitle>{t('Edit Service')}</DialogTitle>
          </DialogHeader>
          {editingService && (
            <div className="space-y-4">
              <div>
                <Label>{t('Specialty')} *</Label>
                <Select value={editingService.specialty_id} onValueChange={(value) => setEditingService({ ...editingService, specialty_id: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty.id} value={specialty.id}>
                        {localizedStoredText(specialty.name, specialty.name_ar, i18n.language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('Service name (English)')} *</Label>
                <Input
                  value={editingService.name}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  placeholder={t('Enter service name')}
                />
              </div>
              <div>
                <Label>{t('Service name (Arabic)')}</Label>
                <Input
                  dir="rtl"
                  value={editingService.name_ar || ''}
                  onChange={(e) => setEditingService({ ...editingService, name_ar: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('Description')}</Label>
                <Textarea
                  value={editingService.description || ''}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  placeholder={t('Optional description')}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditServiceModal(false);
              setEditingService(null);
            }}>{t('Cancel')}</Button>
            <Button onClick={handleEditService} className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243]">
              {t('Save Changes')}
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
            <DialogTitle>{t('Delete Service')}</DialogTitle>
          </DialogHeader>
          {deletingService && (
            <div className="space-y-2">
              <p className="text-gray-600 dark:text-gray-400">
                {t('Are you sure you want to delete the service "{{name}}"?', { name: deletingService.name })}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('This action cannot be undone. The service will be removed from the system.')}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteServiceModal(false);
              setDeletingService(null);
            }}>{t('Cancel')}</Button>
            <Button onClick={handleDeleteService} className="bg-red-500 hover:bg-red-600 text-white">
              {t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Request Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">{t('Reject Service Request')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('Service')}: <span className="font-semibold text-gray-900 dark:text-white">{selectedRequest?.service_name}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t('Clinic')}: <span className="font-semibold text-gray-900 dark:text-white">{selectedRequest?.clinic_name}</span>
              </p>
            </div>
            <div>
              <Label htmlFor="rejection-reason" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('Reason for Rejection')} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder={t('Please provide a reason for rejecting this service request...')}
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
              {t('Cancel')}
            </Button>
            <Button
              onClick={handleRejectRequest}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('Reject Request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Specialty Request Modal */}
      <Dialog open={showRejectSpecialtyModal} onOpenChange={setShowRejectSpecialtyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">{t('Reject Specialty Request')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('Specialty')}: <span className="font-semibold text-gray-900 dark:text-white">{selectedSpecialtyRequest?.specialty_name}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t('Clinic')}: <span className="font-semibold text-gray-900 dark:text-white">{selectedSpecialtyRequest?.clinic_name}</span>
              </p>
            </div>
            <div>
              <Label htmlFor="rejection-reason-specialty" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('Reason for Rejection')} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejection-reason-specialty"
                placeholder={t('Please provide a reason for rejecting this specialty request...')}
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
              {t('Cancel')}
            </Button>
            <Button
              onClick={handleRejectSpecialtyRequest}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('Reject Request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApproveSpecialtyModal} onOpenChange={setShowApproveSpecialtyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">{t('Approve Specialty Request')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('Edit the English and Arabic names if needed before approving.')}
            </p>
            <div>
              <Label>{t('Official English name')}</Label>
              <Input
                value={approvalName}
                onChange={(e) => setApprovalName(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('Official Arabic name')}</Label>
              <Input
                dir="rtl"
                value={approvalNameAr}
                onChange={(e) => setApprovalNameAr(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveSpecialtyModal(false);
                setSelectedSpecialtyRequest(null);
                setApprovalName('');
                setApprovalNameAr('');
              }}
            >
              {t('Cancel')}
            </Button>
            <Button onClick={handleApproveSpecialtyRequest} className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243]">
              {t('Approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApproveServiceModal} onOpenChange={setShowApproveServiceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">{t('Approve Service Request')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('Edit the English and Arabic names if needed before approving.')}
            </p>
            <div>
              <Label>{t('Official English name')}</Label>
              <Input
                value={approvalName}
                onChange={(e) => setApprovalName(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('Official Arabic name')}</Label>
              <Input
                dir="rtl"
                value={approvalNameAr}
                onChange={(e) => setApprovalNameAr(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveServiceModal(false);
                setSelectedRequest(null);
                setApprovalName('');
                setApprovalNameAr('');
              }}
            >
              {t('Cancel')}
            </Button>
            <Button onClick={handleApproveRequest} className="bg-[#00FFA2] hover:bg-[#00FFA2]/90 text-[#0C2243]">
              {t('Approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
};

export default AdminServices;
