import React from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  startOfMonth, 
  endOfMonth,
  addWeeks,
  subWeeks,
  isToday,
  differenceInDays
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, User, Snowflake, HeartPulse, ClipboardList, Calendar as CalendarIcon } from 'lucide-react';
import { Appointment, Project } from '../types';

interface CalendarViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  appointments: Appointment[];
  projects: Project[];
  onDayClick: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

const renderIcon = (category: string) => {
  if (!category) return null;
  const lower = category.toLowerCase();
  
  if (lower.includes('visita')) return <User size={10} className="inline-block mr-1 opacity-70" />;
  if (lower.includes('hielo')) return <Snowflake size={10} className="inline-block mr-1 text-blue-500 opacity-70" />;
  if (lower.includes('enfermería') || lower.includes('enfermeria')) return <HeartPulse size={10} className="inline-block mr-1 text-red-500 opacity-70" />;
  
  return <CalendarIcon size={10} className="inline-block mr-1 opacity-70" />;
};

export function CalendarView({ 
  currentDate, 
  onDateChange, 
  appointments, 
  projects,
  onDayClick,
  onAppointmentClick
}: CalendarViewProps) {
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => onDateChange(addMonths(currentDate, 1));
  const prevMonth = () => onDateChange(subMonths(currentDate, 1));
  const goToToday = () => onDateChange(new Date());

  const getExactAppointmentsForDay = (day: Date) => {
    return appointments.filter(app => isSameDay(app.date, day)).sort((a, b) => {
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });
  };

  const getFlexibleAppointmentsForDay = (day: Date) => {
    return appointments.filter(app => {
      if (!app.flexibilityDays || app.flexibilityDays <= 0) return false;
      if (isSameDay(app.date, day)) return false; // Handled by exact appointments
      
      const diff = differenceInDays(day, app.date);
      return diff >= -app.flexibilityDays && diff <= app.flexibilityDays;
    }).sort((a, b) => {
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });
  };

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="flex flex-col h-full bg-[#FAF9F6] w-full">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#EAE7E2] shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-[#BF0065] capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-[#F1F0ED] rounded-full p-1">
            <button onClick={goToToday} className="px-4 py-1 text-xs font-medium bg-white rounded-full shadow-sm text-[#333]">
              Hoy
            </button>
          </div>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full text-[#4F4F4F] transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full text-[#4F4F4F] transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="w-full h-full flex flex-col min-w-[320px]">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-[#EAE7E2] shrink-0">
            {weekDays.map((day, idx) => (
              <div key={day} className={`py-2 md:py-3 border-r border-[#EAE7E2] text-center text-[10px] md:text-xs font-bold text-[#AAA] ${idx >= 5 ? 'bg-[#F9F8F6]' : 'bg-white'}`}>
                <span className="hidden md:inline">{day}</span>
                <span className="md:hidden">{day.charAt(0)}</span>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-[#F9F8F6] p-1 md:p-2 gap-1 md:gap-2 min-h-[500px]">
            {days.map((day, idx) => {
            const exactAppointments = getExactAppointmentsForDay(day);
            const flexibleAppointments = getFlexibleAppointmentsForDay(day);
            
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isDayToday = isToday(day);
            const isWeekend = idx % 7 >= 5;

            return (
              <div 
                key={day.toString()} 
                onClick={() => onDayClick(day)}
                className={`
                  p-1 md:p-2 flex flex-col gap-1 relative group cursor-pointer transition-colors rounded-lg shadow-sm border border-[#007B83] hover:bg-[#007B83]/5 overflow-hidden
                  ${!isCurrentMonth ? 'opacity-40 bg-[#FDFCFB]' : isDayToday ? 'bg-[#007B83]/10 ring-1 ring-[#007B83]/50' : isWeekend ? 'bg-[#FAF9F6]' : 'bg-white'}
                `}
              >
                <div className="flex justify-between items-start mb-0.5 md:mb-1">
                  <span className={`text-[10px] md:text-xs ${isDayToday ? 'font-bold text-[#007B83]' : 'font-medium group-hover:text-[#007B83]'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                    <Plus size={12} className="text-gray-400" />
                  </div>
                </div>

                <div className="space-y-0.5 md:space-y-1 overflow-y-auto custom-scrollbar flex-1">
                  
                  {/* Flexible Window Render */}
                  {flexibleAppointments.map(app => {
                    const project = projects.find(p => p.id === app.projectId);
                    const colorClass = project?.color || 'bg-gray-100';
                    return (
                      <div 
                        key={`flex-${app.id}`}
                        onClick={(e) => { e.stopPropagation(); onAppointmentClick(app); }}
                        className={`
                          text-[8px] md:text-[9px] font-medium p-0.5 md:p-1 rounded flex-col md:flex-row md:items-center border border-dashed border-gray-300 opacity-60 overflow-hidden cursor-pointer flex ${colorClass}
                        `}
                        title={`Ventana de ±${app.flexibilityDays} días para: ${app.title}`}
                      >
                        <div className="flex items-center gap-0.5 shrink-0">
                           {renderIcon(app.category)}
                           <span className="hidden md:inline">[±{app.flexibilityDays}d]</span>
                        </div>
                        <span className="truncate w-full text-center md:text-left">{app.title}</span>
                      </div>
                    )
                  })}

                  {/* Exact Day Render */}
                  {exactAppointments.map(app => {
                    const project = projects.find(p => p.id === app.projectId);
                    const colorClass = project?.color || 'bg-gray-100';
                    return (
                      <div 
                        key={app.id}
                        onClick={(e) => { e.stopPropagation(); onAppointmentClick(app); }}
                        className={`
                          text-[8px] md:text-[9px] font-bold p-0.5 md:p-1 rounded overflow-hidden border border-black/10 hover:shadow-sm transition-shadow cursor-pointer flex flex-col md:flex-row md:items-center ${colorClass}
                        `}
                        title={app.title}
                      >
                        <div className="flex justify-center md:justify-start shrink-0 mb-0.5 md:mb-0 md:mr-1">
                           {renderIcon(app.category)}
                        </div>
                        <span className="truncate w-full text-center md:text-left">{app.title}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}
