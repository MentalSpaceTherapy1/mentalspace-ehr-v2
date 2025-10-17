import { useState, useRef, useEffect } from 'react';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

export default function TimePicker({
  value,
  onChange,
  label,
  required = false,
  error,
  className = ''
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate time slots in 15-minute increments from 6:00 AM to 9:45 PM
  const generateTimeSlots = () => {
    const slots: string[] = [];
    const startHour = 6; // 6:00 AM
    const endHour = 21; // 9:00 PM (21:45 is last slot)

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        // Stop after 9:45 PM
        if (hour === 21 && minute > 45) break;

        const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time24);
      }
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Convert 24-hour time to 12-hour format for display
  const formatTime12Hour = (time24: string) => {
    if (!time24) return '';

    const [hourStr, minuteStr] = time24.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = minuteStr;

    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

    return `${hour12}:${minute} ${period}`;
  };

  // Update display value when value prop changes
  useEffect(() => {
    setDisplayValue(formatTime12Hour(value));
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (time: string) => {
    onChange(time);
    setIsOpen(false);
  };

  // Scroll to selected time when dropdown opens
  useEffect(() => {
    if (isOpen && value && dropdownRef.current) {
      const selectedElement = dropdownRef.current.querySelector(`[data-time="${value}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [isOpen, value]);

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-left flex items-center justify-between ${
            error ? 'border-red-500' : 'border-purple-200'
          }`}
        >
          <span className={displayValue ? 'text-gray-900' : 'text-gray-400'}>
            {displayValue || 'Select time'}
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-purple-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
            {timeSlots.map((time) => {
              const isSelected = time === value;
              return (
                <button
                  key={time}
                  type="button"
                  data-time={time}
                  onClick={() => handleSelect(time)}
                  className={`w-full px-4 py-2 text-left hover:bg-purple-50 transition-colors ${
                    isSelected ? 'bg-purple-100 font-semibold text-purple-700' : 'text-gray-700'
                  }`}
                >
                  {formatTime12Hour(time)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
