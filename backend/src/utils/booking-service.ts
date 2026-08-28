import { supabaseAdmin } from '../config/supabase';

const splitServiceNames = (value?: string | null) =>
  String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const singleServiceName = (value?: string | null) => {
  const parts = splitServiceNames(value);
  return parts.length === 1 ? parts[0] : '';
};

const namesEqual = (left?: string | null, right?: string | null) =>
  String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();

const recoverSingleLinkedService = (treatmentService?: string | null, treatmentName?: string | null) => {
  const linkedServices = splitServiceNames(treatmentService);
  if (linkedServices.length !== 1) return null;
  if (namesEqual(linkedServices[0], treatmentName)) return null;
  return linkedServices[0];
};

export const pickBookedServiceName = (params: {
  serviceName?: string | null;
  bookingType?: string | null;
  treatmentName?: string | null;
  treatmentService?: string | null;
  doctorServices?: string | null;
}): string | null => {
  const storedService = singleServiceName(params.serviceName);
  const treatmentName = String(params.treatmentName || '').trim();

  if (storedService) {
    if (treatmentName && namesEqual(storedService, treatmentName)) {
      return recoverSingleLinkedService(params.treatmentService, treatmentName);
    }
    return storedService;
  }

  return null;
};

export const attachResolvedServiceNames = async <T extends Record<string, any>>(
  bookings: T[]
): Promise<T[]> => {
  if (!bookings.length) return bookings;

  const treatmentIds = [
    ...new Set(
      bookings
        .map((booking) => booking.treatment_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];

  const treatmentMap = new Map<string, { name?: string | null; service?: string | null }>();

  if (treatmentIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('treatments')
      .select('id, name, service')
      .in('id', treatmentIds);
    (data || []).forEach((row: { id: string; name?: string | null; service?: string | null }) => {
      treatmentMap.set(row.id, row);
    });
  }

  return bookings.map((booking) => {
    const treatment = booking.treatment_id ? treatmentMap.get(booking.treatment_id) : undefined;
    const resolved = pickBookedServiceName({
      serviceName: booking.service_name,
      bookingType: booking.booking_type,
      treatmentName: booking.treatment_name || treatment?.name,
      treatmentService: treatment?.service,
    });

    return {
      ...booking,
      service_name: resolved || null,
    };
  });
};

export const resolveServiceNameForNewBooking = async (
  bookingData: Record<string, any>
): Promise<Record<string, any>> => {
  let treatmentService: string | null = null;
  let treatmentName: string | null = bookingData.treatment_name || null;

  if (bookingData.treatment_id) {
    const { data } = await supabaseAdmin
      .from('treatments')
      .select('name, service')
      .eq('id', bookingData.treatment_id)
      .maybeSingle();
    treatmentService = data?.service || null;
    treatmentName = data?.name || treatmentName;
  }

  const resolved = pickBookedServiceName({
    serviceName: bookingData.service_name,
    bookingType: bookingData.booking_type,
    treatmentName,
    treatmentService,
  });

  const linkedServices = splitServiceNames(treatmentService);
  const matchesLinkedService =
    linkedServices.length === 0 ||
    linkedServices.some((service) => namesEqual(service, resolved));

  return {
    ...bookingData,
    treatment_name: treatmentName || bookingData.treatment_name || null,
    service_name: resolved && matchesLinkedService ? resolved : null,
  };
};
