
import { Calendar } from 'lucide-react';

interface FiscalYearProps {
  data: {
    fiscalYear?: { startMonth?: number; endMonth?: number };
  };
}

export function FiscalYearDisplay({ data }: FiscalYearProps) {
  // If nothing at all, return null
  if (!data.fiscalYear) {
    return null;
  }

  let startMonthNum: number | undefined = data.fiscalYear.startMonth;
  let endMonthNum: number | undefined = data.fiscalYear.endMonth;

  const getMonthName = (monthNumber: number) => {
    const months = [
      'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
      'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
    ];
    return months[(monthNumber - 1) % 12];
  };

  const startMonth = startMonthNum ? getMonthName(startMonthNum) : null;
  const endMonth = endMonthNum ? getMonthName(endMonthNum) : null;

  return (
    <div className="bg-gray-04 rounded-lg p-4 border border-gray-03/20">
      <div className="flex items-center mb-2">
        <Calendar className="w-5 h-5 text-blue-03 mr-2" />
        <h3 className="text-lg font-medium text-gray-01">
          Räkenskapsår
        </h3>
      </div>
      {(startMonth && endMonth) ? (
        <div className="mt-2">
          <div className="flex items-center justify-between bg-gray-03/20 rounded-lg p-3">
            <div className="text-center flex-1">
              <div className="text-sm text-gray-02">Startmånad</div>
              <div className="font-medium text-gray-01">{startMonth}</div>
            </div>
            <div className="h-8 border-r border-gray-03/50"></div>
            <div className="text-center flex-1">
              <div className="text-sm text-gray-02">Slutmånad</div>
              <div className="font-medium text-gray-01">{endMonth}</div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-02">
          Räkenskapsår: {startMonth || ''} - {endMonth || ''}
        </p>
      )}
    </div>
  );
}
