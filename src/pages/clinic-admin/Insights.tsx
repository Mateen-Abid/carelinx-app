import React, { useEffect, useState, useRef } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ClinicAdminSidebar from '@/components/clinic-admin/ClinicAdminSidebar';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Clinic {
  id: string;
  name: string;
  logo_url: string | null;
  specialties?: string[] | null;
}

const ClinicAdminInsights = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [checkingClinic, setCheckingClinic] = useState(true);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  
  // Monthly Trends
  const [monthlyTrends, setMonthlyTrends] = useState<Array<{month: string, appointments: number}>>([]);
  const [trendPeriod, setTrendPeriod] = useState<'yearly' | 'monthly'>('yearly');
  const [loadingTrends, setLoadingTrends] = useState(false);
  
  // Appointments by Specialty
  const [specialtyDistribution, setSpecialtyDistribution] = useState<Array<{name: string, value: number, color: string}>>([]);
  const [loadingSpecialty, setLoadingSpecialty] = useState(false);
  
  // Colors for specialty chart
  const SPECIALTY_COLORS = [
    '#9333EA', // Purple - Cardiology
    '#3B82F6', // Light Blue - Dermatology
    '#EF4444', // Red - Pediatrics
    '#10B981', // Teal/Green - General Check-up
    '#EC4899', // Pink - Others
  ];

  useEffect(() => {
    const checkClinicExists = async () => {
      if (!user) return;

      try {
        // Check if clinic exists for this clinic admin via backend
        const { clinic: clinicData } = await api.clinicAdmin.getClinic();

        // If no clinic exists, redirect to onboarding
        if (!clinicData) {
          console.log('No clinic found, redirecting to onboarding');
          navigate('/clinic-admin/onboarding', { replace: true });
          return;
        }

        // If clinic exists but status is pending (onboarding incomplete), redirect to onboarding
        if (clinicData.status === 'pending') {
          console.log('Clinic onboarding incomplete, redirecting to onboarding');
          navigate('/clinic-admin/onboarding', { replace: true });
          return;
        }

        // Clinic exists and is active
        setClinic(clinicData);
        setCheckingClinic(false);
      } catch (error) {
        console.error('Error in checkClinicExists:', error);
        setCheckingClinic(false);
      }
    };

    checkClinicExists();
  }, [user, navigate]);

  const hasLoadedSpecialty = useRef(false);

  // Fetch trends when clinic loads or period changes
  useEffect(() => {
    if (!clinic?.id) return;
    if (!hasLoadedSpecialty.current) {
      hasLoadedSpecialty.current = true;
      Promise.all([
        fetchMonthlyTrends(clinic.id),
        fetchSpecialtyDistribution(clinic.id),
      ]);
      return;
    }
    fetchMonthlyTrends(clinic.id);
  }, [clinic?.id, trendPeriod]);

  const fetchMonthlyTrends = async (clinicId: string) => {
    try {
      setLoadingTrends(true);
      
      // Get date range based on period
      const today = new Date();
      const startDate = new Date();
      
      if (trendPeriod === 'yearly') {
        // Last 12 months
        startDate.setMonth(startDate.getMonth() - 12);
      } else {
        // Last 30 days
        startDate.setDate(startDate.getDate() - 30);
      }
      
      // Fetch bookings for this clinic via backend
      const { bookings: allBookings } = await api.clinicAdmin.getInsightsBookings(
        startDate.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );
      
      // Filter to only get appointment_date and status
      const bookingsData = allBookings.map((b: any) => ({
        appointment_date: b.appointment_date,
        status: b.status
      }));

      // Group appointments by month
      const trendsMap = new Map<string, number>();
      
      // Initialize all months with 0
      const monthNames = [
        t('Jan'),
        t('Feb'),
        t('Mar'),
        t('Apr'),
        t('May'),
        t('Jun'),
        t('Jul'),
        t('Aug'),
        t('Sep'),
        t('Oct'),
        t('Nov'),
        t('Dec'),
      ];
      
      if (trendPeriod === 'yearly') {
        // Initialize last 12 months
        for (let i = 11; i >= 0; i--) {
          const date = new Date(today);
          date.setMonth(date.getMonth() - i);
          const monthKey = `${monthNames[date.getMonth()]}`;
          trendsMap.set(monthKey, 0);
        }
      } else {
        // Initialize last 30 days (group by week or day)
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const monthKey = `${date.getDate()}/${date.getMonth() + 1}`;
          trendsMap.set(monthKey, 0);
        }
      }
      
      // Count appointments per month
      bookingsData.forEach((booking: any) => {
        if (!booking.appointment_date) return;
        
        const bookingDate = new Date(booking.appointment_date);
        let monthKey: string;
        
        if (trendPeriod === 'yearly') {
          monthKey = monthNames[bookingDate.getMonth()];
        } else {
          monthKey = `${bookingDate.getDate()}/${bookingDate.getMonth() + 1}`;
        }
        
        const currentCount = trendsMap.get(monthKey) || 0;
        trendsMap.set(monthKey, currentCount + 1);
      });
      
      // Convert to array format for chart
      const trendsArray = Array.from(trendsMap.entries()).map(([month, appointments]) => ({
        month,
        appointments
      }));
      
      setMonthlyTrends(trendsArray);
    } catch (error) {
      console.error('Error fetching monthly trends:', error);
    } finally {
      setLoadingTrends(false);
    }
  };

  const fetchSpecialtyDistribution = async (clinicId: string) => {
    try {
      setLoadingSpecialty(true);
      
      // Get clinic specialties - only show specialties that this clinic provides
      const clinicSpecialties = clinic?.specialties || [];
      
      if (!clinicSpecialties || clinicSpecialties.length === 0) {
        setSpecialtyDistribution([]);
        setLoadingSpecialty(false);
        return;
      }

      // Create a flexible matching function for specialty variations
      const normalizeSpecialty = (name: string): string => {
        return name.toLowerCase().trim()
          .replace(/dentistry/gi, 'dental') // Normalize "Dentistry" to "Dental"
          .replace(/dermatology/gi, 'dermatology')
          .replace(/cardiology/gi, 'cardiology')
          .replace(/pediatrics/gi, 'pediatrics')
          .replace(/surgery/gi, 'surgery')
          .replace(/general\s+medicine/gi, 'general medicine')
          .replace(/general\s+practice/gi, 'general practice');
      };
      
      // Create normalized maps for flexible matching
      const clinicSpecialtyMap = new Map<string, string>(); // normalized -> original
      clinicSpecialties.forEach((specialty: string) => {
        const normalized = normalizeSpecialty(specialty);
        // Store the original name (preserve case from clinic specialties)
        // If multiple specialties normalize to same value, keep the first one
        if (!clinicSpecialtyMap.has(normalized)) {
          clinicSpecialtyMap.set(normalized, specialty);
        }
      });
      
      // Also create a reverse map for partial matching (booking specialty -> clinic specialty)
      const specialtyVariations = new Map<string, string>(); // booking variation -> clinic specialty
      clinicSpecialties.forEach((clinicSpecialty: string) => {
        const normalized = normalizeSpecialty(clinicSpecialty);
        specialtyVariations.set(normalized, clinicSpecialty);
        
        // Add common variations
        if (normalized.includes('dental')) {
          specialtyVariations.set('dentistry', clinicSpecialty);
          specialtyVariations.set('dental', clinicSpecialty);
        }
        if (normalized.includes('dermatology')) {
          specialtyVariations.set('dermatology', clinicSpecialty);
          specialtyVariations.set('dermatologist', clinicSpecialty);
        }
      });
      
      // Fetch bookings for this clinic via backend
      const { bookings: allBookings } = await api.clinicAdmin.getBookings();
      
      // Filter to only get specialty and status
      const bookingsData = allBookings.map((b: any) => ({
        specialty: b.specialty,
        status: b.status
      }));

      // Group appointments by specialty - only count clinic's specialties
      const specialtyMap = new Map<string, number>();
      
      // Initialize all clinic specialties with 0
      clinicSpecialties.forEach((specialty: string) => {
        specialtyMap.set(specialty, 0);
      });
      
      // Count appointments only for clinic's specialties (with flexible matching)
      bookingsData.forEach((booking: any) => {
        if (!booking.specialty) return;
        
        const bookingSpecialty = booking.specialty.trim();
        const normalizedBooking = normalizeSpecialty(bookingSpecialty);
        
        // Try exact match first
        let matchingSpecialty: string | undefined = clinicSpecialtyMap.get(normalizedBooking);
        
        // If no exact match, try partial matching
        if (!matchingSpecialty) {
          // Check if booking specialty contains any clinic specialty or vice versa
          for (const [normalizedClinic, originalClinic] of clinicSpecialtyMap.entries()) {
            if (normalizedBooking.includes(normalizedClinic) || normalizedClinic.includes(normalizedBooking)) {
              matchingSpecialty = originalClinic;
              break;
            }
          }
        }
        
        // If still no match, try variations map
        if (!matchingSpecialty) {
          matchingSpecialty = specialtyVariations.get(normalizedBooking);
        }
        
        if (matchingSpecialty) {
          const currentCount = specialtyMap.get(matchingSpecialty) || 0;
          specialtyMap.set(matchingSpecialty, currentCount + 1);
        }
      });
      
      // Convert to array and sort by count (descending)
      // Show all clinic specialties, even if they have 0 appointments
      const specialtyArray = Array.from(specialtyMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      
      // Map to chart data with colors
      const chartData = specialtyArray.map((item, index) => ({
        name: item.name,
        value: item.value,
        color: SPECIALTY_COLORS[index % SPECIALTY_COLORS.length]
      }));
      
      setSpecialtyDistribution(chartData);
    } catch (error) {
      console.error('Error fetching specialty distribution:', error);
    } finally {
      setLoadingSpecialty(false);
    }
  };

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
          <div className="p-8">
            {/* Page Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('Insights')}</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('Analyze appointment trends and specialty distribution')}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Clinic Name and Logo */}
                {clinic?.logo_url && (
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-[#00FFA2] flex items-center justify-center flex-shrink-0">
                    <img
                      src={clinic.logo_url}
                      alt={clinic.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initial if image fails to load
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
                  {clinic?.name || t('Clinic')}
                </span>
              </div>
            </div>

            {/* Charts Section - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointment Trend Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                      {t('Appointment Trend')}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('Monitor how appointments fluctuate across selected periods')}
                    </p>
                  </div>
                  <Select value={trendPeriod} onValueChange={(value: 'yearly' | 'monthly') => setTrendPeriod(value)}>
                    <SelectTrigger className="w-[140px] bg-white dark:bg-[#0C2243] border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                      <SelectValue className="text-gray-900 dark:text-white" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <SelectItem value="yearly" className="text-gray-900 dark:text-white focus:bg-gray-100 dark:focus:bg-gray-700">{t('Yearly')}</SelectItem>
                      <SelectItem value="monthly" className="text-gray-900 dark:text-white focus:bg-gray-100 dark:focus:bg-gray-700">{t('Monthly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {loadingTrends ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2]"></div>
                  </div>
                ) : monthlyTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#E5E7EB"} />
                      <XAxis 
                        dataKey="month" 
                        stroke={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        style={{ fontSize: '12px', fill: isDarkMode ? '#9CA3AF' : '#6B7280' }}
                      />
                      <YAxis 
                        stroke={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        style={{ fontSize: '12px', fill: isDarkMode ? '#9CA3AF' : '#6B7280' }}
                        domain={[0, 'dataMax + 100']}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: isDarkMode ? '#1F2937' : '#fff', 
                          border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                          borderRadius: '8px',
                          color: isDarkMode ? '#F9FAFB' : '#111827'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="appointments" 
                        stroke={isDarkMode ? "#00FFA2" : "#0C2243"} 
                        strokeWidth={2}
                        dot={{ fill: isDarkMode ? "#00FFA2" : "#0C2243", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                    <p>{t('No appointment data available for the selected period')}</p>
                  </div>
                )}
              </div>

              {/* Appointments by Specialty Donut Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    {t('Appointments by Specialty')}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('Distribution of appointments across medical specialties')}
                  </p>
                </div>
                
                {loadingSpecialty ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C2243] dark:border-[#00FFA2]"></div>
                  </div>
                ) : specialtyDistribution.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={specialtyDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {specialtyDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-6 w-full">
                      <div className="flex flex-wrap gap-4 justify-center">
                        {specialtyDistribution.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {item.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                    <p>{t('No specialty data available')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default ClinicAdminInsights;

