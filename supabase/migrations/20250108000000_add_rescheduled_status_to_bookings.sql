-- Add 'rescheduled' and 'completed' status values to bookings table
-- The current CHECK constraint only allows 'pending', 'confirmed', 'cancelled'
-- We need to add 'rescheduled' and 'completed' to support the full workflow

-- Drop the existing CHECK constraint
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add new CHECK constraint with all valid statuses
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'rescheduled', 'completed'));

