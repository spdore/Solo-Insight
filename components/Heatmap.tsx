import React from 'react';
import { endOfMonth, eachDayOfInterval, getDay, format, isSameDay } from 'date-fns';
import startOfMonth from 'date-fns/startOfMonth';
import { Entry } from '../services/types';

interface HeatmapProps {
  entries: Entry[];
  currentDate: Date;
  onDayClick: (date: Date, entries: Entry[]) => void;
  daysHeader?: string[];
}

export const Heatmap: React.FC<HeatmapProps> = ({ entries, currentDate, onDayClick, daysHeader }) => {
  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start, end });

  // Add padding for start of week
  const startDayOfWeek = getDay(start);
  const emptyDays = Array(startDayOfWeek).fill(null);
  
  const headers = daysHeader || ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getIntensityColor = (date: Date) => {
    const dayEntries = entries.filter(e => isSameDay(new Date(e.timestamp), date));
    if (dayEntries.length === 0) return 'bg-slate-800/50 hover:bg-slate-800';
    
    const count = dayEntries.length;
    const avgIntensity = dayEntries.reduce((acc, curr) => acc + curr.intensity, 0) / count;
    
    // Dark mode logic: Dark grey is empty. 
    // Scale goes from deep violet -> bright fuchsia -> white/glow
    if (count > 2 || avgIntensity > 4) return 'bg-fuchsia-500 shadow-[0_0_10px_rgba(232,121,249,0.5)] border border-fuchsia-400';
    if (count > 1 || avgIntensity > 3) return 'bg-violet-500 border border-violet-500';
    if (avgIntensity > 2) return 'bg-violet-700 border border-violet-700';
    return 'bg-slate-700 border border-slate-600';
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-1 mb-2 text-[10px] text-slate-500 text-center uppercase tracking-wider font-medium">
        {headers.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {days.map((day) => {
            const dayEntries = entries.filter(e => isSameDay(new Date(e.timestamp), day));
            return (
            <button
                key={day.toISOString()}
                onClick={() => onDayClick(day, dayEntries)}
                className={`aspect-square rounded-md transition-all duration-300 ${getIntensityColor(day)} hover:scale-110 focus:outline-none`}
            >
                <span className="sr-only">{format(day, 'yyyy-MM-dd')}</span>
            </button>
            )
        })}
      </div>
    </div>
  );
};