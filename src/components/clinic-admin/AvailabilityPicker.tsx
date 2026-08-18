import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AvailabilityEntry,
  DAY_LABELS,
  OperatingHour,
  getEndTimeSlots,
  getFullDayEntry,
  getFullWeekEntries,
  getOpenClinicDays,
  getTimeSlotsForDay,
  mergeAvailabilityEntries,
} from '@/utils/clinicAvailability';

interface AvailabilityPickerProps {
  operatingHours: OperatingHour[];
  entries: AvailabilityEntry[];
  onEntriesChange: (entries: AvailabilityEntry[]) => void;
}

const AvailabilityPicker: React.FC<AvailabilityPickerProps> = ({
  operatingHours,
  entries,
  onEntriesChange,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({
    day_of_week: '',
    start_time: '',
    end_time: '',
  });

  const openClinicDays = getOpenClinicDays(operatingHours);

  const handleManualAdd = () => {
    if (!draft.day_of_week || !draft.start_time || !draft.end_time) {
      toast.error(t('Please select day, start time, and end time'));
      return;
    }

    const dayOfWeek = Number(draft.day_of_week);
    onEntriesChange(
      mergeAvailabilityEntries(entries, [
        {
          day_of_week: dayOfWeek,
          start_time: draft.start_time,
          end_time: draft.end_time,
        },
      ])
    );
    setDraft({ day_of_week: '', start_time: '', end_time: '' });
  };

  const handleAddFullDay = () => {
    if (!draft.day_of_week) {
      toast.error(t('Please select a day first'));
      return;
    }

    const dayOfWeek = Number(draft.day_of_week);
    const entry = getFullDayEntry(operatingHours, dayOfWeek);
    if (!entry) {
      toast.error(t('No clinic hours available for this day'));
      return;
    }

    onEntriesChange(mergeAvailabilityEntries(entries, [entry]));
  };

  const handleAddFullWeek = () => {
    const weekEntries = getFullWeekEntries(operatingHours);
    if (weekEntries.length === 0) {
      toast.error(t('No clinic hours available for this week'));
      return;
    }

    onEntriesChange(mergeAvailabilityEntries(entries, weekEntries));
  };

  const handleRemoveEntry = (dayOfWeek: number) => {
    onEntriesChange(entries.filter((entry) => entry.day_of_week !== dayOfWeek));
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <Select
          value={draft.day_of_week}
          onValueChange={(value) =>
            setDraft({ day_of_week: value, start_time: '', end_time: '' })
          }
          disabled={openClinicDays.length === 0}
        >
          <SelectTrigger className="h-10">
            <SelectValue
              placeholder={openClinicDays.length === 0 ? t('No clinic hours') : t('Day')}
            />
          </SelectTrigger>
          <SelectContent>
            {openClinicDays.map((day) => (
              <SelectItem key={day.day_of_week} value={String(day.day_of_week)}>
                {t(DAY_LABELS[day.day_of_week])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={draft.start_time}
          onValueChange={(value) =>
            setDraft((prev) => ({ ...prev, start_time: value, end_time: '' }))
          }
          disabled={!draft.day_of_week}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder={t('Start time')} />
          </SelectTrigger>
          <SelectContent>
            {draft.day_of_week &&
              getTimeSlotsForDay(operatingHours, Number(draft.day_of_week)).map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select
          value={draft.end_time}
          onValueChange={(value) => setDraft((prev) => ({ ...prev, end_time: value }))}
          disabled={!draft.day_of_week || !draft.start_time}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder={t('End time')} />
          </SelectTrigger>
          <SelectContent>
            {draft.day_of_week &&
              draft.start_time &&
              getEndTimeSlots(
                operatingHours,
                Number(draft.day_of_week),
                draft.start_time
              ).map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={handleManualAdd}
          disabled={openClinicDays.length === 0}
        >
          {t('Add')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9"
          onClick={handleAddFullDay}
          disabled={!draft.day_of_week}
        >
          {t('Add full day')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9"
          onClick={handleAddFullWeek}
          disabled={openClinicDays.length === 0}
        >
          {t('Add full week')}
        </Button>
      </div>

      {entries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[...entries]
            .sort((a, b) => a.day_of_week - b.day_of_week)
            .map((entry) => (
              <span
                key={`${entry.day_of_week}-${entry.start_time}-${entry.end_time}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00FFA2] text-[#0C2243] rounded-full text-sm font-medium"
              >
                {`${t(DAY_LABELS[entry.day_of_week])}: ${entry.start_time} - ${entry.end_time}`}
                <button
                  type="button"
                  className="hover:bg-[#0C2243] hover:text-white rounded-full p-0.5 transition-colors"
                  onClick={() => handleRemoveEntry(entry.day_of_week)}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
};

export default AvailabilityPicker;
