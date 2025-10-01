import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isAfter, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ServiceCalendarProps {
  serviceData?: {
    schedule: { [key: string]: string };
  };
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
  className?: string;
}

const ServiceCalendar: React.FC<ServiceCalendarProps> = ({ 
  serviceData, 
  selectedDate,
  onDateSelect,
  className = "" 
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());

  // Update calendar month when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  }, [selectedDate]);

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleDateClick = (date: Date) => {
    if (serviceData) {
      // Check if the service is available on this day
      const dayName = format(date, 'EEE');
      const schedule = serviceData.schedule[dayName];
      
      if (schedule && schedule !== 'Closed' && isAfter(date, startOfDay(new Date()))) {
        onDateSelect(date);
      }
    } else {
      // For general calendar use (clinics), just check if it's not a past date
      if (isAfter(date, startOfDay(new Date()))) {
        onDateSelect(date);
      }
    }
  };

  const isDateAvailable = (date: Date) => {
    if (serviceData) {
      const dayName = format(date, 'EEE');
      const schedule = serviceData.schedule[dayName];
      return schedule && schedule !== 'Closed' && isAfter(date, startOfDay(new Date()));
    } else {
      // For general calendar use, all future dates are available
      return isAfter(date, startOfDay(new Date()));
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the beginning of the month to start on Monday
  const startDay = monthStart.getDay();
  const paddingDays = startDay === 0 ? 6 : startDay - 1;
  
  const paddedDays = [];
  for (let i = paddingDays; i > 0; i--) {
    const paddingDate = new Date(monthStart);
    paddingDate.setDate(paddingDate.getDate() - i);
    paddedDays.push(paddingDate);
  }

  const calendarDays = [...paddedDays, ...allDaysInMonth];

  return (
    <div className={`bg-white rounded-lg border p-6 max-w-md mx-auto ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
        >
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        
        <h3 className="text-base font-medium text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
        >
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 mb-4">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
          <div key={day} className="text-center py-3">
            <span className="text-xs font-medium text-gray-500">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-3">
        {calendarDays.map((date, index) => {
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isAvailable = isDateAvailable(date);

          return (
            <div key={index} className="aspect-square p-1">
              <button
                onClick={() => handleDateClick(date)}
                disabled={!isAvailable || !isCurrentMonth}
                className={`
                  w-full h-full rounded-full text-sm font-medium transition-all duration-200 flex items-center justify-center
                  ${!isCurrentMonth 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : isAvailable
                      ? 'cursor-pointer bg-gray-100 text-gray-900 hover:bg-gray-200'
                      : 'text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {format(date, 'd')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ServiceCalendar;