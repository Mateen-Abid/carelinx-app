-- Enable realtime for bookings table
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Add bookings table to realtime publication
-- First check if the publication exists, if not create it
DO $$
BEGIN
    -- Add the table to supabase_realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION
    WHEN duplicate_object THEN
        -- Table is already in the publication, do nothing
        NULL;
END $$;