import React, { useMemo } from 'react';
import { Entry, Language } from '../services/types';
import { translations } from '../utils/translations';
import { Clock, Zap, Activity } from 'lucide-react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

interface DeepInsightsProps {
  entries: Entry[];
  lang: Language;
}

export const DeepInsights: React.FC<DeepInsightsProps> = ({ entries, lang }) => {
  const t = translations[lang];

  const chartData = useMemo(() => {
    if (entries.length === 0) return [];
    
    // Take last 20 entries for readability, sorted by date
    const recent = [...entries].sort((a, b) => a.timestamp - b.timestamp).slice(-20);
    
    return recent.map(e => ({
        date: format(new Date(e.timestamp), 'MM/dd'),
        duration: e.duration,
        intensity: e.intensity
    }));
  }, [entries]);

  const stats = useMemo(() => {
    if (entries.length === 0) return { avgDuration: 0, avgIntensity: 0 };
    
    const totalDuration = entries.reduce((acc, c) => acc + c.duration, 0);
    const totalIntensity = entries.reduce((acc, c) => acc + c.intensity, 0);
    
    return {
        avgDuration: Math.round(totalDuration / entries.length),
        avgIntensity: (totalIntensity / entries.length).toFixed(1)
    };
  }, [entries]);

  if (entries.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500 animate-slide-up">
              <Activity size={48} className="mb-4 opacity-50" />
              <p>{lang === 'zh' ? '暂无足够数据进行分析' : 'Not enough data for insights'}</p>
          </div>
      );
  }

  return (
    <div className="pb-24 pt-4 animate-slide-up space-y-6">
      <header>
          <h1 className="text-2xl font-bold tracking-tight text-white">{t.deep_insights}</h1>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-5 rounded-3xl border border-slate-800 flex flex-col items-center justify-center shadow-lg backdrop-blur-md">
              <div className="text-violet-400 mb-2"><Clock size={20} /></div>
              <div className="text-3xl font-light text-white mb-1">{stats.avgDuration}<span className="text-sm text-slate-500 ml-1">m</span></div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">{lang === 'zh' ? '平均时长' : 'Avg Duration'}</div>
          </div>
          <div className="bg-slate-900/50 p-5 rounded-3xl border border-slate-800 flex flex-col items-center justify-center shadow-lg backdrop-blur-md">
              <div className="text-amber-400 mb-2"><Zap size={20} /></div>
              <div className="text-3xl font-light text-white mb-1">{stats.avgIntensity}<span className="text-sm text-slate-500 ml-1">/5</span></div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">{t.avg_intensity}</div>
          </div>
      </div>

      {/* Main Combined Chart */}
      <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-md">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center justify-between">
              <span>{lang === 'zh' ? '时长与强度趋势' : 'Duration vs Intensity'}</span>
              <span className="text-[10px] font-normal normal-case opacity-70">{lang === 'zh' ? '最近20次' : 'Last 20 sessions'}</span>
          </h3>
          
          <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                      <defs>
                        <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#6d28d9" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 10}} 
                        dy={10}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        yAxisId="left" 
                        orientation="left" 
                        hide
                        domain={[0, 'auto']}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        hide
                        domain={[0, 5]}
                      />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#f8fafc', fontSize: '12px'}}
                        itemStyle={{padding: 0}}
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      />
                      {/* Duration Bars */}
                      <Bar yAxisId="left" dataKey="duration" barSize={12} radius={[4, 4, 0, 0]} fill="url(#durationGradient)" name="Duration (min)" />
                      
                      {/* Intensity Line */}
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="intensity" 
                        stroke="#fbbf24" 
                        strokeWidth={2} 
                        dot={{fill: '#fbbf24', r: 3, strokeWidth: 0}} 
                        activeDot={{r: 5, strokeWidth: 0}}
                        name="Intensity"
                      />
                  </ComposedChart>
              </ResponsiveContainer>
          </div>
          
          <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                  <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                  Duration
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  Intensity
              </div>
          </div>
      </div>
    </div>
  );
};