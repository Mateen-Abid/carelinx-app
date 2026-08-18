-- Owned by the postgres role, unlike storage.objects.
-- Used for clinic logos so uploads do not depend on Storage RLS.

CREATE TABLE IF NOT EXISTS public.clinic_logo_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid,
  file_name text NOT NULL,
  content_type text NOT NULL,
  data text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.clinic_logo_files ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_clinic_logo_files_clinic_id
  ON public.clinic_logo_files (clinic_id);
