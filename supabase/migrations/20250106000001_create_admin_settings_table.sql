-- Create admin_settings table to store super admin settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_duration TEXT DEFAULT '30 Minutes',
  timezone TEXT DEFAULT 'UTC - 5',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  language TEXT DEFAULT 'English (US)',
  appointment_alerts BOOLEAN DEFAULT true,
  doctor_schedule_updates BOOLEAN DEFAULT false,
  patient_reminders BOOLEAN DEFAULT true,
  system_updates BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for users to manage their own settings
CREATE POLICY "Users can view their own settings" 
ON public.admin_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
ON public.admin_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.admin_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_admin_settings_user_id ON public.admin_settings(user_id);

