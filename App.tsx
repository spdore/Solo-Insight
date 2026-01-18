import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from './services/storageService';
import { FirebaseService } from './services/firebase';
import { Entry, ViewState, Achievement, ContentItem, Language } from './types';
import { Heatmap } from './components/Heatmap';
import { LogModal } from './components/LogModal';
import { SettingsModal } from './components/SettingsModal';
import { Library } from './components/Library';
import { SwipeableEntry } from './components/SwipeableEntry';
import { AiLockModal } from './components/AiLockModal';
import { DeepInsights } from './components/DeepInsights';
import { AuthPage } from './components/AuthPage'; // Import Auth Page
import { translations } from './utils/translations';
import { User } from 'firebase/auth';
import { 
  BarChart2, 
  Calendar as CalendarIcon, 
  Plus, 
  Award, 
  Settings, 
  History, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Clock,
  Sparkles,
  Flame,
  Activity,
  Library as LibraryIcon,
  CheckCircle2,
  LogOut,
  Loader2
} from 'lucide-react';
import { format, differenceInDays, isSameDay, addMonths, isSameMonth } from 'date-fns';
import zhCN from 'date-fns/locale/zh-CN';
import enUS from 'date-fns/locale/en-US';
import subDays from 'date-fns/subDays';
import subMonths from 'date-fns/subMonths';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [libraryItems, setLibraryItems] = useState<ContentItem[]>([]);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [unlockedAchievements, setUnlockedAchievements] = useState<Record<string, number>>({});
  const [lang, setLang] = useState<Language>('en');
  const [aiAccess, setAiAccess] = useState({ unlocked: false, attempts: 0 });
  
  // Animation States
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [selectedDay, setSelectedDay] = useState<{date: Date, entries: Entry[]} | null>(null);

  const t = translations[lang];
  const dateLocale = lang === 'zh' ? zhCN : enUS;

  // Dynamic Achievements List based on language
  const achievementsList: Achievement[] = useMemo(() => [
    { id: 'first_log', title: t.ach_first_log_title, description: t.ach_first_log_desc, iconName: 'flag', condition: (e) => e.length >= 1 },
    { id: 'week_streak', title: t.ach_week_streak_title, description: t.ach_week_streak_desc, iconName: 'flame', condition: (e) => e.length >= 7 }, 
    { id: 'explorer', title: t.ach_explorer_title, description: t.ach_explorer_desc, iconName: 'compass', condition: (e) => {
        const uniqueTags = new Set(e.flatMap(x => x.tags));
        return uniqueTags.size >= 5;
    }},
    { id: 'marathon', title: t.ach_marathon_title, description: t.ach_marathon_desc, iconName: 'timer', condition: (e) => e.some(x => x.duration > 30) },
  ], [t]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = FirebaseService.observeAuth(async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        setDataLoading(true);
        // Initialize User Doc if not exists
        await FirebaseService.initUserDoc(currentUser.uid);
        
        // Subscribe to real-time data
        const unsubData = FirebaseService.subscribeToUserData(currentUser.uid, (data) => {
            if (data) {
                // If cloud data is empty but we have local data, consider syncing up (optional feature, here we prioritize cloud for "Login" experience)
                // For this implementation, we allow Cloud to be the source of truth
                setEntries(data.entries || []);
                setTags(data.tags || StorageService.getTags());
                setLibraryItems(data.library || []);
                setUnlockedAchievements(data.achievements || {});
                setAiAccess(data.aiAccess || { unlocked: false, attempts: 0 });
                setDataLoading(false);
            }
        });
        
        return () => unsubData();
      } else {
        // Clear data on logout
        setEntries([]);
      }
    });

    // Load Local Prefs (Language) independent of auth
    setLang(StorageService.getLanguage());

    return () => unsubscribe();
  }, []);

  const changeLanguage = (newLang: Language) => {
    StorageService.setLanguage(newLang);
    setLang(newLang);
  };

  const handleSignOut = () => {
    FirebaseService.signOut();
  };

  // Check achievements whenever entries change
  useEffect(() => {
    if (!user) return; // Only process if logged in

    const newUnlocked = { ...unlockedAchievements };
    let changed = false;

    achievementsList.forEach(ach => {
      if (!newUnlocked[ach.id] && ach.condition(entries)) {
        newUnlocked[ach.id] = Date.now();
        changed = true;
        
        // Vibrate on unlock (2 short pulses)
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
      }
    });

    if (changed) {
      setUnlockedAchievements(newUnlocked);
      // Sync to Firebase
      FirebaseService.updateUserField(user.uid, 'achievements', newUnlocked);
    }
  }, [entries, unlockedAchievements, achievementsList, user]);

  // --- CRUD WRAPPERS FOR FIREBASE ---

  const handleSaveEntry = (newEntryData: Omit<Entry, 'id'>) => {
    if (!user) return;

    const entry: Entry = {
      ...newEntryData,
      id: crypto.randomUUID(),
    };
    
    // Optimistic Update
    const updatedEntries = [...entries, entry];
    setEntries(updatedEntries);

    // Persist to Cloud
    FirebaseService.updateUserField(user.uid, 'entries', updatedEntries);
    
    // Trigger Success Animation
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };
  
  const handleDeleteEntry = (id: string) => {
    if (!user) return;

    if (window.confirm(t.delete_confirm)) {
        const updated = entries.filter(e => e.id !== id);
        // Optimistic Update
        setEntries(updated);
        // Persist to Cloud
        FirebaseService.updateUserField(user.uid, 'entries', updated);
        
        if (selectedDay) {
            const updatedDayEntries = updated.filter(e => isSameDay(new Date(e.timestamp), selectedDay.date));
            setSelectedDay({ date: selectedDay.date, entries: updatedDayEntries });
        }
    }
  };

  const handleAddTag = (tag: string) => {
    if (!user) return;
    if (!tags.includes(tag)) {
        const updated = [...tags, tag];
        setTags(updated);
        FirebaseService.updateUserField(user.uid, 'tags', updated);
    }
  }

  const handleUpdateLibrary = (newItems: ContentItem[]) => {
      if (!user) return;
      setLibraryItems(newItems);
      FirebaseService.updateUserField(user.uid, 'library', newItems);
  }

  // --- Helper to translate tags ---
  const getTranslatedTag = (tag: string) => {
    const key = `tag_${tag.replace(/\s+/g, '_')}` as keyof typeof t;
    return t[key] || tag;
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const now = new Date();
    const last30Days = entries.filter(e => differenceInDays(now, new Date(e.timestamp)) <= 30);
    const last90Days = entries.filter(e => differenceInDays(now, new Date(e.timestamp)) <= 90);
    
    const avgDuration = last30Days.reduce((acc, c) => acc + c.duration, 0) / (last30Days.length || 1);
    const avgIntensity = last30Days.reduce((acc, c) => acc + c.intensity, 0) / (last30Days.length || 1);
    const orgasmCount = last30Days.filter(e => e.orgasm === 'YES').length;
    const orgasmRate = (orgasmCount / (last30Days.length || 1)) * 100;

    const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
    let maxInterval = 0;
    for(let i=0; i<sorted.length-1; i++) {
        const diff = differenceInDays(new Date(sorted[i].timestamp), new Date(sorted[i+1].timestamp));
        if (diff > maxInterval) maxInterval = diff;
    }

    return {
      count30: last30Days.length,
      count90: last90Days.length,
      avgDuration: Math.round(avgDuration),
      avgIntensity: avgIntensity.toFixed(1),
      orgasmRate: Math.round(orgasmRate),
      maxInterval,
    };
  }, [entries]);

  // Calendar Month Stats
  const monthStats = useMemo(() => {
    const currentMonthEntries = entries.filter(e => isSameMonth(new Date(e.timestamp), currentDate));
    const totalSessions = currentMonthEntries.length;
    const totalDuration = currentMonthEntries.reduce((acc, c) => acc + c.duration, 0);
    const avgIntensity = totalSessions ? (currentMonthEntries.reduce((acc, c) => acc + c.intensity, 0) / totalSessions).toFixed(1) : '0';
    
    return {
        entries: currentMonthEntries.sort((a, b) => b.timestamp - a.timestamp),
        totalSessions,
        totalDuration,
        avgIntensity
    };
  }, [entries, currentDate]);

  // Chart Data
  const chartData = useMemo(() => {
      const data = [];
      for(let i=6; i>=0; i--) {
          const d = subDays(new Date(), i);
          const dayEntries = entries.filter(e => isSameDay(new Date(e.timestamp), d));
          const avgInt = dayEntries.length ? dayEntries.reduce((a,b)=>a+b.intensity,0)/dayEntries.length : 0;
          data.push({
              name: format(d, 'EEE', { locale: dateLocale }),
              intensity: avgInt,
              count: dayEntries.length
          });
      }
      return data;
  }, [entries, dateLocale]);


  const renderDashboard = () => (
    <div key="DASHBOARD" className="space-y-6 animate-slide-up">
      <header className="flex justify-between items-center mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 drop-shadow-md">
            {t.app_name}
          </h1>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleSignOut}
                className="p-3 rounded-full border bg-slate-900/40 border-slate-800/50 text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-all backdrop-blur-md"
                title="Sign Out"
            >
                <LogOut size={20} />
            </button>
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-3 rounded-full border bg-slate-900/40 border-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all backdrop-blur-md"
            >
                <Settings size={20} />
            </button>
        </div>
      </header>

      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-3xl border border-white/5 shadow-xl transition-transform hover:scale-[1.02]">
            <div className="flex items-center gap-2 text-violet-300 mb-2">
                <Activity size={16} />
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{t.frequency}</span>
            </div>
            <div className="text-3xl font-light text-white">
                {stats.count30} <span className="text-sm text-slate-500 font-normal">/30 {t.days}</span>
            </div>
        </div>
        <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-3xl border border-white/5 shadow-xl transition-transform hover:scale-[1.02]">
             <div className="flex items-center gap-2 text-fuchsia-300 mb-2">
                <Clock size={16} />
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{t.duration}</span>
            </div>
            <div className="text-3xl font-light text-white">
                {stats.avgDuration} <span className="text-sm text-slate-500 font-normal">{t.min_avg}</span>
            </div>
        </div>
      </div>

      {/* Recent Activity Chart */}
      <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden">
        
        <div className="flex justify-between items-center mb-6 relative z-10">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Flame size={14} className="text-orange-400" />
                {t.intensity_flow}
             </h3>
        </div>
        
        <div className="h-40 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} dy={10} />
                    <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                        contentStyle={{backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#f8fafc', padding: '8px 12px'}} 
                        itemStyle={{color: '#e2e8f0'}}
                        labelStyle={{color: '#94a3b8', marginBottom: '4px'}}
                    />
                    <Bar dataKey="intensity" radius={[4, 4, 4, 4]} barSize={16}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.intensity > 0 ? 'url(#colorIntensity)' : 'rgba(255,255,255,0.05)'} />
                        ))}
                    </Bar>
                    <defs>
                        <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c084fc" stopOpacity={1}/>
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={1}/>
                        </linearGradient>
                    </defs>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

       {/* Latest Entry */}
       <div className="relative overflow-hidden group rounded-3xl backdrop-blur-md shadow-lg transition-transform hover:scale-[1.01]">
         <div className="absolute inset-0 bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-white/10"></div>

         <div className="relative p-6">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t.last_session}</h3>
                {entries.length > 0 && <span className="text-xs font-medium px-2 py-1 rounded bg-white/5 text-slate-200 border border-white/10">{format(new Date(entries[entries.length-1].timestamp), 'MMM d', { locale: dateLocale })}</span>}
            </div>
            
            {entries.length > 0 ? (
                <div>
                    <div className="flex items-end gap-3 mb-2">
                        <span className="text-3xl font-medium text-white">{entries[entries.length-1].duration}</span>
                        <span className="text-sm text-slate-400 mb-1.5 font-medium">{t.minutes}</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-200">
                             <Zap size={12} className={entries[entries.length-1].intensity > 3 ? "text-amber-400" : "text-slate-500"} />
                             {entries[entries.length-1].intensity}/5 {t.intensity}
                        </div>
                        {entries[entries.length-1].orgasm === 'YES' && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30 text-xs text-fuchsia-200">
                                <Sparkles size={12} />
                                {t.climax}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-slate-500 text-sm py-4">{t.no_entries_dashboard}</div>
            )}
         </div>
       </div>
    </div>
  );

  const renderCalendar = () => (
    <div key="CALENDAR" className="space-y-6 h-full flex flex-col animate-slide-up">
       <header className="flex justify-between items-center mb-2 pt-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">{t.history_title}</h1>
        <div className="flex gap-2 items-center bg-slate-900/40 rounded-full p-1 border border-white/10 backdrop-blur-md">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors"><ChevronLeft size={16}/></button>
            <span className="text-sm font-semibold text-slate-200 min-w-[100px] text-center capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
            </span>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors"><ChevronRight size={16}/></button>
        </div>
      </header>

      {/* Monthly Highlights Row */}
      <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{animationDelay: '0.05s'}}>
          <div className="bg-slate-900/40 p-3 rounded-2xl border border-white/10 flex flex-col items-center justify-center backdrop-blur-md">
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1">{t.sessions}</span>
              <span className="text-xl font-light text-white">{monthStats.totalSessions}</span>
          </div>
          <div className="bg-slate-900/40 p-3 rounded-2xl border border-white/10 flex flex-col items-center justify-center backdrop-blur-md">
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1">{t.minutes}</span>
              <span className="text-xl font-light text-white">{monthStats.totalDuration}</span>
          </div>
           <div className="bg-slate-900/40 p-3 rounded-2xl border border-white/10 flex flex-col items-center justify-center backdrop-blur-md">
              <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1">{t.avg_int}</span>
              <div className="flex items-center gap-1">
                 <Zap size={12} className="text-amber-400" />
                 <span className="text-xl font-light text-white">{monthStats.avgIntensity}</span>
              </div>
          </div>
      </div>

      <div className="bg-slate-900/40 p-5 rounded-3xl border border-white/10 shadow-lg relative z-10 backdrop-blur-md">
        <Heatmap 
            entries={entries} 
            currentDate={currentDate} 
            onDayClick={(date, dayEntries) => setSelectedDay({date, entries: dayEntries})}
            daysHeader={t.heatmap_days}
        />
      </div>

      {/* Monthly Log List (Visible when no specific day selected) */}
      {!selectedDay && (
          <div className="flex-1 animate-slide-up space-y-4" style={{animationDelay: '0.1s'}}>
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 mt-2">
                 {format(currentDate, 'MMMM', { locale: dateLocale })} {t.log_suffix}
             </h3>
             {monthStats.entries.length === 0 ? (
                 <div className="text-center py-10 opacity-50">
                     <p className="text-slate-500 text-sm">No activity recorded this month.</p>
                 </div>
             ) : (
                 <div className="space-y-3 pb-20">
                     {monthStats.entries.map((entry) => (
                        <SwipeableEntry key={entry.id} onDelete={() => handleDeleteEntry(entry.id)}>
                             <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex items-center gap-4 group relative backdrop-blur-md transition-colors hover:bg-slate-900/60">
                                 <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white/5 text-slate-300 border border-white/10 shrink-0">
                                     <span className="text-[10px] font-bold uppercase">{format(new Date(entry.timestamp), 'MMM', { locale: dateLocale })}</span>
                                     <span className="text-lg font-bold text-white">{format(new Date(entry.timestamp), 'd')}</span>
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <div className="flex items-center gap-2 mb-1 pr-1">
                                         <div className="flex items-center gap-1 text-xs font-medium text-slate-200 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                             <Clock size={10} /> {entry.duration}m
                                         </div>
                                         <div className="flex items-center gap-1 text-xs font-medium text-slate-200 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                             <Zap size={10} className={entry.intensity > 3 ? "text-amber-400" : "text-slate-400"} /> {entry.intensity}
                                         </div>
                                         {entry.orgasm === 'YES' && <Sparkles size={12} className="text-fuchsia-400 ml-auto" />}
                                     </div>
                                     {entry.tags.length > 0 && (
                                         <div className="flex gap-1 overflow-hidden">
                                             {entry.tags.slice(0,3).map(t => <span key={t} className="text-[10px] text-slate-400 truncate">#{getTranslatedTag(t)}</span>)}
                                         </div>
                                     )}
                                 </div>
                             </div>
                        </SwipeableEntry>
                     ))}
                 </div>
             )}
          </div>
      )}

      {/* Selected Day Details Overlay */}
      {selectedDay && (
          <div className="flex-1 bg-slate-900/90 backdrop-blur-2xl rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/10 p-6 animate-slide-up fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto">
              <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-xl text-white capitalize">{format(selectedDay.date, 'EEEE', { locale: dateLocale })}</h3>
                    <p className="text-slate-400 text-sm">{format(selectedDay.date, 'MMMM d, yyyy', { locale: dateLocale })}</p>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className="p-2 bg-white/5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
                      <ChevronRight size={20} className="rotate-90" />
                  </button>
              </div>
              
              {selectedDay.entries.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No records for this day.</p>
              ) : (
                  <div className="space-y-4 max-h-[40vh] overflow-y-auto no-scrollbar">
                      {selectedDay.entries.map(entry => (
                          <div key={entry.id} className="relative pl-6 py-2 group">
                              {/* Timeline line */}
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-700 group-last:bottom-auto group-last:h-full"></div>
                              <div className="absolute left-[-4px] top-4 w-2.5 h-2.5 rounded-full bg-violet-500 ring-4 ring-slate-900"></div>
                              
                              <SwipeableEntry onDelete={() => handleDeleteEntry(entry.id)}>
                                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 relative group">
                                      {/* Header */}
                                      <div className="flex items-center justify-between mb-2">
                                          <div className="text-sm font-bold text-white">
                                            {format(new Date(entry.timestamp), 'h:mm a')}
                                          </div>
                                          {entry.orgasm === 'YES' && <Sparkles size={14} className="text-amber-400" />}
                                      </div>
                                      
                                      <div className="flex gap-4 text-xs text-slate-400 mb-3">
                                          <span className="flex items-center gap-1"><Clock size={12}/> {entry.duration}m</span>
                                          <span className="flex items-center gap-1"><Zap size={12}/> {entry.intensity}/5</span>
                                      </div>
                                      
                                      {entry.tags.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5 mb-2">
                                              {entry.tags.slice(0, 4).map(t => (
                                                  <span key={t} className="text-[10px] font-medium bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-slate-700">{getTranslatedTag(t)}</span>
                                              ))}
                                          </div>
                                      )}

                                      {entry.contentUsed && (entry.contentUsed.url || entry.contentUsed.actor) && (
                                          <div className="mt-2 text-xs bg-black/30 p-2 rounded-lg border border-white/5 text-slate-400 flex flex-col gap-1">
                                              {entry.contentUsed.actor && <span className="font-medium text-slate-300">Feat. {entry.contentUsed.actor}</span>}
                                              {entry.contentUsed.url && <a href={entry.contentUsed.url} target="_blank" rel="noreferrer" className="text-violet-400 underline truncate">{entry.contentUsed.url}</a>}
                                          </div>
                                      )}

                                      {entry.note && (
                                          <p className="text-sm text-slate-400 mt-2 pl-2 border-l-2 border-slate-600 italic">"{entry.note}"</p>
                                      )}
                                  </div>
                              </SwipeableEntry>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* Renders other views based on 'view' state */}
      {view === 'LIBRARY' && <Library items={libraryItems} onUpdate={handleUpdateLibrary} lang={lang} dateLocale={dateLocale} />}
      {view === 'STATS' && <DeepInsights entries={entries} lang={lang} />}
      {view === 'ACHIEVEMENTS' && renderAchievements()}

    </div>
  );

  const renderAchievements = () => (
      <div key="ACHIEVEMENTS" className="space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-6 pt-4">{t.milestones}</h1>
        <div className="grid grid-cols-1 gap-4">
            {achievementsList.map(ach => {
                const isUnlocked = !!unlockedAchievements[ach.id];
                return (
                    <div key={ach.id} className={`p-5 rounded-2xl border flex items-center gap-5 transition-all relative overflow-hidden group backdrop-blur-md ${isUnlocked ? 'bg-slate-900/60 border-violet-900/50 shadow-lg shadow-violet-900/10' : 'bg-slate-900/30 border-slate-800/50 opacity-50'}`}>
                        {isUnlocked && <div className="absolute inset-0 bg-gradient-to-r from-violet-900/10 to-transparent pointer-events-none"></div>}
                        
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border transition-colors ${isUnlocked ? 'bg-violet-950 text-violet-300 border-violet-800 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>
                            <Award size={24} />
                        </div>
                        <div className="relative z-10">
                            <h3 className={`font-bold text-lg ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>{ach.title}</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">{ach.description}</p>
                            {isUnlocked && (
                                <p className="text-[10px] text-violet-400 mt-2 uppercase font-bold tracking-wider flex items-center gap-1">
                                    {t.unlocked} {format(new Date(unlockedAchievements[ach.id]), 'MMM d', { locale: dateLocale })}
                                </p>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
      </div>
  )

  // --- Auth & Loading States ---

  if (authLoading) {
      return (
          <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-950">
              <Loader2 size={48} className="text-violet-500 animate-spin" />
          </div>
      );
  }

  if (!user) {
      return <AuthPage />;
  }

  return (
    <div className="h-[100dvh] w-full flex justify-center bg-slate-950 relative overflow-hidden">
        {/* Global Background Orbs - Enhanced Colors */}
        <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-violet-600/40 rounded-full blur-[120px] animate-blob mix-blend-screen pointer-events-none"></div>
        <div className="absolute top-[10%] right-[-20%] w-[60%] h-[60%] bg-fuchsia-600/30 rounded-full blur-[120px] animate-blob animation-delay-2000 mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-[-20%] left-[10%] w-[70%] h-[70%] bg-cyan-600/30 rounded-full blur-[120px] animate-blob animation-delay-4000 mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-amber-600/20 rounded-full blur-[100px] animate-blob animation-delay-3000 mix-blend-screen pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-950/20 backdrop-blur-2xl relative overflow-hidden flex flex-col shadow-2xl h-full border-x border-white/10">
        
        {/* Loading Overlay for Data Fetching */}
        {dataLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
                <Loader2 size={40} className="text-violet-500 animate-spin mb-4" />
                <p className="text-slate-400 text-sm font-medium">Syncing data...</p>
            </div>
        )}

        {/* Success Overlay Animation */}
        {showSuccess && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300 pointer-events-none">
                <div className="p-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-[0_0_50px_rgba(168,85,247,0.5)] animate-in zoom-in-50 duration-500">
                    <CheckCircle2 size={64} className="text-white" strokeWidth={3} />
                </div>
                <h2 className="mt-8 text-2xl font-bold text-white tracking-tight animate-in slide-in-from-bottom-4 duration-500">{t.recorded}</h2>
                <p className="text-slate-400 mt-2 font-medium">Saved to cloud</p>
            </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-6 pb-24 relative z-10">
            {view === 'DASHBOARD' && renderDashboard()}
            {view === 'CALENDAR' && renderCalendar()}
            {view === 'LIBRARY' && <Library items={libraryItems} onUpdate={handleUpdateLibrary} lang={lang} dateLocale={dateLocale} />}
            {view === 'STATS' && <DeepInsights entries={entries} lang={lang} />}
            {view === 'ACHIEVEMENTS' && renderAchievements()}
        </main>

        {/* Floating Action Button - ONLY VISIBLE IN DASHBOARD */}
        {view === 'DASHBOARD' && (
            <div className="absolute bottom-24 right-6 z-30">
                <button 
                onClick={() => setIsLogModalOpen(true)}
                className="w-16 h-16 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full shadow-[0_4px_20px_rgba(124,58,237,0.4)] flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all border border-violet-400/30 group"
                >
                <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>
        )}

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 bg-slate-950/60 backdrop-blur-xl border-t border-white/10 px-6 py-4 z-20 grid grid-cols-5 items-center text-xs font-medium">
            <button 
                onClick={() => { setView('DASHBOARD'); setSelectedDay(null); }}
                className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${view === 'DASHBOARD' ? 'text-white scale-105' : 'text-slate-500 hover:text-slate-400'}`}
            >
            <History size={20} strokeWidth={view === 'DASHBOARD' ? 2.5 : 2} className={view === 'DASHBOARD' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}/>
            <span className={view === 'DASHBOARD' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}>{t.nav_today}</span>
            </button>
            <button 
                onClick={() => { setView('CALENDAR'); setSelectedDay(null); }}
                className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${view === 'CALENDAR' ? 'text-white scale-105' : 'text-slate-500 hover:text-slate-400'}`}
            >
            <CalendarIcon size={20} strokeWidth={view === 'CALENDAR' ? 2.5 : 2} className={view === 'CALENDAR' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}/>
            <span className={view === 'CALENDAR' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}>{t.nav_history}</span>
            </button>
            <button 
                onClick={() => { setView('LIBRARY'); setSelectedDay(null); }}
                className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${view === 'LIBRARY' ? 'text-white scale-105' : 'text-slate-500 hover:text-slate-400'}`}
            >
            <LibraryIcon size={20} strokeWidth={view === 'LIBRARY' ? 2.5 : 2} className={view === 'LIBRARY' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}/>
            <span className={view === 'LIBRARY' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}>{t.nav_lib}</span>
            </button>
            <button 
                onClick={() => { setView('STATS'); setSelectedDay(null); }}
                className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${view === 'STATS' ? 'text-white scale-105' : 'text-slate-500 hover:text-slate-400'}`}
            >
            <BarChart2 size={20} strokeWidth={view === 'STATS' ? 2.5 : 2} className={view === 'STATS' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}/>
            <span className={view === 'STATS' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}>{t.nav_insights}</span>
            </button>
            <button 
                onClick={() => { setView('ACHIEVEMENTS'); setSelectedDay(null); }}
                className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${view === 'ACHIEVEMENTS' ? 'text-white scale-105' : 'text-slate-500 hover:text-slate-400'}`}
            >
            <Award size={20} strokeWidth={view === 'ACHIEVEMENTS' ? 2.5 : 2} className={view === 'ACHIEVEMENTS' ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}/>
            <span className={view === 'ACHIEVEMENTS' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}>{t.nav_awards}</span>
            </button>
        </nav>

        {/* Modals */}
        <LogModal 
            isOpen={isLogModalOpen} 
            onClose={() => setIsLogModalOpen(false)}
            onSave={handleSaveEntry}
            allTags={tags}
            onAddTag={handleAddTag}
            lang={lang}
        />
        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            onDataChange={() => {}} // Local restore not needed in cloud mode
            currentLang={lang}
            onLangChange={changeLanguage}
        />
        <AiLockModal 
            isOpen={false} // Currently disabled/hidden as logic moved to legacy or not used
            onClose={() => {}} 
            onSuccess={() => {}}
            accessState={aiAccess}
            onUpdateState={(newState) => {
                setAiAccess(newState);
                if(user) FirebaseService.updateUserField(user.uid, 'aiAccess', newState);
            }}
            lang={lang}
        />
        </div>
    </div>
  );
}