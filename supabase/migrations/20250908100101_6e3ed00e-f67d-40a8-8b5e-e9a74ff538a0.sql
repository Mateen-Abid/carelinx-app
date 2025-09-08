-- Delete all pending bookings to prevent conflicts with new confirmation flow
DELETE FROM public.bookings 
WHERE status = 'pending';