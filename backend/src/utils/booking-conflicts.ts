import { supabaseAdmin } from '../config/supabase';

export const ACTIVE_BOOKING_STATUSES = ['confirmed'] as const;

export type BookingConflictPayload = {
  bookingType?: 'doctor' | 'treatment' | string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  treatmentId?: string | null;
  treatmentName?: string | null;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  clinicId?: string | null;
  clinicName?: string | null;
  excludeBookingId?: string | null;
};

type ClinicMatchBooking = {
  clinic_id?: string | null;
  clinic?: string | null;
};

type TimeBookingRow = {
  id?: string | null;
  appointment_time?: string | null;
};

type DoctorBookingRow = TimeBookingRow &
  ClinicMatchBooking & {
    doctor_name?: string | null;
  };

type TreatmentBookingRow = TimeBookingRow &
  ClinicMatchBooking & {
    treatment_name?: string | null;
  };

type OccupiedDoctorRow = {
  doctor_id?: string | null;
  appointment_time?: string | null;
};

type OccupiedTreatmentRow = {
  treatment_id?: string | null;
  appointment_time?: string | null;
};

export const normalizeTimeValue = (value: string | null | undefined): string | null => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    const hourRaw = Number(twelveHourMatch[1]);
    const minute = Number(twelveHourMatch[2]);
    const period = twelveHourMatch[3].toUpperCase();

    if (Number.isNaN(hourRaw) || Number.isNaN(minute) || hourRaw < 1 || hourRaw > 12 || minute < 0 || minute > 59) {
      return null;
    }

    let hour24 = hourRaw % 12;
    if (period === 'PM') {
      hour24 += 12;
    }

    return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (twentyFourHourMatch) {
    const hour = Number(twentyFourHourMatch[1]);
    const minute = Number(twentyFourHourMatch[2]);

    if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  return trimmed.replace(/\s+/g, '').toUpperCase();
};

export const normalizeNameValue = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
};

export const clinicMatches = (
  booking: ClinicMatchBooking,
  clinicId?: string | null,
  clinicName?: string | null
) => {
  if (clinicId) {
    return booking.clinic_id === clinicId;
  }

  if (clinicName) {
    return normalizeNameValue(booking.clinic) === normalizeNameValue(clinicName);
  }

  return true;
};

const excludeCurrentBooking = <T extends { id?: string | null }>(
  bookings: T[] | null,
  excludeBookingId?: string | null
) => {
  if (!excludeBookingId) {
    return bookings || [];
  }

  return (bookings || []).filter((booking) => booking.id !== excludeBookingId);
};

export const hasDoctorSlotConflict = async (
  doctorId: string,
  appointmentDate: string,
  appointmentTime: string,
  excludeBookingId?: string | null
): Promise<boolean> => {
  const normalizedRequestedTime = normalizeTimeValue(appointmentTime);
  if (!normalizedRequestedTime) return false;

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, appointment_time')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', appointmentDate)
    .in('status', ACTIVE_BOOKING_STATUSES);

  if (error) {
    throw error;
  }

  return excludeCurrentBooking(data as TimeBookingRow[] | null, excludeBookingId).some(
    (booking) => normalizeTimeValue(booking.appointment_time) === normalizedRequestedTime
  );
};

export const hasDoctorSlotConflictByName = async (
  doctorName: string,
  appointmentDate: string,
  appointmentTime: string,
  clinicId?: string | null,
  clinicName?: string | null,
  excludeBookingId?: string | null
): Promise<boolean> => {
  const normalizedRequestedTime = normalizeTimeValue(appointmentTime);
  const normalizedDoctorName = normalizeNameValue(doctorName);
  if (!normalizedRequestedTime || !normalizedDoctorName) return false;

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, doctor_name, appointment_time, clinic_id, clinic')
    .eq('appointment_date', appointmentDate)
    .in('status', ACTIVE_BOOKING_STATUSES);

  if (error) {
    throw error;
  }

  return excludeCurrentBooking(data as DoctorBookingRow[] | null, excludeBookingId).some((booking) => {
    const bookingDoctorName = normalizeNameValue(booking.doctor_name);
    const bookingTime = normalizeTimeValue(booking.appointment_time);
    return (
      bookingDoctorName === normalizedDoctorName &&
      bookingTime === normalizedRequestedTime &&
      clinicMatches(booking, clinicId, clinicName)
    );
  });
};

