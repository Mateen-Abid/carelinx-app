import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClinicAdminSidebar from '@/components/clinic-admin/ClinicAdminSidebar';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  status: string;
  services?: string | null; // Services column from database
}

interface ServiceRow {
  specialty: string;
  service: string;
  doctorName: string;
  doctorId: string;
}

interface Clinic {
  id: string;
  name: string;
  logo_url: string | null;
  specialties: string[] | null;
}

const ClinicAdminServices = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingClinic, setCheckingClinic] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    const checkClinicExists = async () => {
      if (!user) return;

      try {
        const { data: clinicData, error } = await supabase
          .from('clinics')
          .select('id, name, status, logo_url, specialties')
          .eq('clinic_admin_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking clinic:', error);
          setCheckingClinic(false);
          return;
        }

        if (!clinicData || clinicData.status === 'pending') {
          navigate('/clinic-admin/onboarding', { replace: true });
          return;
        }

        setClinic(clinicData);
        setCheckingClinic(false);
      } catch (error) {
        console.error('Error in checkClinicExists:', error);
        setCheckingClinic(false);
      }
    };

    checkClinicExists();
  }, [user, navigate]);

  useEffect(() => {
    if (clinic?.id) {
      fetchServices(clinic.id);
    }
  }, [clinic?.id]);

  const fetchServices = async (clinicId: string) => {
    try {
      setLoading(true);
      console.log('🔍 Fetching services for clinic:', clinicId);

      // Fetch doctors for this clinic
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('doctors')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('status', 'active')
        .order('specialty', { ascending: true })
        .order('name', { ascending: true });

      if (doctorsError) {
        console.error('❌ Error fetching doctors:', doctorsError);
        setDoctors([]);
      } else {
        console.log('✅ Doctors fetched:', doctorsData?.length || 0);
        setDoctors(doctorsData || []);
      }

      // Create service rows for each doctor individually
      // This ensures that if multiple doctors have the same specialty and services,
      // they will all appear as separate entries
      const serviceRows: ServiceRow[] = [];

      // Process each doctor individually
      doctorsData?.forEach((doctor) => {
        // Only process doctors that have services in the database
        if (doctor.services && doctor.services.trim().length > 0) {
          // Parse comma-separated services string
          const doctorServices = doctor.services.split(',').map(s => s.trim()).filter(s => s.length > 0);
          
          // Create a service row for each service this doctor provides
          doctorServices.forEach(service => {
            serviceRows.push({
              specialty: doctor.specialty,
              service: service,
              doctorName: doctor.name,
              doctorId: doctor.id,
            });
          });
        }
      });

      setServices(serviceRows);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching services:', error);
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedServices.length === filteredServices.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices(filteredServices.map(s => `${s.specialty}-${s.service}`));
    }
  };

  const handleSelectService = (specialty: string, service: string) => {
    const key = `${specialty}-${service}`;
    setSelectedServices((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Get unique specialties for filter dropdown
  const uniqueSpecialties = Array.from(new Set(services.map(s => s.specialty))).sort();

  // Filter services
  const filteredServices = services.filter((service) => {
    const matchesSpecialty = selectedSpecialty === 'all' || service.specialty === selectedSpecialty;
    const matchesSearch = searchQuery === '' ||
      service.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.doctorName.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSpecialty && matchesSearch;
  });

  // Group by specialty and doctor for display
  const groupedBySpecialtyAndDoctor = filteredServices.reduce((acc, service) => {
    const key = `${service.specialty}-${service.doctorName}`;
    if (!acc[key]) {
      acc[key] = {
        specialty: service.specialty,
        doctorName: service.doctorName,
        services: [] as string[]
      };
    }
    if (!acc[key].services.includes(service.service)) {
      acc[key].services.push(service.service);
    }
    return acc;
  }, {} as Record<string, { specialty: string; doctorName: string; services: string[] }>);

  if (checkingClinic) {
    return (
      <ProtectedRoute allowedRoles={['clinic_admin']}>
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['clinic_admin']}>
      <div className={`min-h-screen flex ${isDarkMode ? 'dark' : ''}`}>
        <ClinicAdminSidebar isDarkMode={isDarkMode} onDarkModeToggle={toggleDarkMode} />
        
        <main className="flex-1 bg-[#F7F7F7] dark:bg-gray-900 min-h-screen overflow-y-auto">
          {/* Blue Bar at Top */}
          <div className="h-1 bg-[#0C2243] w-full"></div>
          
          <div className="p-8">
            {/* Page Header */}
            <div className="flex items-start justify-between mb-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Specialties & Services</h1>
              
              {/* Clinic Name, Logo, and Specialty Dropdown */}
              <div className="flex flex-col items-end gap-3">
                {/* Clinic Name and Logo */}
                <div className="flex items-center gap-3">
                  {clinic?.logo_url && (
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#00FFA2] flex items-center justify-center flex-shrink-0">
                      <img
                        src={clinic.logo_url}
                        alt={clinic.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  {!clinic?.logo_url && (
                    <div className="w-10 h-10 rounded-full bg-[#00FFA2] flex items-center justify-center flex-shrink-0">
                      <span className="text-[#0C2243] font-bold text-lg">
                        {clinic?.name?.charAt(0).toUpperCase() || 'C'}
                      </span>
                    </div>
                  )}
                  <span className="text-gray-900 dark:text-white font-medium text-base">
                    {clinic?.name || 'Clinic'}
                  </span>
                </div>
                
                {/* Specialty Filter Dropdown */}
                <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                  <SelectTrigger className="w-[200px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg h-10">
                    <SelectValue placeholder="Specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specialties</SelectItem>
                    {uniqueSpecialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by specialties, doctor, or service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-lg h-10"
                />
              </div>
            </div>

            {/* Services Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading services...</p>
                </div>
              ) : filteredServices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <th className="text-left py-4 px-4 w-12">
                          <input
                            type="checkbox"
                            checked={selectedServices.length === filteredServices.length && filteredServices.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                          />
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white w-1/4">
                          Specialties
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white w-1/3">
                          Services
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          Doctor's Name
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedBySpecialtyAndDoctor).map(([key, group]) => {
                        const allServiceKeys = group.services.map(service => `${group.specialty}-${service}`);
                        const allSelected = allServiceKeys.every(key => selectedServices.includes(key));
                        const someSelected = allServiceKeys.some(key => selectedServices.includes(key));
                        
                        return (
                          <tr
                            key={key}
                            className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <td className="py-4 px-4 w-12 align-top">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(input) => {
                                  if (input) input.indeterminate = someSelected && !allSelected;
                                }}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Select all services for this specialty-doctor combination
                                    const newSelections = allServiceKeys.filter(k => !selectedServices.includes(k));
                                    setSelectedServices([...selectedServices, ...newSelections]);
                                  } else {
                                    // Deselect all services for this specialty-doctor combination
                                    setSelectedServices(selectedServices.filter(k => !allServiceKeys.includes(k)));
                                  }
                                }}
                                className="w-4 h-4 text-[#00FFA2] border-gray-300 rounded focus:ring-[#00FFA2]"
                              />
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-900 dark:text-white font-semibold w-1/4 align-top">
                              {group.specialty}
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400 align-top">
                              <div className="flex flex-wrap gap-2">
                                {group.services.map((service, idx) => {
                                  const serviceKey = `${group.specialty}-${service}`;
                                  const isSelected = selectedServices.includes(serviceKey);
                                  return (
                                    <span
                                      key={idx}
                                      className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                                        isSelected 
                                          ? 'bg-[#00FFA2]/20 text-[#0C2243] border border-[#00FFA2]' 
                                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                                      }`}
                                    >
                                      {service}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400 align-top">
                              {group.doctorName}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No services found</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    Add doctors with services in the "Doctors & Treatment" section to see services here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default ClinicAdminServices;
