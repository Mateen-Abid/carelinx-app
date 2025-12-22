-- =====================================================
-- Service Requests Table
-- =====================================================
-- This table stores service requests from clinic admins
-- that need to be approved/rejected by super admin
-- =====================================================

CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  clinic_admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES public.super_admin_specialties(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Clinic admins can view their own requests
CREATE POLICY "Clinic admins can view their own requests"
ON public.service_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role_type = 'clinic_admin'
    AND is_active = true
  )
  AND clinic_admin_id = auth.uid()
);

-- Policy: Clinic admins can insert their own requests
CREATE POLICY "Clinic admins can insert their own requests"
ON public.service_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role_type = 'clinic_admin'
    AND is_active = true
  )
  AND clinic_admin_id = auth.uid()
);

-- Policy: Super admin can view all requests
CREATE POLICY "Super admin can view all requests"
ON public.service_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
    AND is_active = true
  )
);

-- Policy: Super admin can update (approve/reject) requests
CREATE POLICY "Super admin can update requests"
ON public.service_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role_type = 'super_admin'
    AND is_active = true
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_clinic_admin_id ON public.service_requests(clinic_admin_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_specialty_id ON public.service_requests(specialty_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_requested_at ON public.service_requests(requested_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_service_requests_updated_at
BEFORE UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

