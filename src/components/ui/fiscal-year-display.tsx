import React from 'react';
import { Calendar } from 'lucide-react';

interface FiscalYearProps {
  data: {
    fiscalYear?: number;
    startMonth?: number;
    endMonth?: number;
  };
}

export function FiscalYearDisplay({ data }: FiscalYearProps) {
  if (!data.fiscalYear) {
    return <></>;
  }

  // Get month names in Swedish
  const getMonthName = (monthNumber: number) => {
    const months = [
      'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
      'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
    ];
    // Adjust for 0-based index
    return months[(monthNumber - 1) % 12];
  };

  // Ensure we're working with numbers
  const startMonthNum = typeof data.startMonth === 'number' ? data.startMonth : 0;
  const endMonthNum = typeof data.endMonth === 'number' ? data.endMonth : 0;
  
  const startMonth = startMonthNum > 0 ? getMonthName(startMonthNum) : null;
  const endMonth = endMonthNum > 0 ? getMonthName(endMonthNum) : null;
  
  return (
    <div className="bg-gray-04 rounded-lg p-4 border border-gray-03/20">
      <div className="flex items-center mb-2">
        <Calendar className="w-5 h-5 text-blue-03 mr-2" />
        <h3 className="text-lg font-medium text-gray-01">Financial year {data.fiscalYear}</h3>
      </div>
      
      {(startMonth && endMonth) ? (
        <div className="mt-2">
          <div className="flex items-center justify-between bg-gray-03/20 rounded-lg p-3">
            <div className="text-center flex-1">
              <div className="text-sm text-gray-02">Start month</div>
              <div className="font-medium text-gray-01">{startMonth}</div>
            </div>
            <div className="h-8 border-r border-gray-03/50"></div>
            <div className="text-center flex-1">
              <div className="text-sm text-gray-02">End month</div>
              <div className="font-medium text-gray-01">{endMonth}</div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-02">Financial year {data.fiscalYear}</p>
      )}
    </div>
  );
}
