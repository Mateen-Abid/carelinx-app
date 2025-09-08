-- Add columns to support feedback modal trigger after 5 seconds
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS show_feedback BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS feedback_triggered_at TIMESTAMP WITH TIME ZONE;