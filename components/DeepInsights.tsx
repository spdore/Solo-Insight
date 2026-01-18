import React, { useMemo } from 'react';
import { Entry, Language } from '../types';
import { translations } from '../utils/translations';
import { Clock, Zap, Activity, Award } from 'lucide-react';
import { 
  BarChart, Bar, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface DeepInsightsProps {
  entries: Entry[];
  lang: Language;
}

export const DeepInsights: React.FC<DeepInsightsProps> = ({ entries, lang }) => {
  const t = translations[lang];

  // --- Helpers for Data Processing ---
  
  const getTranslatedTag = (tag: string) => {
    const key = `tag_${tag.replace(/\s+/g, '_')}` as keyof typeof t;
    return (t as any)[key] || tag;
  };

  const processData = useMemo(() => {
    if (entries.length === 0) return null;

    // 1. Time of Day Distribution (00-23) grouped by 2-hour blocks
    const hourBuckets = Array(12).fill(0).map((_, i) => ({ 
        name: `${i*2}`, 
        label: `${i*2}:00`,
        count: 0 
    }));
    
    entries.forEach(e => {
        const h = new Date(e.timestamp).getHours();
        const bucketIndex = Math.floor(h / 2);
        hourBuckets[bucketIndex].count += 1;
    });

    // 2. Tag Ranking by Intensity
    const tagMap: Record<string, { count: number, totalIntensity: number }> = {};
    entries.forEach(e => {
        e.tags.forEach(tag => {
            if (!tagMap[tag]) tagMap[tag] = { count: 0, totalIntensity: 0 };
            tagMap[tag].count += 1;
            tagMap[tag].totalIntensity += e.intensity;
        });
    });
    
    const tagRanking = Object.entries(tagMap)
        .map(([name, data]) => ({
            name: getTranslatedTag(name),
            avgIntensity: data.totalIntensity / data.count,
            count: data.count
        }))
        .filter(t => t.count > 0) // Show all tags
        .sort((a, b) => b.avgIntensity - a.avgIntensity)
        .slice(0, 5); // Top 5

    // 3. Granular Stats
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    let maxStreak = 0;
    let currentStreak = 0;
    let totalIntervalDays = 0;
    let intervalCount = 0;

    for (let i = 0; i < sorted.length; i++) {
        if (i > 0) {
            const diffDays = (sorted[i].timestamp - sorted[i-1].timestamp) / (1000 * 60 * 60 * 24);
            if (diffDays < 2) currentStreak++;
            else {
                maxStreak = Math.max(maxStreak, currentStreak);
                currentStreak = 1;
            }
            
            if (diffDays > 0.5) { // Ignore multiple times same day for interval calc
                totalIntervalDays += diffDays;
                intervalCount++;
            }
        } else {
            currentStreak = 1;
        }
    }
    maxStreak = Math.max(maxStreak, currentStreak);
    
    const avgInterval = intervalCount > 0 ? (totalIntervalDays / intervalCount).toFixed(1) : "0";
    const edgingCount = entries.filter(e => e.orgasm === 'EDGING').length;
    const edgingRate = Math.round((edgingCount / entries.length) * 100);

    return { hourBuckets, tagRanking, avgInterval, maxStreak, edgingRate };
  }, [entries, lang]);

  if (!processData) {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
              <Activity size={48} className="mb-4 opacity-50" />
              <p>{t.di_no_data}</p>
          </div>
      );
  }

  return (
    <div className="pb-24 pt-4 animate-slide-up space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-white mb-6">{t.deep_insights}</h1>

      {/* BENTO GRID LAYOUT */}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. Active Hours (Half Width) */}
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex flex-col h-64">
              <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock size={12} /> {t.di_time_dist}
              </h3>
              <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={processData.hourBuckets}>
                          <Tooltip 
                              cursor={{fill: 'rgba(255,255,255,0.05)'}}
                              contentStyle={{backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', fontSize: '12px'}}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {processData.hourBuckets.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="url(#colorTime)" />
                            ))}
                          </Bar>
                          <defs>
                            <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={1}/>
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={1}/>
                            </linearGradient>
                         </defs>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600 font-medium px-2 mt-2">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>23:00</span>
              </div>
          </div>

          {/* 2. Top Tags Ranking (Half Width) */}
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex flex-col h-64">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                      <Award size={12} /> {t.di_tag_ranking}
                  </h3>
                  <span className="text-[10px] text-slate-600">{t.di_by_intensity}</span>
              </div>
              
              <div className="flex-1 flex flex-col justify-center gap-3 overflow-y-auto no-scrollbar">
                  {processData.tagRanking.length > 0 ? (
                      processData.tagRanking.map((tag, idx) => (
                          <div key={tag.name} className="relative">
                              <div className="flex justify-between text-xs font-medium text-slate-300 mb-1 z-10 relative">
                                  <span>{idx + 1}. {tag.name}</span>
                                  <span className="flex items-center gap-1">
                                      <Zap size={10} className="text-amber-400" fill="currentColor"/> 
                                      {tag.avgIntensity.toFixed(1)}
                                  </span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" 
                                    style={{ width: `${(tag.avgIntensity / 5) * 100}%` }}
                                  />
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="text-center text-slate-600 text-xs italic">Use tags to see rankings</div>
                  )}
              </div>
          </div>
      </div>

      {/* 3. Stats Blocks */}
      <div className="grid grid-cols-3 gap-4">
           {/* Interval */}
           <div className="col-span-1 bg-slate-900 p-3 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
               <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">{t.di_stats_interval}</span>
               <div className="flex items-end gap-1">
                   <span className="text-xl font-medium text-white">{processData.avgInterval}</span>
                   <span className="text-[10px] text-slate-500 mb-1">{t.days}</span>
               </div>
           </div>
           {/* Streak */}
           <div className="col-span-1 bg-slate-900 p-3 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
               <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">{t.di_stats_streak}</span>
                <div className="flex items-end gap-1">
                   <span className="text-xl font-medium text-white">{processData.maxStreak}</span>
                   <span className="text-[10px] text-slate-500 mb-1">{t.days}</span>
               </div>
           </div>
           {/* Edging Rate */}
           <div className="col-span-1 bg-slate-900 p-3 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
               <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">{t.di_stats_edging}</span>
               <div className="flex items-end gap-1">
                   <span className="text-xl font-medium text-white">{processData.edgingRate}</span>
                   <span className="text-[10px] text-slate-500 mb-1">%</span>
               </div>
           </div>
      </div>
    </div>
  );
};