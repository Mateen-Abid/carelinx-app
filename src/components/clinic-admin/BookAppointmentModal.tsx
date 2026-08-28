import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Clinic = {
  id: string;
  name: string;
};

type DoctorRecord = {
  id: string;
  name: string;
  specialty: string;
  services?: string | null;
  availability?: string | null;
  status?: string | null;
};

type TreatmentRecord = {
  id: string;
  name: string;
  specialty?: string | null;
  service?: string | null;
  availability?: string | null;
  status?: string | null;
};

type Props = {
  clinic: Clinic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBooked: () => Promise<void> | void;
};

const normalizeTimeValue = (value: string | null | undefined) => {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    const hourRaw = Number(twelveHourMatch[1]);
    const minute = Number(twelveHourMatch[2]);
    const period = twelveHourMatch[3].toUpperCase();

    if (Number.isNaN(hourRaw) || Number.isNaN(minute)) return '';

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

    if (Number.isNaN(hour) || Number.isNaN(minute)) return '';

    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  return trimmed.replace(/\s+/g, '').toUpperCase();
};

const normalizeNameValue = (value: string | null | undefined) =>
  value ? value.trim().toLowerCase() : '';

const splitStoredValues = (value?: string | null) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const generateSlotsFromRange = (range: string): string[] => {
  const normalized = range.replace('–', '-');
  const parts = normalized.split('-').map((part) => part.trim());
  if (parts.length !== 2) return [];

  const [startTime, endTime] = parts;
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return [];
  }

  const slots: string[] = [];
  const current = new Date(start);
  while (current < end) {
    slots.push(format(current, 'h:mm a'));
    current.setMinutes(current.getMinutes() + 30);
  }

  return slots;
};

const getSlotsForAvailabilityDate = (availability: string, date: Date): string[] => {
  const dayFull = format(date, 'EEEE').toLowerCase();
  const dayShort = format(date, 'EEE').toLowerCase();
  const entries = availability
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  const daySpecificSlots = entries
    .map((entry) => {
      const match = entry.match(/^([A-Za-z]+):\s*(.+)$/);
      if (!match) return null;

      const dayLabel = match[1].toLowerCase();
      const rangePart = match[2].trim();
      const matchesDay = dayLabel === dayFull || dayLabel.slice(0, 3) === dayShort;
      if (!matchesDay) return null;

      return generateSlotsFromRange(rangePart);
    })
    .filter((slots): slots is string[] => Array.isArray(slots))
    .flat();

  if (daySpecificSlots.length > 0) return daySpecificSlots;

  if (entries.length === 1 && !entries[0].includes(':')) {
    return generateSlotsFromRange(entries[0]);
  }

  return [];
};