export const hasTreatmentSlotConflict = async (
  treatmentId: string,
  appointmentDate: string,
  appointmentTime: string,
  excludeBookingId?: string | null
): Promise<boolean> => {
  const normalizedRequestedTime = normalizeTimeValue(appointmentTime);
  if (!normalizedRequestedTime) return false;

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, appointment_time')
    .eq('treatment_id', treatmentId)
    .eq('appointment_date', appointmentDate)
    .in('status', ACTIVE_BOOKING_STATUSES);

  if (error) {
    throw error;
  }

  return excludeCurrentBooking(data as TimeBookingRow[] | null, excludeBookingId).some(
    (booking) => normalizeTimeValue(booking.appointment_time) === normalizedRequestedTime
  );
};

export const hasTreatmentSlotConflictByName = async (
  treatmentName: string,
  appointmentDate: string,
  appointmentTime: string,
  clinicId?: string | null,
  clinicName?: string | null,
  excludeBookingId?: string | null
): Promise<boolean> => {
  const normalizedRequestedTime = normalizeTimeValue(appointmentTime);
  const normalizedTreatmentName = normalizeNameValue(treatmentName);
  if (!normalizedRequestedTime || !normalizedTreatmentName) return false;

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('id, treatment_name, appointment_time, clinic_id, clinic')
    .eq('appointment_date', appointmentDate)
    .in('status', ACTIVE_BOOKING_STATUSES);

  if (error) {
    throw error;
  }

  return excludeCurrentBooking(data as TreatmentBookingRow[] | null, excludeBookingId).some((booking) => {
    const bookingTreatmentName = normalizeNameValue(booking.treatment_name);
    const bookingTime = normalizeTimeValue(booking.appointment_time);
    return (
      bookingTreatmentName === normalizedTreatmentName &&
      bookingTime === normalizedRequestedTime &&
      clinicMatches(booking, clinicId, clinicName)
    );
  });
};

export const validateBookingSlotConflict = async (payload: BookingConflictPayload) => {
  const appointmentDate = payload.appointmentDate || null;
  const appointmentTime = payload.appointmentTime || null;

  if (!appointmentDate || !appointmentTime) {
    return { hasConflict: false as const };
  }

  if (payload.bookingType === 'treatment') {
    if (payload.treatmentId) {
      const hasConflict = await hasTreatmentSlotConflict(
        payload.treatmentId,
        appointmentDate,
        appointmentTime,
        payload.excludeBookingId
      );
      if (hasConflict) {
        return {
          hasConflict: true as const,
          error: 'This treatment time slot has already been booked',
        };
      }
    }

    if (payload.treatmentName) {
      const hasConflict = await hasTreatmentSlotConflictByName(
        payload.treatmentName,
        appointmentDate,
        appointmentTime,
        payload.clinicId || null,
        payload.clinicName || null,
        payload.excludeBookingId
      );
      if (hasConflict) {
        return {
          hasConflict: true as const,
          error: 'This treatment time slot has already been booked',
        };
      }
    }

    return { hasConflict: false as const };
  }

  if (payload.doctorId) {
    const hasConflict = await hasDoctorSlotConflict(
      payload.doctorId,
      appointmentDate,
      appointmentTime,
      payload.excludeBookingId
    );
    if (hasConflict) {
      return {
        hasConflict: true as const,
        error: 'This doctor time slot has already been booked',
      };
    }
  }

  if (payload.doctorName) {
    const hasConflict = await hasDoctorSlotConflictByName(
      payload.doctorName,
      appointmentDate,
      appointmentTime,
      payload.clinicId || null,
      payload.clinicName || null,
      payload.excludeBookingId
    );
    if (hasConflict) {
      return {
        hasConflict: true as const,
        error: 'This doctor time slot has already been booked',
      };
    }
  }

  return { hasConflict: false as const };
};

