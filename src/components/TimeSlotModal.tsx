import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface TimeSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  timeSlots: string[];
  disabledTimeSlots?: string[];
  onBookAppointment: (timeSlot: string) => void;
}

const TimeSlotModal: React.FC<TimeSlotModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  timeSlots,
  disabledTimeSlots = [],
  onBookAppointment
}) => {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(isRtl ? 'ar' : 'en', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(date);

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat(isRtl ? 'ar' : 'en', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);

  const localizeTimeString = (timeStr: string) => {
    if (!isRtl) return timeStr;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return timeStr;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3].toUpperCase();

    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    return formatTime(new Date(2000, 0, 1, hours, minutes));
  };

  const normalizeTimeValue = (value: string) => {
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
  const disabledTimeSlotSet = new Set(disabledTimeSlots.map(normalizeTimeValue));

  const handleTimeSlotSelect = (timeSlot: string) => {
    if (disabledTimeSlotSet.has(normalizeTimeValue(timeSlot))) {
      return;
    }
    setSelectedTimeSlot(timeSlot);
  };

  const handleNext = () => {
    if (selectedTimeSlot) {
      onBookAppointment(selectedTimeSlot);
      onClose();
    }
  };

  if (!selectedDate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-xs w-full p-6 gap-0 bg-white rounded-2xl overflow-hidden mx-4 my-4 sm:max-w-sm sm:my-8"
        style={{ transform: 'translate(-50%, -50%) translateX(-20px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-center pb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {formatDate(selectedDate)}
          </h2>
        </div>

        {/* Time Slots */}
        <div className="pb-6 space-y-2 max-h-64 overflow-y-auto">
          {timeSlots.map((timeSlot) => (
            (() => {
              const isDisabled = disabledTimeSlotSet.has(normalizeTimeValue(timeSlot));

              return (
                <button
                  key={timeSlot}
                  onClick={() => handleTimeSlotSelect(timeSlot)}
                  disabled={isDisabled}
                  className={`
                    w-full p-3 rounded-lg border font-medium transition-all text-sm ${isRtl ? 'text-right' : 'text-left'}
                    ${isDisabled
                      ? 'border-gray-200 bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed'
                      : selectedTimeSlot === timeSlot
                        ? 'border-gray-400 bg-gray-100 text-gray-900'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {localizeTimeString(timeSlot)}
                </button>
              );
            })()
          ))}
        </div>

        {/* Request Appointment Button */}
        <div className="pt-0">
          <Button
            onClick={handleNext}
            disabled={!selectedTimeSlot}
            className="w-full bg-[#0C2243] hover:bg-[#0C2243]/90 text-white font-medium py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {t('Request appointment')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TimeSlotModal;