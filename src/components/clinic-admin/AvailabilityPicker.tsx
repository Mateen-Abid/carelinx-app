import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  formatDbTimeTo12h,
  getEndTimeSlots,
  getFullDayEntry,
  getFullWeekEntries,
  getTimeSlotsForDay,
} from '@/utils/clinicAvailability';

interface AvailabilityPickerProps {
  operatingHours: OperatingHour[];
  entries: AvailabilityEntry[];
  onEntriesChange: (entries: AvailabilityEntry[]) => void;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const AvailabilityPicker: React.FC<AvailabilityPickerProps> = ({
  operatingHours,
  entries,
  onEntriesChange,
}) => {
  const { t } = useTranslation();

  const getDayHours = (dayOfWeek: number) =>
    operatingHours.find(
      (h) =>
        h.day_of_week === dayOfWeek &&
        !h.is_closed &&
        h.opening_time &&
        h.closing_time
    );

  const getEntryForDay = (dayOfWeek: number) =>
    entries.find((entry) => entry.day_of_week === dayOfWeek);

  const openDays = ALL_DAYS.filter((day) => Boolean(getDayHours(day)));
  const allOpenSelected =
    openDays.length > 0 && openDays.every((day) => Boolean(getEntryForDay(day)));

  const upsertEntry = (entry: AvailabilityEntry) => {
    const next = entries.filter((item) => item.day_of_week !== entry.day_of_week);
    onEntriesChange([...next, entry].sort((a, b) => a.day_of_week - b.day_of_week));
  };

  const removeDay = (dayOfWeek: number) => {
    onEntriesChange(entries.filter((entry) => entry.day_of_week !== dayOfWeek));
  };

  const handleToggleDay = (dayOfWeek: number, checked: boolean) => {
    if (!checked) {
      removeDay(dayOfWeek);
      return;
    }

    const fullDay = getFullDayEntry(operatingHours, dayOfWeek);
    if (!fullDay) {
      toast.error(t('No clinic hours available for this day'));
      return;
    }
    upsertEntry(fullDay);
  };

  const handleStartChange = (dayOfWeek: number, startTime: string) => {
    const current = getEntryForDay(dayOfWeek);
    const endSlots = getEndTimeSlots(operatingHours, dayOfWeek, startTime);
    const nextEnd =
      current && endSlots.includes(current.end_time) ? current.end_time : endSlots[0] || '';

    if (!nextEnd) {
      toast.error(t('Please select a valid end time'));
      return;
    }

    upsertEntry({
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: nextEnd,
    });
  };

  const handleEndChange = (dayOfWeek: number, endTime: string) => {
    const current = getEntryForDay(dayOfWeek);
    if (!current?.start_time) return;

    upsertEntry({
      day_of_week: dayOfWeek,
      start_time: current.start_time,
      end_time: endTime,
    });
  };

  const handleSelectAll = () => {
    const weekEntries = getFullWeekEntries(operatingHours);
    if (weekEntries.length === 0) {
      toast.error(t('No clinic hours available for this week'));
      return;
    }
    onEntriesChange(weekEntries);
  };

  const handleClearAll = () => {
    onEntriesChange([]);
  };

  if (openDays.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 px-4 py-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('No clinic hours')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('Select days and set start and end times within clinic hours.')}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleSelectAll}
            disabled={allOpenSelected}
          >
            {t('Select all')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleClearAll}
            disabled={entries.length === 0}
          >
            {t('Clear')}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
        {ALL_DAYS.map((dayOfWeek) => {
          const dayHours = getDayHours(dayOfWeek);
          const isOpen = Boolean(dayHours);
          const entry = getEntryForDay(dayOfWeek);
          const isSelected = Boolean(entry);
          const clinicRange =
            dayHours?.opening_time && dayHours?.closing_time
              ? `${formatDbTimeTo12h(dayHours.opening_time)} – ${formatDbTimeTo12h(dayHours.closing_time)}`
              : '';

          return (
            <div
              key={dayOfWeek}
              className={`flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 ${
                !isOpen
                  ? 'bg-gray-50/80 dark:bg-gray-800/40 opacity-60'
                  : isSelected
                    ? 'bg-[#00FFA2]/10 dark:bg-[#00FFA2]/5'
                    : 'bg-white dark:bg-gray-800'
              }`}
            >
              <label className="flex min-w-[9.5rem] items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={isSelected}
                  disabled={!isOpen}
                  onCheckedChange={(checked) => handleToggleDay(dayOfWeek, checked === true)}
                  className="border-gray-300 data-[state=checked]:bg-[#0C2243] data-[state=checked]:border-[#0C2243] dark:data-[state=checked]:bg-[#00FFA2] dark:data-[state=checked]:border-[#00FFA2] dark:data-[state=checked]:text-[#0C2243]"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {t(DAY_LABELS[dayOfWeek])}
                </span>
              </label>

              {!isOpen ? (
                <span className="text-sm text-gray-400 dark:text-gray-500">{t('Closed')}</span>
              ) : isSelected && entry ? (
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <Select
                    value={entry.start_time}
                    onValueChange={(value) => handleStartChange(dayOfWeek, value)}
                  >
                    <SelectTrigger className="h-9 bg-white dark:bg-gray-900">
                      <SelectValue placeholder={t('Start time')} />
                    </SelectTrigger>
                    <SelectContent>
                      {getTimeSlotsForDay(operatingHours, dayOfWeek)
                        .slice(0, -1)
                        .map((time) => (
                          <SelectItem key={`start-${dayOfWeek}-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <span className="hidden text-gray-400 sm:inline">–</span>

                  <Select
                    value={entry.end_time}
                    onValueChange={(value) => handleEndChange(dayOfWeek, value)}
                  >
                    <SelectTrigger className="h-9 bg-white dark:bg-gray-900">
                      <SelectValue placeholder={t('End time')} />
                    </SelectTrigger>
                    <SelectContent>
                      {getEndTimeSlots(operatingHours, dayOfWeek, entry.start_time).map((time) => (
                        <SelectItem key={`end-${dayOfWeek}-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  {t('Clinic hours')}: {clinicRange}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AvailabilityPicker;
