ALTER TABLE public.bookings
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS patient_name TEXT,
ADD COLUMN IF NOT EXISTS patient_phone TEXT,
ADD COLUMN IF NOT EXISTS patient_email TEXT,
ADD COLUMN IF NOT EXISTS patient_gender TEXT,
ADD COLUMN IF NOT EXISTS patient_date_of_birth DATE,
ADD COLUMN IF NOT EXISTS booking_source TEXT NOT NULL DEFAULT 'patient_app',
ADD COLUMN IF NOT EXISTS created_by_role TEXT,
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_booking_source_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_booking_source_check
CHECK (booking_source IN ('patient_app', 'clinic_admin'));

CREATE INDEX IF NOT EXISTS idx_bookings_booking_source ON public.bookings(booking_source);
CREATE INDEX IF NOT EXISTS idx_bookings_created_by_user_id ON public.bookings(created_by_user_id);

COMMENT ON COLUMN public.bookings.patient_name IS 'Snapshot of patient full name for clinic-managed manual bookings';
COMMENT ON COLUMN public.bookings.patient_phone IS 'Snapshot of patient phone for clinic-managed manual bookings';
COMMENT ON COLUMN public.bookings.patient_email IS 'Snapshot of patient email for clinic-managed manual bookings';
COMMENT ON COLUMN public.bookings.patient_gender IS 'Snapshot of patient gender for clinic-managed manual bookings';
COMMENT ON COLUMN public.bookings.patient_date_of_birth IS 'Snapshot of patient date of birth for clinic-managed manual bookings';
COMMENT ON COLUMN public.bookings.booking_source IS 'Origin of booking row: patient self-booking or clinic admin booking';
COMMENT ON COLUMN public.bookings.created_by_role IS 'Role that created the booking row';
COMMENT ON COLUMN public.bookings.created_by_user_id IS 'Authenticated user who created the booking row';