export const getOccupiedSlots = async (params: {
  date: string;
  doctorIds?: string[];
  doctorNames?: string[];
  treatmentIds?: string[];
  treatmentNames?: string[];
  clinicId?: string | null;
  clinicName?: string | null;
}) => {
  const doctorIds = params.doctorIds || [];
  const doctorNames = params.doctorNames || [];
  const treatmentIds = params.treatmentIds || [];
  const treatmentNames = params.treatmentNames || [];

  let occupiedDoctorSlots: Record<string, string[]> = {};
  let occupiedTreatmentSlots: Record<string, string[]> = {};

  if (doctorIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('doctor_id, appointment_time')
      .eq('appointment_date', params.date)
      .in('doctor_id', doctorIds)
      .in('status', ACTIVE_BOOKING_STATUSES);

    if (error) throw error;

    occupiedDoctorSlots = ((data as OccupiedDoctorRow[] | null) || []).reduce((acc: Record<string, string[]>, booking) => {
      if (!booking.doctor_id || !booking.appointment_time) return acc;

      if (!acc[booking.doctor_id]) {
        acc[booking.doctor_id] = [];
      }

      acc[booking.doctor_id].push(booking.appointment_time);
      return acc;
    }, {});
  }

  if (doctorNames.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('doctor_name, appointment_time, clinic_id, clinic')
      .eq('appointment_date', params.date)
      .in('status', ACTIVE_BOOKING_STATUSES);

    if (error) throw error;

    const requestedNameSet = new Set(doctorNames.map((name) => normalizeNameValue(name)).filter(Boolean));
    ((data as DoctorBookingRow[] | null) || []).forEach((booking) => {
      const normalizedDoctorName = normalizeNameValue(booking.doctor_name);
      if (
        !normalizedDoctorName ||
        !requestedNameSet.has(normalizedDoctorName) ||
        !booking.appointment_time ||
        !clinicMatches(booking, params.clinicId || null, params.clinicName || null)
      ) {
        return;
      }

      if (!occupiedDoctorSlots[normalizedDoctorName]) {
        occupiedDoctorSlots[normalizedDoctorName] = [];
      }

      occupiedDoctorSlots[normalizedDoctorName].push(booking.appointment_time);
    });
  }

  if (treatmentIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('treatment_id, appointment_time')
      .eq('appointment_date', params.date)
      .in('treatment_id', treatmentIds)
      .in('status', ACTIVE_BOOKING_STATUSES);

    if (error) throw error;

    occupiedTreatmentSlots = ((data as OccupiedTreatmentRow[] | null) || []).reduce((acc: Record<string, string[]>, booking) => {
      if (!booking.treatment_id || !booking.appointment_time) return acc;

      if (!acc[booking.treatment_id]) {
        acc[booking.treatment_id] = [];
      }

      acc[booking.treatment_id].push(booking.appointment_time);
      return acc;
    }, {});
  }

  if (treatmentNames.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('treatment_name, appointment_time, clinic_id, clinic')
      .eq('appointment_date', params.date)
      .in('status', ACTIVE_BOOKING_STATUSES);

    if (error) throw error;

    const requestedNameSet = new Set(treatmentNames.map((name) => normalizeNameValue(name)).filter(Boolean));
    ((data as TreatmentBookingRow[] | null) || []).forEach((booking) => {
      const normalizedTreatmentName = normalizeNameValue(booking.treatment_name);
      if (
        !normalizedTreatmentName ||
        !requestedNameSet.has(normalizedTreatmentName) ||
        !booking.appointment_time ||
        !clinicMatches(booking, params.clinicId || null, params.clinicName || null)
      ) {
        return;
      }

      if (!occupiedTreatmentSlots[normalizedTreatmentName]) {
        occupiedTreatmentSlots[normalizedTreatmentName] = [];
      }

      occupiedTreatmentSlots[normalizedTreatmentName].push(booking.appointment_time);
    });
  }

  return { occupiedDoctorSlots, occupiedTreatmentSlots };
};
