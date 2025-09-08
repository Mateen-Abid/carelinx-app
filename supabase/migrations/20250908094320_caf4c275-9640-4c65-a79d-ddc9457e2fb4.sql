-- Add missing columns to bookings table for feedback modal trigger
ALTER TABLE public.bookings 
ADD COLUMN show_feedback BOOLEAN DEFAULT FALSE,
ADD COLUMN feedback_triggered_at TIMESTAMP WITH TIME ZONE;