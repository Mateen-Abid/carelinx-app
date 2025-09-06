-- Enable real-time updates for the bookings table
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Add the bookings table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;