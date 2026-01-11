import React from 'react';

interface DatePickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const DatePicker: React.FC<DatePickerProps> = ({ selectedDate, onDateChange }) => {
  return (
    <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
      <span className="text-gray-500 text-sm font-medium">新闻日期:</span>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
        className="outline-none text-gray-800 font-semibold bg-transparent cursor-pointer"
        max={new Date().toISOString().split('T')[0]}
      />
    </div>
  );
};

export default DatePicker;