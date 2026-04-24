ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS service_name TEXT;

COMMENT ON COLUMN public.bookings.service_name IS 'Snapshot of the exact selected service for doctor bookings and service-backed treatment flows';
