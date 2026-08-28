-- Stored Arabic copy for catalog names and clinic-admin requests.
-- English `name` / `specialty_name` / `service_name` remain the canonical identity
-- for uniqueness, clinic specialty arrays, doctor matching, and bookings.

ALTER TABLE public.super_admin_specialties
  ADD COLUMN IF NOT EXISTS name_ar TEXT;

ALTER TABLE public.super_admin_services
  ADD COLUMN IF NOT EXISTS name_ar TEXT;

ALTER TABLE public.specialty_requests
  ADD COLUMN IF NOT EXISTS specialty_name_ar TEXT;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS service_name_ar TEXT;

COMMENT ON COLUMN public.super_admin_specialties.name_ar IS
  'Arabic specialty name shown when the app language is Arabic. English name is used if this is null.';
COMMENT ON COLUMN public.super_admin_services.name_ar IS
  'Arabic service name shown when the app language is Arabic. English name is used if this is null.';
COMMENT ON COLUMN public.specialty_requests.specialty_name_ar IS
  'Arabic specialty name submitted with a clinic-admin request.';
COMMENT ON COLUMN public.service_requests.service_name_ar IS
  'Arabic service name submitted with a clinic-admin request.';

UPDATE public.super_admin_specialties
SET name_ar = CASE lower(name)
  WHEN 'dermatology' THEN 'الأمراض الجلدية'
  WHEN 'dental' THEN 'طب الأسنان'
  ELSE name_ar
END
WHERE name_ar IS NULL;
