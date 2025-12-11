-- Create clinics table
CREATE TABLE public.clinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT, -- For clinic admin authentication (optional, can use auth.users)
  address TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  specialties TEXT[], -- Array of specialties
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
  plan_type TEXT DEFAULT 'standard' CHECK (plan_type IN ('standard', 'premium', 'enterprise')),
  registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  suspended_reason TEXT, -- Reason for suspension
  clinic_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL -- Link to clinic admin user
);

-- Enable Row Level Security
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Create policies for super_admin to manage all clinics
CREATE POLICY "Super admin can view all clinics" 
ON public.clinics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admin can insert clinics" 
ON public.clinics 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admin can update all clinics" 
ON public.clinics 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admin can delete all clinics" 
ON public.clinics 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Allow clinic_admin to view their own clinic
CREATE POLICY "Clinic admin can view their own clinic" 
ON public.clinics 
FOR SELECT 
USING (
  clinic_admin_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_clinics_updated_at
BEFORE UPDATE ON public.clinics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_clinics_status ON public.clinics(status);
CREATE INDEX idx_clinics_email ON public.clinics(email);
CREATE INDEX idx_clinics_clinic_admin_id ON public.clinics(clinic_admin_id);
CREATE INDEX idx_clinics_created_at ON public.clinics(created_at DESC);

