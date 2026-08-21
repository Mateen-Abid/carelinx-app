/**
 * Frontend API Service
 * 
 * This service layer:
 * 1. Calls YOUR backend (not Supabase directly)
 * 2. Sends httpOnly cookies automatically
 * 3. NEVER exposes Supabase credentials
 * 
 * Network tab will show:
 * ✅ POST http://localhost:3001/api/auth/signin
 * ❌ NO apikey
 * ❌ NO authorization header
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

/**
 * Helper function for API calls with automatic token refresh on 401
 * IMPORTANT: credentials: 'include' sends httpOnly cookies
 */
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> => {
  const maxRetries = 1; // Only retry once to avoid infinite loops
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // CRITICAL: Sends httpOnly cookies with every request
  });

  // If 401 Unauthorized, try refreshing token and retrying once
  if (response.status === 401 && retryCount < maxRetries) {
    console.log('🔄 401 Unauthorized - attempting token refresh...');
    try {
      // Try to refresh token
      await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('✅ Token refreshed, retrying original request...');
      // Retry the original request
      return fetchWithAuth(endpoint, options, retryCount + 1);
    } catch (refreshError) {
      console.error('❌ Token refresh failed:', refreshError);
      // If refresh fails, throw the original error
      const error = await response.json().catch(() => ({ error: 'Unauthorized' }));
      throw new Error(error.error || 'Unauthorized');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// Authentication API
export const authApi = {
  signIn: async (email: string, password: string) => {
    return fetchWithAuth('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  signUp: async (email: string, password: string, fullName: string, invitationToken?: string) => {
    return fetchWithAuth('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, invitation_token: invitationToken }),
    });
  },

  signOut: async () => {
    return fetchWithAuth('/auth/signout', {
      method: 'POST',
    });
  },

  getCurrentUser: async () => {
    try {
      return await fetchWithAuth('/auth/user');
    } catch (error) {
      return { user: null };
    }
  },

  getSession: async () => {
    try {
      return await fetchWithAuth('/auth/session');
    } catch (error) {
      return null;
    }
  },

  refreshToken: async () => {
    try {
      return await fetchWithAuth('/auth/refresh', {
        method: 'POST',
      });
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return null;
    }
  },

  confirmEmail: async () => {
    try {
      return await fetchWithAuth('/auth/confirm-email', {
        method: 'POST',
      });
    } catch (error) {
      console.error('❌ Confirm email error:', error);
      throw error;
    }
  },

  resendConfirmation: async (email: string) => {
    return fetchWithAuth('/auth/resend-confirmation', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (email: string) => {
    return fetchWithAuth('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  updatePassword: async (newPassword: string, accessToken: string, refreshToken: string) => {
    return fetchWithAuth('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword, accessToken, refreshToken }),
    });
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return fetchWithAuth('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

// Bookings API
export const bookingsApi = {
  getBookings: async () => {
    return fetchWithAuth('/bookings');
  },

  getOccupiedSlots: async (params: {
    date: string;
    doctorIds?: string[];
    doctorNames?: string[];
    treatmentIds?: string[];
    treatmentNames?: string[];
    clinicId?: string;
    clinic?: string;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('date', params.date);

    if (params.doctorIds?.length) {
      searchParams.set('doctor_ids', params.doctorIds.join(','));
    }

    if (params.doctorNames?.length) {
      searchParams.set('doctor_names', params.doctorNames.join(','));
    }

    if (params.treatmentIds?.length) {
      searchParams.set('treatment_ids', params.treatmentIds.join(','));
    }

    if (params.treatmentNames?.length) {
      searchParams.set('treatment_names', params.treatmentNames.join(','));
    }

    if (params.clinicId) {
      searchParams.set('clinic_id', params.clinicId);
    }

    if (params.clinic) {
      searchParams.set('clinic', params.clinic);
    }

    return fetchWithAuth(`/bookings/occupied-slots?${searchParams.toString()}`, {
      cache: 'no-store',
    });
  },

  getAllBookings: async () => {
    return fetchWithAuth('/bookings/all'); // Super Admin - get ALL bookings
  },

  createBooking: async (bookingData: any) => {
    return fetchWithAuth('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  updateBooking: async (id: string, updates: any) => {
    return fetchWithAuth(`/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
};

// Clinics API (Public)
export const clinicsApi = {
  getClinics: async () => {
    return fetchWithAuth('/clinics');
  },

  getClinic: async (id: string) => {
    return fetchWithAuth(`/clinics/${id}`);
  },

  getClinicByAdmin: async (adminId: string) => {
    return fetchWithAuth(`/clinics/by-admin/${adminId}`);
  },

  createClinic: async (clinicData: any) => {
    return fetchWithAuth('/clinics', {
      method: 'POST',
      body: JSON.stringify(clinicData),
    });
  },

  updateClinic: async (id: string, updates: any) => {
    return fetchWithAuth(`/clinics/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
};

// Doctors API (Public)
export const doctorsApi = {
  getDoctors: async (clinicId?: string, allStatuses?: boolean) => {
    let url = '/doctors';
    const params = new URLSearchParams();
    if (clinicId) params.append('clinic_id', clinicId);
    if (allStatuses) params.append('all', 'true');
    if (params.toString()) url += `?${params.toString()}`;
    return fetchWithAuth(url);
  },

  createDoctor: async (data: any) => {
    return fetchWithAuth('/doctors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getDoctorAppointments: async (doctorId: string) => {
    return fetchWithAuth(`/doctors/${doctorId}/appointments`);
  },

  updateDoctor: async (doctorId: string, updates: any) => {
    return fetchWithAuth(`/doctors/${doctorId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteDoctor: async (doctorId: string) => {
    return fetchWithAuth(`/doctors/${doctorId}`, {
      method: 'DELETE',
    });
  },
};

// Services API (Public)
export const servicesApi = {
  getSpecialties: async () => {
    return fetchWithAuth('/services/specialties');
  },

  getTreatments: async () => {
    return fetchWithAuth('/services/treatments');
  },

  getBookableTreatments: async (options?: { id?: string; clinicId?: string; specialty?: string }) => {
    const params = new URLSearchParams();
    if (options?.id) params.append('id', options.id);
    if (options?.clinicId) params.append('clinic_id', options.clinicId);
    if (options?.specialty) params.append('specialty', options.specialty);
    const query = params.toString();
    return fetchWithAuth(`/services/bookable-treatments${query ? `?${query}` : ''}`);
  },

  getApprovedClinicServices: async (options?: { id?: string; clinicId?: string }) => {
    const params = new URLSearchParams();
    if (options?.id) params.append('id', options.id);
    if (options?.clinicId) params.append('clinic_id', options.clinicId);
    const query = params.toString();
    return fetchWithAuth(`/services/approved-clinic-services${query ? `?${query}` : ''}`);
  },

  getClinicTreatments: async (clinicId: string, options?: { specialty?: string; service?: string }) => {
    const params = new URLSearchParams({ clinic_id: clinicId });
    if (options?.specialty) params.append('specialty', options.specialty);
    if (options?.service) params.append('service', options.service);
    return fetchWithAuth(`/services/clinic-treatments?${params.toString()}`);
  },
};

// User API
export const userApi = {
  getUserRole: async () => {
    return fetchWithAuth('/user/role');
  },
};

// Stats API
export const statsApi = {
  getDashboard: async () => {
    return fetchWithAuth('/stats/dashboard');
  },

  getClinicStats: async (clinicId: string) => {
    return fetchWithAuth(`/stats/clinic/${clinicId}`);
  },
};

// Admin Services API (Super Admin only)
export const adminServicesApi = {
  // Specialties
  getSpecialties: async () => fetchWithAuth('/admin-services/specialties'),
  createSpecialty: async (data: any) => fetchWithAuth('/admin-services/specialties', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateSpecialty: async (id: string, data: any) => fetchWithAuth(`/admin-services/specialties/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Services
  getServices: async () => fetchWithAuth('/admin-services/services'),
  createService: async (data: any) => fetchWithAuth('/admin-services/services', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateService: async (id: string, data: any) => fetchWithAuth(`/admin-services/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // Service Requests
  getServiceRequests: async () => fetchWithAuth('/admin-services/requests/services'),
  approveServiceRequest: async (id: string) => fetchWithAuth(`/admin-services/requests/services/${id}/approve`, {
    method: 'POST',
  }),
  rejectServiceRequest: async (id: string, rejectionReason: string) => fetchWithAuth(`/admin-services/requests/services/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejectionReason }),
  }),

  // Specialty Requests
  getSpecialtyRequests: async () => fetchWithAuth('/admin-services/requests/specialties'),
  approveSpecialtyRequest: async (id: string) => fetchWithAuth(`/admin-services/requests/specialties/${id}/approve`, {
    method: 'POST',
  }),
  rejectSpecialtyRequest: async (id: string, rejectionReason: string) => fetchWithAuth(`/admin-services/requests/specialties/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejectionReason }),
  }),

  // Delete operations
  deleteSpecialty: async (id: string) => fetchWithAuth(`/admin-services/specialties/${id}`, {
    method: 'DELETE',
  }),
  deleteService: async (id: string) => fetchWithAuth(`/admin-services/services/${id}`, {
    method: 'DELETE',
  }),
};

// Patients API (Super Admin only)
export const patientsApi = {
  getPatients: async () => {
    return fetchWithAuth('/patients');
  },

  getPatientAppointments: async (userId: string) => {
    return fetchWithAuth(`/patients/${userId}/appointments`);
  },

  getPatientProfile: async (userId: string) => {
    return fetchWithAuth(`/patients/${userId}/profile`);
  },

  updatePatient: async (userId: string, data: any) => {
    return fetchWithAuth(`/patients/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deletePatient: async (userId: string) => {
    return fetchWithAuth(`/patients/${userId}`, {
      method: 'DELETE',
    });
  },
};

// Admin Settings API (Super Admin only)
export const adminSettingsApi = {
  getSettings: async () => {
    return fetchWithAuth('/admin/settings');
  },

  saveSettings: async (settings: any) => {
    return fetchWithAuth('/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  getTeamMembers: async () => {
    return fetchWithAuth('/admin/team-members');
  },

  getProfile: async () => {
    return fetchWithAuth('/admin/profile');
  },
};

// Profiles API
export const profilesApi = {
  getProfile: async () => {
    return fetchWithAuth('/profiles');
  },

  updateProfile: async (updates: any) => {
    return fetchWithAuth('/profiles', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
};

// Invitations API
export const invitationsApi = {
  getInvitation: async (token: string) => {
    return fetch(`${API_BASE_URL}/invitations/${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      return response.json();
    });
  },

  sendInvitation: async (data: { email: string; name?: string; role_type: string; app_url?: string }) => {
    return fetchWithAuth('/invitations/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Clinic Admin API
export const clinicAdminApi = {
  getClinic: async () => {
    return fetchWithAuth('/clinic-admin/clinic');
  },

  createClinic: async (data: any) => {
    return fetchWithAuth('/clinic-admin/clinic', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateClinic: async (data: any) => {
    return fetchWithAuth('/clinic-admin/clinic', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateAutoBooking: async (enabled: boolean) => {
    return fetchWithAuth('/clinic-admin/clinic/auto-booking', {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
  },

  updateOperatingHours: async (hours: any[]) => {
    return fetchWithAuth('/clinic-admin/clinic/operating-hours', {
      method: 'POST',
      body: JSON.stringify({ hours }),
    });
  },

  getBookings: async (timeFilter?: string) => {
    const params = timeFilter ? `?timeFilter=${timeFilter}` : '';
    return fetchWithAuth(`/clinic-admin/bookings${params}`);
  },

  createBooking: async (data: any) => {
    return fetchWithAuth('/clinic-admin/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getProfile: async () => {
    return fetchWithAuth('/clinic-admin/profile');
  },

  getTeamMembers: async () => {
    return fetchWithAuth('/clinic-admin/team-members');
  },

  sendDoctorInvitation: async (data: { email: string; name?: string; doctor_id: string; app_url?: string }) => {
    return fetchWithAuth('/clinic-admin/invitations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getTreatments: async () => {
    return fetchWithAuth('/clinic-admin/treatments');
  },

  createTreatment: async (data: any) => {
    return fetchWithAuth('/clinic-admin/treatments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateTreatment: async (id: string, data: any) => {
    return fetchWithAuth(`/clinic-admin/treatments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteTreatment: async (id: string) => {
    return fetchWithAuth(`/clinic-admin/treatments/${id}`, {
      method: 'DELETE',
    });
  },

  getInsightsBookings: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString();
    return fetchWithAuth(`/clinic-admin/insights/bookings${queryString ? `?${queryString}` : ''}`);
  },

  createSpecialtyRequest: async (specialtyName: string) => {
    return fetchWithAuth('/clinic-admin/specialty-requests', {
      method: 'POST',
      body: JSON.stringify({ specialty_name: specialtyName }),
    });
  },

  createServiceRequest: async (specialtyId: string, serviceName: string) => {
    return fetchWithAuth('/clinic-admin/service-requests', {
      method: 'POST',
      body: JSON.stringify({ specialty_id: specialtyId, service_name: serviceName }),
    });
  },

  updatePatientProfile: async (userId: string, data: any) => {
    return fetchWithAuth(`/clinic-admin/patients/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  getPatientProfile: async (userId: string) => {
    return fetchWithAuth(`/clinic-admin/patients/${userId}/profile`);
  },

  deletePatient: async (userId: string) => {
    return fetchWithAuth(`/clinic-admin/patients/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  },

  uploadLogo: async (data: { file: string; fileName: string; fileType?: string }) => {
    return fetchWithAuth('/clinic-admin/clinic/logo', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  removeLogo: async () => {
    return fetchWithAuth('/clinic-admin/clinic/logo', {
      method: 'DELETE',
    });
  },
};

// Doctor API
export const doctorApi = {
  getClinic: async () => {
    return fetchWithAuth('/doctor/clinic');
  },
  getBookings: async (dateFilter?: string) => {
    const query = dateFilter ? `?dateFilter=${encodeURIComponent(dateFilter)}` : '';
    return fetchWithAuth(`/doctor/bookings${query}`);
  },
};

export const api = {
  auth: authApi,
  bookings: bookingsApi,
  clinics: clinicsApi,
  doctors: doctorsApi,
  services: servicesApi,
  user: userApi,
  stats: statsApi,
  adminServices: adminServicesApi,
  patients: patientsApi,
  adminSettings: adminSettingsApi,
  profiles: profilesApi,
  invitations: invitationsApi,
  clinicAdmin: clinicAdminApi,
  doctor: doctorApi,
};

