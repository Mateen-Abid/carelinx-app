import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BookingRequest {
  doctorName: string;
  specialty: string;
  clinic: string;
  date: string;
  time: string;
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const bookingData: BookingRequest = await req.json()

    // Insert initial booking with 'pending' status
    const { data: booking, error: insertError } = await supabaseClient
      .from('bookings')
      .insert({
        doctor_name: bookingData.doctorName,
        specialty: bookingData.specialty,
        clinic: bookingData.clinic,
        appointment_date: bookingData.date,
        appointment_time: bookingData.time,
        user_id: bookingData.userId,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    console.log(`Booking ${booking.id} created with pending status`)

    // Background task to confirm booking after 20 seconds
    const confirmBookingTask = async () => {
      try {
        console.log(`Starting 20-second wait for booking ${booking.id}...`)
        await new Promise(resolve => setTimeout(resolve, 20000)) // Wait 20 seconds
        
        console.log(`Confirming booking ${booking.id}...`)
        const { error: updateError } = await supabaseClient
          .from('bookings')
          .update({ 
            status: 'confirmed',
            confirmed_at: new Date().toISOString()
          })
          .eq('id', booking.id)
          .eq('status', 'pending') // Only update if still pending

        if (updateError) {
          console.error('Error confirming booking:', updateError)
        } else {
          console.log(`Booking ${booking.id} confirmed successfully after 20 seconds`)
        }
      } catch (error) {
        console.error('Error in background confirmation task:', error)
      }
    }

    // Start background task without waiting for it
    EdgeRuntime.waitUntil(confirmBookingTask())

    // Return immediate response
    return new Response(
      JSON.stringify({ 
        success: true, 
        bookingId: booking.id,
        message: 'Booking request submitted successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error processing booking:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})