const BookAppointmentModal = ({ clinic, open, onOpenChange, onBooked }: Props) => {
  const { t } = useTranslation();
  const [bookingType, setBookingType] = useState<'doctor' | 'treatment'>('doctor');
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [patientDateOfBirth, setPatientDateOfBirth] = useState('');
  const [occupiedDoctorSlots, setOccupiedDoctorSlots] = useState<Record<string, string[]>>({});
  const [occupiedTreatmentSlots, setOccupiedTreatmentSlots] = useState<Record<string, string[]>>({});

  const resetForm = () => {
    setBookingType('doctor');
    setSelectedDoctorId('');
    setSelectedTreatmentId('');
    setSelectedService('');
    setSelectedDate('');
    setSelectedTime('');
    setPatientName('');
    setPatientPhone('');
    setPatientEmail('');
    setPatientGender('');
    setPatientDateOfBirth('');
    setOccupiedDoctorSlots({});
    setOccupiedTreatmentSlots({});
  };

  useEffect(() => {
    if (!open || !clinic?.id) return;

    let isActive = true;
    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        const [doctorResponse, treatmentResponse] = await Promise.all([
          api.doctors.getDoctors(clinic.id),
          api.clinicAdmin.getTreatments(),
        ]);

        if (!isActive) return;

        setDoctors(
          (doctorResponse?.doctors || []).filter((doctor: DoctorRecord) => (doctor.status || 'active') === 'active')
        );
        setTreatments(
          (treatmentResponse?.treatments || []).filter(
            (treatment: TreatmentRecord) => (treatment.status || 'active') === 'active'
          )
        );
      } catch (error) {
        console.error('Failed to load clinic booking options:', error);
        toast.error(t('Failed to load booking options'));
      } finally {
        if (isActive) {
          setLoadingOptions(false);
        }
      }
    };

    loadOptions();
    return () => {
      isActive = false;
    };
  }, [clinic?.id, open, t]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    setSelectedTime('');
    setOccupiedDoctorSlots({});
    setOccupiedTreatmentSlots({});
  }, [selectedDate, selectedDoctorId, selectedTreatmentId, bookingType]);

  useEffect(() => {
    if (bookingType === 'doctor') {
      setSelectedTreatmentId('');
    } else {
      setSelectedDoctorId('');
      setSelectedService('');
    }
  }, [bookingType]);

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === selectedDoctorId) || null,
    [doctors, selectedDoctorId]
  );
  const selectedTreatment = useMemo(
    () => treatments.find((treatment) => treatment.id === selectedTreatmentId) || null,
    [selectedTreatmentId, treatments]
  );
  const doctorServices = useMemo(() => splitStoredValues(selectedDoctor?.services), [selectedDoctor?.services]);
  const treatmentServices = useMemo(
    () => splitStoredValues(selectedTreatment?.service),
    [selectedTreatment?.service]
  );

  useEffect(() => {
    if (bookingType === 'doctor') {
      if (!selectedService && doctorServices.length === 1) {
        setSelectedService(doctorServices[0]);
        return;
      }

      if (selectedService && !doctorServices.includes(selectedService)) {
        setSelectedService('');
      }
      return;
    }

    if (!selectedService && treatmentServices.length === 1) {
      setSelectedService(treatmentServices[0]);
      return;
    }

    if (selectedService && treatmentServices.length > 0 && !treatmentServices.includes(selectedService)) {
      setSelectedService('');
    }
  }, [bookingType, doctorServices, selectedService, treatmentServices]);

  useEffect(() => {
    if (!open || !clinic || !selectedDate) return;

    const fetchOccupiedSlots = async () => {
      try {
        if (bookingType === 'doctor' && selectedDoctor) {
          const response = await api.bookings.getOccupiedSlots({
            date: selectedDate,
            doctorIds: selectedDoctor.id ? [selectedDoctor.id] : undefined,
            doctorNames: selectedDoctor.name ? [selectedDoctor.name] : undefined,
            clinicId: clinic.id,
            clinic: clinic.name,
          });

          setOccupiedDoctorSlots(response?.occupiedDoctorSlots || {});
          setOccupiedTreatmentSlots({});
          return;
        }

        if (bookingType === 'treatment' && selectedTreatment) {
          const response = await api.bookings.getOccupiedSlots({
            date: selectedDate,
            treatmentIds: selectedTreatment.id ? [selectedTreatment.id] : undefined,
            treatmentNames: selectedTreatment.name ? [selectedTreatment.name] : undefined,
            clinicId: clinic.id,
            clinic: clinic.name,
          });

          setOccupiedDoctorSlots({});
          setOccupiedTreatmentSlots(response?.occupiedTreatmentSlots || {});
        }
      } catch (error) {
        console.error('Failed to load occupied slots:', error);
        toast.error(t('Failed to load occupied slots'));
      }
    };

    fetchOccupiedSlots();
  }, [bookingType, clinic, open, selectedDate, selectedDoctor, selectedTreatment, t]);

  const occupiedSlots = useMemo(() => {
    if (bookingType === 'doctor' && selectedDoctor) {
      return (
        occupiedDoctorSlots[selectedDoctor.id] ||
        occupiedDoctorSlots[normalizeNameValue(selectedDoctor.name)] ||
        []
      );
    }

    if (bookingType === 'treatment' && selectedTreatment) {
      return (
        occupiedTreatmentSlots[selectedTreatment.id] ||
        occupiedTreatmentSlots[normalizeNameValue(selectedTreatment.name)] ||
        []
      );
    }

    return [];
  }, [bookingType, occupiedDoctorSlots, occupiedTreatmentSlots, selectedDoctor, selectedTreatment]);

  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const selectedItemAvailability =
      bookingType === 'doctor' ? selectedDoctor?.availability : selectedTreatment?.availability;

    if (!selectedItemAvailability) return [];

    const rawSlots = getSlotsForAvailabilityDate(selectedItemAvailability, new Date(`${selectedDate}T00:00:00`));
    if (occupiedSlots.length === 0) return rawSlots;

    const occupiedSet = new Set(occupiedSlots.map((slot) => normalizeTimeValue(slot)));
    return rawSlots.filter((slot) => !occupiedSet.has(normalizeTimeValue(slot)));
  }, [bookingType, occupiedSlots, selectedDate, selectedDoctor?.availability, selectedTreatment?.availability]);

  const handleSubmit = async () => {
    if (!clinic) return;

    if (!patientName.trim()) {
      toast.error(t('Patient name is required'));
      return;
    }

    if (!patientPhone.trim()) {
      toast.error(t('Patient phone is required'));
      return;
    }

    if (bookingType === 'doctor' && !selectedDoctor) {
      toast.error(t('Please select a doctor'));
      return;
    }

    if (bookingType === 'doctor' && doctorServices.length === 0) {
      toast.error(t('This doctor has no services assigned'));
      return;
    }

    if (bookingType === 'doctor' && !selectedService) {
      toast.error(t('Please select a service'));
      return;
    }

    if (bookingType === 'treatment' && !selectedTreatment) {
      toast.error(t('Please select a treatment'));
      return;
    }

    if (bookingType === 'treatment' && treatmentServices.length === 0) {
      toast.error(t('This treatment has no services assigned'));
      return;
    }

    if (bookingType === 'treatment' && !selectedService) {
      toast.error(t('Please select a service'));
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast.error(t('Please select appointment date and time'));
      return;
    }

    try {
      setSaving(true);
      await api.clinicAdmin.createBooking({
        booking_type: bookingType,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        doctor_id: bookingType === 'doctor' ? selectedDoctor?.id : undefined,
        treatment_id: bookingType === 'treatment' ? selectedTreatment?.id : undefined,
        service_name: selectedService || undefined,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        patient_email: patientEmail.trim() || undefined,
        patient_gender: patientGender || undefined,
        patient_date_of_birth: patientDateOfBirth || undefined,
      });

      toast.success(t('Appointment booked successfully'));
      await onBooked();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Failed to create clinic admin booking:', error);
      toast.error(error?.message || t('Failed to create booking'));
    } finally {
      setSaving(false);
    }
  };

  const selectedTargetLabel =
    bookingType === 'doctor'
      ? selectedDoctor?.specialty || ''
      : selectedTreatment?.specialty || '';

  const renderLabel = (label: string, required = false) => (
    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
      {t(label)}
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </p>
  );

  const openDatePicker = (inputId: string) => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.click();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('Book Appointment')}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="text-red-500">*</span> {t('Required fields')}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              {renderLabel('Patient Name', true)}
              <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder={t('Enter patient name')} required />
            </div>

            <div className="space-y-2">
              {renderLabel('Phone', true)}
              <Input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder={t('Enter phone number')} required />
            </div>

            <div className="space-y-2">
              {renderLabel('Email')}
              <Input
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                placeholder={t('Enter email address')}
              />
            </div>

            <div className="space-y-2">
              {renderLabel('Gender')}
              <Select value={patientGender} onValueChange={setPatientGender}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select gender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">{t('Male')}</SelectItem>
                  <SelectItem value="Female">{t('Female')}</SelectItem>
                  <SelectItem value="Other">{t('Other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {renderLabel('Date of Birth')}
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 cursor-pointer z-10"
                  onClick={() => openDatePicker('book-appointment-patient-dob')}
                />
                <Input
                  id="book-appointment-patient-dob"
                  type="date"
                  value={patientDateOfBirth}
                  onChange={(e) => setPatientDateOfBirth(e.target.value)}
                  className="pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                />
              </div>
            </div>

            <div className="space-y-2">
              {renderLabel('Booking Type', true)}
              <Select value={bookingType} onValueChange={(value: 'doctor' | 'treatment') => setBookingType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">{t('Doctor')}</SelectItem>
                  <SelectItem value="treatment">{t('Treatment')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {bookingType === 'doctor' ? (
              <>
                <div className="space-y-2">
                  {renderLabel('Doctor', true)}
                  <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId} disabled={loadingOptions}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingOptions ? t('Loading...') : t('Select doctor')} />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  {renderLabel('Service', true)}
                  <Select
                    value={selectedService}
                    onValueChange={setSelectedService}
                    disabled={!selectedDoctor || doctorServices.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !selectedDoctor
                            ? t('Select doctor first')
                            : doctorServices.length === 0
                              ? t('This doctor has no services assigned')
                              : t('Select service')
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {doctorServices.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  {renderLabel('Treatment', true)}
                  <Select value={selectedTreatmentId} onValueChange={setSelectedTreatmentId} disabled={loadingOptions}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingOptions ? t('Loading...') : t('Select treatment')} />
                    </SelectTrigger>
                    <SelectContent>
                      {treatments.map((treatment) => (
                        <SelectItem key={treatment.id} value={treatment.id}>
                          {treatment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  {renderLabel('Service', true)}
                  <Select
                    value={selectedService}
                    onValueChange={setSelectedService}
                    disabled={!selectedTreatment || treatmentServices.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !selectedTreatment
                            ? t('Select treatment first')
                            : treatmentServices.length === 0
                              ? t('This treatment has no services assigned')
                              : t('Select service')
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {treatmentServices.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {(selectedDoctor || selectedTreatment) && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('Specialty')}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTargetLabel || t('N/A')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('Service')}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {bookingType === 'doctor'
                      ? selectedService || (doctorServices.length === 0 ? t('This doctor has no services assigned') : t('Select service'))
                      : selectedService || (treatmentServices.length === 0 ? t('This treatment has no services assigned') : t('Select service'))}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-[220px,1fr]">
            <div className="space-y-2">
              {renderLabel('Appointment Date', true)}
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 cursor-pointer z-10"
                  onClick={() => openDatePicker('book-appointment-date')}
                />
                <Input
                  id="book-appointment-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  required
                  className="pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                />
              </div>
            </div>

            <div className="space-y-2">
              {renderLabel('Available Time Slots', true)}
              {selectedDate ? (
                availableSlots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedTime === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTime(slot)}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            isSelected
                              ? 'border-[#0C2243] bg-[#0C2243] text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-[#0C2243] hover:text-[#0C2243] dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    {t('No available slots for selected date')}
                  </div>
                )
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  {t('Select a date to view available slots')}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('Cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={saving || loadingOptions}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {saving ? t('Loading...') : t('Book Appointment')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookAppointmentModal;
