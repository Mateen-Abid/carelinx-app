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
  doctorId?: string | null;
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

    // Look up clinic_id by clinic name (for dynamic clinic admin dashboard)
    let clinicId: string | null = null;
    if (bookingData.clinic) {
      console.log('🔍 Looking up clinic by name:', bookingData.clinic);
      
      // Try exact match first
      const { data: clinicData, error: clinicError } = await supabaseClient
        .from('clinics')
        .select('id, name, status')
        .eq('name', bookingData.clinic)
        .maybeSingle();
      
      console.log('📋 Clinic lookup result:', { clinicData, clinicError });
      
      if (clinicData && (clinicData.status === 'active' || clinicData.status === 'pending')) {
        clinicId = clinicData.id;
        console.log('✅ Found clinic ID:', clinicId);
      } else {
        // Try case-insensitive match
        const { data: clinicDataCaseInsensitive } = await supabaseClient
          .from('clinics')
          .select('id, name, status')
          .ilike('name', bookingData.clinic)
          .maybeSingle();
        
        if (clinicDataCaseInsensitive && (clinicDataCaseInsensitive.status === 'active' || clinicDataCaseInsensitive.status === 'pending')) {
          clinicId = clinicDataCaseInsensitive.id;
          console.log('✅ Found clinic ID (case-insensitive):', clinicId);
        } else {
          console.warn('⚠️ Clinic not found or not active:', bookingData.clinic);
        }
      }
    }

    // Use provided doctorId or look it up by name and clinic
    let doctorId: string | null = bookingData.doctorId || null;
    console.log('🔍 Doctor ID from request:', doctorId);
    console.log('🔍 Doctor name from request:', bookingData.doctorName);
    
    if (!doctorId && bookingData.doctorName && clinicId) {
      console.log('🔍 Looking up doctor by name and clinic:', { doctorName: bookingData.doctorName, clinicId });
      
      // Try exact match first
      let doctorData = null;
      const { data: exactMatch, error: exactError } = await supabaseClient
        .from('doctors')
        .select('id')
        .eq('name', bookingData.doctorName)
        .eq('clinic_id', clinicId)
        .eq('status', 'active')
        .maybeSingle();
      
      console.log('🔍 Doctor exact match result:', { exactMatch, exactError });
      
      if (exactMatch) {
        doctorData = exactMatch;
      } else {
        // Try case-insensitive match
        const { data: caseInsensitiveMatch, error: caseError } = await supabaseClient
          .from('doctors')
          .select('id')
          .ilike('name', bookingData.doctorName)
          .eq('clinic_id', clinicId)
          .eq('status', 'active')
          .maybeSingle();
        
        console.log('🔍 Doctor case-insensitive match result:', { caseInsensitiveMatch, caseError });
        
        if (caseInsensitiveMatch) {
          doctorData = caseInsensitiveMatch;
        }
      }
      
      if (doctorData) {
        doctorId = doctorData.id;
        console.log('✅ Found doctor ID:', doctorId);
      } else {
        console.warn('⚠️ Doctor not found by name and clinic (tried exact and case-insensitive match)');
      }
    }
    
    console.log('✅ Final doctor_id to use:', doctorId);

    // Insert initial booking with 'pending' status
    const bookingInsertData = {
      doctor_name: bookingData.doctorName,
      specialty: bookingData.specialty,
      clinic: bookingData.clinic,
      clinic_id: clinicId, // Set clinic_id for clinic admin dashboard
      doctor_id: doctorId, // Set doctor_id to link with doctors table
      appointment_date: bookingData.date,
      appointment_time: bookingData.time,
      user_id: bookingData.userId,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    console.log('📝 Inserting booking with data:', {
      ...bookingInsertData,
      user_id: bookingData.userId.substring(0, 8) + '...' // Partially hide user_id for privacy
    });
    
    const { data: booking, error: insertError } = await supabaseClient
      .from('bookings')
      .insert(bookingInsertData)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error inserting booking:', insertError);
      throw insertError
    }

    console.log(`✅ Booking ${booking.id} created with pending status, clinic_id: ${booking.clinic_id || 'NULL'}, doctor_id: ${booking.doctor_id || 'NULL'}`)

    // No background tasks needed - frontend will handle the flow
    console.log(`Booking ${booking.id} created and ready for frontend handling`)

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