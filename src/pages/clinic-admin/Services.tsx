import React, { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClinicAdminSidebar from '@/components/clinic-admin/ClinicAdminSidebar';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingClinic, setCheckingClinic] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');

  useEffect(() => {
    const checkClinicExists = async () => {
      if (!user) return;

      try {
        // Check clinic via backend
        const { clinic: clinicData } = await api.clinicAdmin.getClinic();

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
      console.log('🔍 Fetching services for clinic via backend:', clinicId);

      // Fetch doctors for this clinic via backend
      const { doctors: doctorsData } = await api.doctors.getDoctors(clinicId);

      if (!doctorsData) {
        console.error('❌ No doctors data returned');
        setDoctors([]);
      } else {
        // Filter active doctors only (backend should already filter, but double-check)
        const activeDoctors = doctorsData.filter((d: any) => d.status === 'active');
        console.log('✅ Doctors fetched from backend:', activeDoctors.length);
        setDoctors(activeDoctors);
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

  // Get unique specialties for filter dropdown
  const uniqueSpecialties = useMemo(() => {
    return Array.from(new Set(services.map(s => s.specialty))).sort();
  }, [services]);

  // Filter services
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSpecialty = selectedSpecialty === 'all' || service.specialty === selectedSpecialty;
      const matchesSearch = searchQuery === '' ||
        service.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.doctorName.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSpecialty && matchesSearch;
    });
  }, [services, selectedSpecialty, searchQuery]);

  // Group by specialty for display - collect all unique services and doctors per specialty
  const groupedBySpecialty = useMemo(() => {
    return filteredServices.reduce((acc, service) => {
      if (!acc[service.specialty]) {
        acc[service.specialty] = {
          services: new Set<string>(),
          doctors: new Set<string>() // Store unique doctor names per specialty
        };
      }
      acc[service.specialty].services.add(service.service);
      // Add doctor name to the set (automatically handles duplicates)
      acc[service.specialty].doctors.add(service.doctorName);
      return acc;
    }, {} as Record<string, {services: Set<string>, doctors: Set<string>}>);
  }, [filteredServices]);

  if (checkingClinic) {
    return (
      <ProtectedRoute allowedRoles={['clinic_admin']}>
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0C2243] dark:border-[#00FFA2] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{t('Loading...')}</p>
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('Specialties & Services')}</h1>
              
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
                    <SelectValue placeholder={t('Specialty')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Specialties')}</SelectItem>
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
                  placeholder={t('Search by specialties, doctor, or service...')}
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
                  <p className="text-gray-500 dark:text-gray-400">{t('Loading services...')}</p>
                </div>
              ) : filteredServices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white w-1/5">
                          {t('Specialties')}
                        </th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                          {t('Services')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedBySpecialty).map(([specialtyName, specialtyData]) => {
                        const servicesArray = Array.from(specialtyData.services);

                        return (
                          <tr
                            key={specialtyName}
                            className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <td className="py-4 px-4 text-sm text-gray-900 dark:text-white font-semibold w-1/5 align-middle">
                              {specialtyName}
                            </td>
                            <td className="py-4 px-4 align-middle">
                              <div className="flex flex-wrap gap-2">
                                {servicesArray.map((service, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                                  >
                                    {service}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">{t('No services found')}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    {t('Add doctors with services in the "Doctors & Treatment" section to see services here.')}
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
