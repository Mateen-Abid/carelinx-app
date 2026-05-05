DROP POLICY IF EXISTS "Clinic admin can insert their clinic bookings" ON public.bookings;

CREATE POLICY "Clinic admin can insert their clinic bookings"
ON public.bookings
FOR INSERT
WITH CHECK (
  booking_source = 'clinic_admin'
  AND created_by_role = 'clinic_admin'
  AND created_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.clinics
    WHERE clinics.id = bookings.clinic_id
      AND clinics.clinic_admin_id = auth.uid()
  )
);
