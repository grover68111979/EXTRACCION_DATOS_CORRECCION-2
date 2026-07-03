import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { ExcepcionLaboral } from '../supabaseClient';

interface ExceptionsCalendarProps {
  exceptions: ExcepcionLaboral[];
  onToggleException: (fecha: string, newEsLaboral: boolean) => Promise<void>;
  isLoading: boolean;
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function ExceptionsCalendar({
  exceptions,
  onToggleException,
  isLoading
}: ExceptionsCalendarProps) {
  // Use July 2026 as the default starting date as per the metadata timestamp
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Month index 6 is July

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Helper to determine the default status based on Day of Week
  // Sunday (0) = false (non-working), Monday to Saturday (1-6) = true (working)
  const getDefaultStatus = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 0; // true = working, false = non-working
  };

  // Get date key in YYYY-MM-DD format based on local midnight
  const getDateStr = (y: number, m: number, d: number): string => {
    const paddedMonth = (m + 1).toString().padStart(2, '0');
    const paddedDay = d.toString().padStart(2, '0');
    return `${y}-${paddedMonth}-${paddedDay}`;
  };

  // Get current active status for a given date
  const getActiveStatus = (dateStr: string, dateObj: Date): { esLaboral: boolean; isOverridden: boolean } => {
    const exception = exceptions.find((ex) => ex.fecha === dateStr);
    if (exception) {
      return { esLaboral: exception.es_laboral, isOverridden: true };
    }
    return { esLaboral: getDefaultStatus(dateObj), isOverridden: false };
  };

  // Toggle calendar day status
  const handleDayClick = async (dayNum: number) => {
    if (isLoading) return;

    const dateObj = new Date(year, month, dayNum);
    const dateStr = getDateStr(year, month, dayNum);
    
    const { esLaboral: currentStatus } = getActiveStatus(dateStr, dateObj);
    const newStatus = !currentStatus; // toggle state
    
    // Call the parent handler to sync to Supabase (or local fallback)
    await onToggleException(dateStr, newStatus);
  };

  // Generate calendar grid
  const firstDayOfMonthIndex = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday...
  // Convert to Mon-Sun index (0 is Monday, 6 is Sunday)
  const startOffset = firstDayOfMonthIndex === 0 ? 6 : firstDayOfMonthIndex - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells = [];

  // Add blank padding cells for the start of the month
  for (let i = 0; i < startOffset; i++) {
    calendarCells.push(null);
  }

  // Add the actual days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm" id="exceptions-calendar-container">
      <div className="flex flex-col gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Calendario Laboral</h3>
            <p className="text-xs text-slate-500 font-medium">Haz clic en un día para alternar su estado laboral</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <span>Día estándar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Domingo (No Laboral)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Excepción: Festivo Lab.</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        {/* Month Selector */}
        <div className="flex items-center justify-between mb-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 transition-all cursor-pointer"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-mono">
            {MONTHS_ES[month]} {year}
          </h4>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 transition-all cursor-pointer"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center mb-5">
          {DAYS_ES.map((day) => (
            <div key={day} className="text-[10px] font-bold text-slate-400 py-1 font-sans">
              {day[0]} {/* L, M, X, J, V, S, D format */}
            </div>
          ))}

          {calendarCells.map((dayNum, index) => {
            if (dayNum === null) {
              return <div key={`empty-${index}`} className="h-8 flex items-center justify-center text-xs text-slate-300" />;
            }

            const dateObj = new Date(year, month, dayNum);
            const dateStr = getDateStr(year, month, dayNum);
            const { esLaboral, isOverridden } = getActiveStatus(dateStr, dateObj);
            const isSunday = dateObj.getDay() === 0;

            // Compute styling classes following exactly:
            // - Sunday (No Laboral) = bg-red-50 text-red-500 font-bold
            // - Excepción: Festivo Lab = bg-blue-50 ring-1 ring-blue-200 text-blue-600 font-bold
            // - Día estándar = hover:bg-slate-50
            let cellClass = 'h-8 flex flex-col items-center justify-center text-xs font-medium cursor-pointer rounded transition-all relative ';
            
            if (isOverridden) {
              if (esLaboral) {
                // Was Sunday/Descanso but exception made it Lab -> Blue Exception
                cellClass += 'bg-blue-50 text-blue-600 font-bold ring-1 ring-blue-200';
              } else {
                // Was working day but exception made it No Laboral -> Red/Feriado Exception
                cellClass += 'bg-red-50 text-red-500 font-bold';
              }
            } else {
              if (isSunday) {
                // Sunday standard non-working
                cellClass += 'bg-red-50 text-red-500 font-bold';
              } else {
                // Standard working day
                cellClass += 'text-slate-700 hover:bg-slate-50';
              }
            }

            return (
              <button
                key={`day-${dayNum}`}
                onClick={() => handleDayClick(dayNum)}
                disabled={isLoading}
                id={`calendar-day-${dateStr}`}
                className={`${cellClass} select-none group focus:outline-hidden disabled:opacity-50`}
                title={`${dateStr} - ${esLaboral ? 'Laboral' : 'No Laboral'}`}
              >
                <span>{dayNum}</span>
                
                {/* Micro active dot under current exceptions */}
                {isOverridden && (
                  <span className={`absolute bottom-1 w-1 h-1 rounded-full ${esLaboral ? 'bg-blue-600' : 'bg-red-500'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Informative Note */}
        <div className="p-4 mt-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl text-[11px] font-medium">
          <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Referencias</p>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-[10px] font-medium text-slate-600">Domingo (No Laboral)</span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-[10px] font-medium text-slate-600">Excepción: Festivo Lab.</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <span className="text-[10px] font-medium text-slate-400">Día estándar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
