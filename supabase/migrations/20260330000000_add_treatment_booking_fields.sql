-- Add treatment-aware booking fields so appointments can be booked
-- either directly by doctor or by treatment.

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS booking_type TEXT NOT NULL DEFAULT 'doctor';

ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_booking_type_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_booking_type_check
CHECK (booking_type IN ('doctor', 'treatment'));

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS treatment_id UUID REFERENCES public.treatments(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS treatment_name TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON public.bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_treatment_id ON public.bookings(treatment_id);

COMMENT ON COLUMN public.bookings.booking_type IS 'Booking source: direct doctor booking or treatment booking';
COMMENT ON COLUMN public.bookings.treatment_id IS 'Optional foreign key to clinic treatment when booking by treatment';
COMMENT ON COLUMN public.bookings.treatment_name IS 'Snapshot of treatment name for easier display/history';
