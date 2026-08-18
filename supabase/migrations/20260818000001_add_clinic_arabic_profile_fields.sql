-- Bilingual clinic profile content for English / Arabic
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS name_ar TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS address_ar TEXT;

COMMENT ON COLUMN public.clinics.name_ar IS 'Arabic clinic name shown when the app language is Arabic';
COMMENT ON COLUMN public.clinics.description_ar IS 'Arabic clinic description shown when the app language is Arabic';
COMMENT ON COLUMN public.clinics.address_ar IS 'Arabic clinic address shown when the app language is Arabic';
