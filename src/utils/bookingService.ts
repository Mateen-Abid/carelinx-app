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
  if (linkedServices.length !== 1) return '';
  if (namesEqual(linkedServices[0], treatmentName)) return '';
  return linkedServices[0];
};

export const resolveBookedServiceName = (params: {
  serviceName?: string | null;
  bookingType?: string | null;
  treatmentName?: string | null;
  treatmentService?: string | null;
  doctorServices?: string | null;
}): string => {
  const storedService = singleServiceName(params.serviceName);
  const treatmentName = String(params.treatmentName || '').trim();

  if (storedService) {
    if (treatmentName && namesEqual(storedService, treatmentName)) {
      return recoverSingleLinkedService(params.treatmentService, treatmentName);
    }
    return storedService;
  }

  return '';
};
