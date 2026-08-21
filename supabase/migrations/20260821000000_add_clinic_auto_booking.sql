BEGIN;

ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS auto_booking_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clinics.auto_booking_enabled IS
'When enabled, new patient appointment requests for this clinic are confirmed automatically.';

CREATE OR REPLACE FUNCTION public.prevent_confirmed_booking_slot_conflicts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $auto_booking_function$
DECLARE
  resource_key TEXT;
  clinic_key TEXT;
  slot_conflict BOOLEAN;
BEGIN
  IF NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;

  clinic_key := COALESCE(NEW.clinic_id::text, lower(btrim(NEW.clinic)), 'unknown-clinic');

  IF COALESCE(NEW.booking_type, 'doctor') = 'treatment' THEN
    resource_key := CASE
      WHEN NEW.treatment_id IS NOT NULL THEN 'treatment-id:' || NEW.treatment_id::text
      ELSE 'treatment-name:' || clinic_key || ':' || lower(btrim(COALESCE(NEW.treatment_name, '')))
    END;
  ELSE
    resource_key := CASE
      WHEN NEW.doctor_id IS NOT NULL THEN 'doctor-id:' || NEW.doctor_id::text
      ELSE 'doctor-name:' || clinic_key || ':' || lower(btrim(COALESCE(NEW.doctor_name, '')))
    END;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(resource_key || ':' || NEW.appointment_date::text || ':' || NEW.appointment_time::text, 0)
  );

  SELECT EXISTS (
    SELECT 1
    FROM public.bookings existing
    WHERE existing.id <> NEW.id
      AND existing.status = 'confirmed'
      AND existing.appointment_date = NEW.appointment_date
      AND existing.appointment_time = NEW.appointment_time
      AND (
        (
          COALESCE(NEW.booking_type, 'doctor') = 'treatment'
          AND (
            (NEW.treatment_id IS NOT NULL AND existing.treatment_id = NEW.treatment_id)
            OR (
              NEW.treatment_id IS NULL
              AND lower(btrim(COALESCE(existing.treatment_name, ''))) = lower(btrim(COALESCE(NEW.treatment_name, '')))
              AND (
                (NEW.clinic_id IS NOT NULL AND existing.clinic_id = NEW.clinic_id)
                OR (
                  NEW.clinic_id IS NULL
                  AND lower(btrim(COALESCE(existing.clinic, ''))) = lower(btrim(COALESCE(NEW.clinic, '')))
                )
              )
            )
          )
        )
        OR (
          COALESCE(NEW.booking_type, 'doctor') <> 'treatment'
          AND (
            (NEW.doctor_id IS NOT NULL AND existing.doctor_id = NEW.doctor_id)
            OR (
              NEW.doctor_id IS NULL
              AND lower(btrim(COALESCE(existing.doctor_name, ''))) = lower(btrim(COALESCE(NEW.doctor_name, '')))
              AND (
                (NEW.clinic_id IS NOT NULL AND existing.clinic_id = NEW.clinic_id)
                OR (
                  NEW.clinic_id IS NULL
                  AND lower(btrim(COALESCE(existing.clinic, ''))) = lower(btrim(COALESCE(NEW.clinic, '')))
                )
              )
            )
          )
        )
      )
  ) INTO slot_conflict;

  IF slot_conflict THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'This appointment slot has already been booked';
  END IF;

  RETURN NEW;
END;
$auto_booking_function$;

DROP TRIGGER IF EXISTS prevent_confirmed_booking_slot_conflicts_trigger ON public.bookings;
DROP TRIGGER IF EXISTS prevent_confirmed_booking_slot_conflicts_insert ON public.bookings;
DROP TRIGGER IF EXISTS prevent_confirmed_booking_slot_conflicts_update ON public.bookings;

CREATE TRIGGER prevent_confirmed_booking_slot_conflicts_insert
BEFORE INSERT
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.prevent_confirmed_booking_slot_conflicts();

CREATE TRIGGER prevent_confirmed_booking_slot_conflicts_update
BEFORE UPDATE OF
  status,
  appointment_date,
  appointment_time,
  booking_type,
  doctor_id,
  doctor_name,
  treatment_id,
  treatment_name,
  clinic_id,
  clinic
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.prevent_confirmed_booking_slot_conflicts();

COMMIT;
