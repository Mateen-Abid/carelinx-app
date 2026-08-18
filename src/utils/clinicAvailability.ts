export interface OperatingHour {
  day_of_week: number;
  opening_time: string | null;
  closing_time: string | null;
  is_closed: boolean;
}

export interface AvailabilityEntry {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export const DAY_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export const formatDbTimeTo12h = (time?: string | null) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export const displayTimeToMinutes = (displayTime: string) => {
  const [time, period] = displayTime.split(' ');
  const [hourRaw, minuteRaw] = time.split(':').map(Number);
  let hour24 = hourRaw % 12;
  if (period === 'PM') hour24 += 12;
  return hour24 * 60 + minuteRaw;
};

export const minutesToDisplayTime = (totalMinutes: number) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export const dbTimeToMinutes = (dbTime: string) => {
  const [h, m] = dbTime.split(':').map(Number);
  return h * 60 + m;
};

export const getOpenClinicDays = (operatingHours: OperatingHour[]) =>
  operatingHours
    .filter((h) => !h.is_closed && h.opening_time && h.closing_time)
    .sort((a, b) => a.day_of_week - b.day_of_week);

export const getTimeSlotsForDay = (operatingHours: OperatingHour[], dayOfWeek: number) => {
  const hours = operatingHours.find(
    (h) => h.day_of_week === dayOfWeek && !h.is_closed && h.opening_time && h.closing_time
  );
  if (!hours?.opening_time || !hours?.closing_time) return [];

  const startMinutes = dbTimeToMinutes(hours.opening_time);
  const endMinutes = dbTimeToMinutes(hours.closing_time);
  const slots: string[] = [];

  for (let current = startMinutes; current <= endMinutes; current += 30) {
    slots.push(minutesToDisplayTime(current));
  }
  return slots;
};

export const getEndTimeSlots = (
  operatingHours: OperatingHour[],
  dayOfWeek: number,
  startTime: string
) => {
  if (!startTime) return [];
  const startMinutes = displayTimeToMinutes(startTime);
  return getTimeSlotsForDay(operatingHours, dayOfWeek).filter(
    (slot) => displayTimeToMinutes(slot) > startMinutes
  );
};

export const getFullDayEntry = (
  operatingHours: OperatingHour[],
  dayOfWeek: number
): AvailabilityEntry | null => {
  const hours = operatingHours.find(
    (h) =>
      h.day_of_week === dayOfWeek &&
      !h.is_closed &&
      h.opening_time &&
      h.closing_time
  );
  if (!hours?.opening_time || !hours?.closing_time) return null;

  return {
    day_of_week: dayOfWeek,
    start_time: formatDbTimeTo12h(hours.opening_time),
    end_time: formatDbTimeTo12h(hours.closing_time),
  };
};

export const getFullWeekEntries = (operatingHours: OperatingHour[]): AvailabilityEntry[] =>
  getOpenClinicDays(operatingHours).map((day) => ({
    day_of_week: day.day_of_week,
    start_time: formatDbTimeTo12h(day.opening_time),
    end_time: formatDbTimeTo12h(day.closing_time),
  }));

export const mergeAvailabilityEntries = (
  existing: AvailabilityEntry[],
  incoming: AvailabilityEntry[]
): AvailabilityEntry[] => {
  const byDay = new Map(existing.map((entry) => [entry.day_of_week, entry]));
  incoming.forEach((entry) => byDay.set(entry.day_of_week, entry));
  return Array.from(byDay.values());
};

export const buildAvailabilityString = (entries: AvailabilityEntry[]) =>
  entries
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map((entry) => `${DAY_LABELS[entry.day_of_week]}: ${entry.start_time} - ${entry.end_time}`)
    .join(' | ');

export const parseAvailabilityString = (availability: string | null): AvailabilityEntry[] => {
  if (!availability) return [];

  const dayToNumber: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  return availability
    .split('|')
    .map((part) => part.trim())
    .map((part) => {
      const match = part.match(/^([A-Za-z]+):\s*(.+)\s-\s(.+)$/);
      if (!match) return null;
      const [, dayName, start, end] = match;
      const day_of_week = dayToNumber[dayName];
      if (day_of_week === undefined) return null;
      return { day_of_week, start_time: start.trim(), end_time: end.trim() } as AvailabilityEntry;
    })
    .filter((entry): entry is AvailabilityEntry => entry !== null);
};
