ALTER TABLE public.treatments
ADD COLUMN IF NOT EXISTS availability TEXT;

COMMENT ON COLUMN public.treatments.availability IS 'Optional treatment availability stored as day/time ranges';
