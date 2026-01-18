import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StorageService } from './services/storageService';
import { FirebaseService, auth } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Entry, ViewState, Achievement, ContentItem, Language } from './services/types';
import { Heatmap } from './components/Heatmap';
import { LogModal } from './components/LogModal';
import { SettingsModal } from './components/SettingsModal';
import { Library, LibraryRef } from './components/Library';
import { SwipeableEntry } from './components/SwipeableEntry';
import { AiLockModal } from './components/AiLockModal';
import { DeepInsights } from './components/DeepInsights';
import { Login } from './components/Login'; // Import Login
import { translations } from './utils/translations';
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
  LogOut
} from 'lucide-react';
import { format, differenceInDays, isSameDay, addMonths, isSameMonth } from 'date-fns';
import zhCN from 'date-fns/locale/zh-CN';
import enUS from 'date-fns/locale/en-US';
import subDays from 'date-fns/subDays';
import subMonths from 'date-fns/subMonths';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // App State
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
  const [achievementToast, setAchievementToast] = useState<{title: string, desc: string} | null>(null);
  
  // Animation States
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [selectedDay, setSelectedDay] = useState<{date: Date, entries: Entry[]} | null>(null);

  const libraryRef = useRef<LibraryRef>(null);

  const t = translations[lang];
  const dateLocale = lang === 'zh' ? zhCN : enUS;

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // User logged in: Sync local data first
        await FirebaseService.syncLocalDataToCloud(currentUser);
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Loading Logic (Realtime from Firebase or LocalStorage if not implemented fully yet, 
  // but here we use Firebase realtime listener when logged in)
  useEffect(() => {
    if (!user) return;

    const unsubscribeData = FirebaseService.subscribeToUserData(user.uid, (data) => {
      if (data) {
        if (data.entries) setEntries(data.entries);
        if (data.tags) setTags(data.tags);
        if (data.library) setLibraryItems(data.library);
        if (data.achievements) setUnlockedAchievements(data.achievements);
        if (data.language) setLang(data.language);
        if (data.aiAccess) setAiAccess(data.aiAccess);
        
        // Update StorageService language purely for initial load fallback
        StorageService.setLanguage(data.language || 'en');
      }
    });

    return () => unsubscribeData();
  }, [user]);

  // Save changes wrapper (Writes to Firebase if logged in)
  const saveDataToCloud = async (key: string, data: any) => {
    if (user) {
      await FirebaseService.updateUserData(user.uid, { [key]: data });
    }
  };

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

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    saveDataToCloud('language', newLang);
  };

  // Check achievements logic
  useEffect(() => {
    if (!user) return; // Only process if user loaded
    
    const newUnlocked = { ...unlockedAchievements };
    let changed = false;
    let latestAchievement: Achievement | null = null;

    achievementsList.forEach(ach => {
      if (!newUnlocked[ach.id] && ach.condition(entries)) {
        newUnlocked[ach.id] = Date.now();
        changed = true;
        latestAchievement = ach;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
      }
    });

    if (changed) {
      setUnlockedAchievements(newUnlocked);
      saveDataToCloud('achievements', newUnlocked);
      
      if (latestAchievement) {
          setAchievementToast({
              title: (latestAchievement as Achievement).title,
              desc: (latestAchievement as Achievement).description
          });
          setTimeout(() => setAchievementToast(null), 4000);
      }
    }
  }, [entries, unlockedAchievements, achievementsList, user]);

  // Handlers
  const handleSaveEntry = (newEntryData: Omit<Entry, 'id'>) => {
    const entry: Entry = { ...newEntryData, id: crypto.randomUUID() };
    const newEntries = [...entries, entry];
    setEntries(newEntries); // Optimistic update
    saveDataToCloud('entries', newEntries);
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };
  
  const handleDeleteEntry = (id: string) => {
    if (window.confirm(t.delete_confirm)) {
        const newEntries = entries.filter(e => e.id !== id);
        setEntries(newEntries);
        saveDataToCloud('entries', newEntries);
        
        if (selectedDay) {
            const updatedDayEntries = newEntries.filter(e => isSameDay(new Date(e.timestamp), selectedDay.date));
            setSelectedDay({ date: selectedDay.date, entries: updatedDayEntries });
        }
    }
  };

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
        const newTags = [...tags, tag];
        setTags(newTags);
        saveDataToCloud('tags', newTags);
    }
  }

  // Library Handlers (passed to component)
  const handleUpdateLibrary = (newItems: ContentItem[]) => {
      setLibraryItems(newItems);
      saveDataToCloud('library', newItems);
  }
  
  const handleCentralButtonClick = () => {
      if (view === 'LIBRARY') {
          libraryRef.current?.openAddModal();
      } else {
          setIsLogModalOpen(true);
      }
  };

  const handleLogout = async () => {
      if(window.confirm("Are you sure you want to log out?")) {
          await FirebaseService.signOut();
          setView('DASHBOARD');
      }
  }

  // Helper to translate tags
  const getTranslatedTag = (tag: string) => {
    const key = `tag_${tag.replace(/\s+/g, '_')}` as keyof typeof t;
    return (t as any)[key] || tag;
  };

  // Stats Calculations
  const dashboardStats = useMemo(() => {
    const now = new Date();
    const last30Days = entries.filter(e => differenceInDays(now, new Date(e.timestamp)) <= 30);
    const avgDuration = last30Days.reduce((acc, c) => acc + c.duration, 0) / (last30Days.length || 1);
    return {
      count30: last30Days.length,
      avgDuration: Math.round(avgDuration),
    };
  }, [entries]);

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

  // Loading State
  if (loadingAuth) {
      return (
          <div className="h-screen w-full bg-[#020617] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
          </div>
      )
  }

  // Not Logged In
  if (!user) {
      return <Login />;
  }

  // --- RENDER DASHBOARD ---
  const renderDashboard = () => (
    <div key="DASHBOARD" className="space-y-6 animate-slide-up">
      <header className="flex justify-between items-center mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            {t.app_name}
          </h1>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleLogout}
                className="p-3 rounded-full border bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white transition-all backdrop-blur-md"
            >
                <LogOut size={20} />
            </button>
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-3 rounded-full border bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white transition-all backdrop-blur-md"
            >
                <Settings size={20} />
            </button>
        </div>
      </header>

      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-3xl border border-slate-800 shadow-xl">
            <div className="flex items-center gap-2 text-violet-400 mb-2">
                <Activity size={16} />
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{t.frequency}</span>
            </div>
            <div className="text-3xl font-light text-white">
                {dashboardStats.count30} <span className="text-sm text-slate-500 font-normal">/30 {t.days}</span>
            </div>
        </div>
        <div className="bg-slate-900/50 backdrop-blur-md p-5 rounded-3xl border border-slate-800 shadow-xl">
             <div className="flex items-center gap-2 text-fuchsia-400 mb-2">
                <Clock size={16} />
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{t.duration}</span>
            </div>
            <div className="text-3xl font-light text-white">
                {dashboardStats.avgDuration} <span className="text-sm text-slate-500 font-normal">{t.min_avg}</span>
            </div>
        </div>
      </div>

      {/* Recent Activity Chart */}
      <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-sm relative overflow-hidden">
        
        <div className="flex justify-between items-center mb-6 relative z-10">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Flame size={14} className="text-orange-400" />
                {t.intensity_flow}
             </h3>
        </div>
        
        <div className="h-40 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 600}} dy={10} />
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
       <div className="relative overflow-hidden group rounded-3xl backdrop-blur-md transition-transform hover:scale-[1.01]">
         <div className="absolute inset-0 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50"></div>
         <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full"></div>

         <div className="relative p-6">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t.last_session}</h3>
                {entries.length > 0 && <span className="text-xs font-medium px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">{format(new Date(entries[entries.length-1].timestamp), 'MMM d', { locale: dateLocale })}</span>}
            </div>
            
            {entries.length > 0 ? (
                <div>
                    <div className="flex items-end gap-3 mb-2">
                        <span className="text-3xl font-medium text-white">{entries[entries.length-1].duration}</span>
                        <span className="text-sm text-slate-400 mb-1.5 font-medium">{t.minutes}</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                             <Zap size={12} className={entries[entries.length-1].intensity > 3 ? "text-amber-400" : "text-slate-500"} />
                             {entries[entries.length-1].intensity}/5 {t.intensity}
                        </div>
                        {entries[entries.length-1].orgasm === 'YES' && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fuchsia-950/40 border border-fuchsia-900 text-xs text-fuchsia-300">
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
        <div className="flex gap-2 items-center bg-slate-900/50 rounded-full p-1 border border-slate-800 backdrop-blur-md">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><ChevronLeft size={16}/></button>
            <span className="text-sm font-semibold text-slate-200 min-w-[100px] text-center capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
            </span>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><ChevronRight size={16}/></button>
        </div>
      </header>
      
      {/* Monthly Highlights Row */}
      <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-800 flex flex-col items-center justify-center backdrop-blur-md">
              <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">{t.sessions}</span>
              <span className="text-xl font-light text-white">{monthStats.totalSessions}</span>
          </div>
          <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-800 flex flex-col items-center justify-center backdrop-blur-md">
              <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">{t.minutes}</span>
              <span className="text-xl font-light text-white">{monthStats.totalDuration}</span>
          </div>
           <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-800 flex flex-col items-center justify-center backdrop-blur-md">
              <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">{t.avg_int}</span>
              <div className="flex items-center gap-1">
                 <Zap size={12} className="text-amber-400" />
                 <span className="text-xl font-light text-white">{monthStats.avgIntensity}</span>
              </div>
          </div>
      </div>

      <div className="bg-slate-900/50 p-5 rounded-3xl border border-slate-800 shadow-lg relative z-10 backdrop-blur-md">
        <Heatmap 
            entries={entries} 
            currentDate={currentDate} 
            onDayClick={(date, dayEntries) => setSelectedDay({date, entries: dayEntries})}
            daysHeader={t.heatmap_days}
        />
      </div>

      {/* Monthly Log List */}
      {!selectedDay && (
          <div className="flex-1 space-y-4">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 mt-2">
                 {format(currentDate, 'MMMM', { locale: dateLocale })} {t.log_suffix}
             </h3>
             {monthStats.entries.length === 0 ? (
                 <div className="text-center py-10 opacity-50">
                     <p className="text-slate-500 text-sm">{t.no_activity_month}</p>
                 </div>
             ) : (
                 <div className="space-y-3 pb-20">
                     {monthStats.entries.map((entry) => (
                        <SwipeableEntry key={entry.id} onDelete={() => handleDeleteEntry(entry.id)}>
                             <div className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl flex items-center gap-4 group relative backdrop-blur-md hover:bg-slate-800/60 transition-colors">
                                 <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                                     <span className="text-[10px] font-bold uppercase">{format(new Date(entry.timestamp), 'MMM', { locale: dateLocale })}</span>
                                     <span className="text-lg font-bold text-white">{format(new Date(entry.timestamp), 'd')}</span>
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <div className="flex items-center gap-2 mb-1 pr-1">
                                         <div className="flex items-center gap-1 text-xs font-medium text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
                                             <Clock size={10} /> {entry.duration}m
                                         </div>
                                         <div className="flex items-center gap-1 text-xs font-medium text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
                                             <Zap size={10} className={entry.intensity > 3 ? "text-amber-400" : "text-slate-400"} /> {entry.intensity}
                                         </div>
                                         {entry.orgasm === 'YES' && <Sparkles size={12} className="text-fuchsia-400 ml-auto" />}
                                     </div>
                                     {entry.tags.length > 0 && (
                                         <div className="flex gap-1 overflow-hidden">
                                             {entry.tags.slice(0,3).map(t => <span key={t} className="text-[10px] text-slate-500 truncate">#{getTranslatedTag(t)}</span>)}
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
          <div className="flex-1 bg-slate-900/90 backdrop-blur-xl rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-slate-800 p-6 animate-slide-up fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto">
              <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-xl text-white capitalize">{format(selectedDay.date, 'EEEE', { locale: dateLocale })}</h3>
                    <p className="text-slate-500 text-sm">{format(selectedDay.date, 'MMMM d, yyyy', { locale: dateLocale })}</p>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                      <ChevronRight size={20} className="rotate-90" />
                  </button>
              </div>
              
              {selectedDay.entries.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No records for this day.</p>
              ) : (
                  <div className="space-y-4 max-h-[40vh] overflow-y-auto no-scrollbar">
                      {selectedDay.entries.map(entry => (
                          <div key={entry.id} className="relative pl-6 py-2 group">
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-800 group-last:bottom-auto group-last:h-full"></div>
                              <div className="absolute left-[-4px] top-4 w-2.5 h-2.5 rounded-full bg-violet-500 ring-4 ring-slate-900"></div>
                              
                              <SwipeableEntry onDelete={() => handleDeleteEntry(entry.id)}>
                                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 relative group">
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
                                          <div className="mt-2 text-xs bg-slate-950 p-2 rounded-lg border border-slate-800/50 text-slate-400 flex flex-col gap-1">
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

      {view === 'LIBRARY' && <Library ref={libraryRef} items={libraryItems} onUpdate={handleUpdateLibrary} lang={lang} dateLocale={dateLocale} />}
      {view === 'STATS' && <DeepInsights entries={entries} lang={lang} />}
    </div>
  );

  return (
    <div className="h-[100dvh] w-full flex justify-center bg-black">
        {/* Global Background Orbs - Always enabled */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-violet-600/20 rounded-full blur-[100px] animate-blob mix-blend-screen"></div>
            <div className="absolute top-[40%] right-[-10%] w-[40vw] h-[40vw] bg-fuchsia-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-screen"></div>
            <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] bg-cyan-600/20 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-screen"></div>
        </div>

        <div className="w-full max-w-md bg-slate-950/90 relative flex flex-col shadow-2xl h-full z-10 backdrop-blur-sm">
        
        {/* Toast Notification for Achievements */}
        {achievementToast && (
            <div className="absolute top-4 left-0 right-0 z-[70] flex justify-center px-4 animate-in slide-in-from-top-4 duration-500 fade-in pointer-events-none">
                <div className="bg-slate-900/90 backdrop-blur-md border border-violet-500/30 rounded-2xl p-4 shadow-2xl shadow-violet-900/20 flex items-center gap-4 max-w-sm w-full">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-lg">
                        <Award size={24} className="text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">{t.unlocked}</p>
                        <h3 className="text-white font-bold">{achievementToast.title}</h3>
                        <p className="text-xs text-slate-400">{achievementToast.desc}</p>
                    </div>
                </div>
            </div>
        )}

        {/* Success Overlay Animation */}
        {showSuccess && (
            <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300 pointer-events-none">
                <div className="p-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-[0_0_50px_rgba(168,85,247,0.5)] animate-in zoom-in-50 duration-500">
                    <CheckCircle2 size={64} className="text-white" strokeWidth={3} />
                </div>
                <h2 className="mt-8 text-2xl font-bold text-white tracking-tight animate-in slide-in-from-bottom-4 duration-500">{t.recorded}</h2>
                <p className="text-slate-400 mt-2 font-medium">{t.saved_locally}</p>
            </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-6 pb-24 relative z-10">
            {view === 'DASHBOARD' && renderDashboard()}
            {view === 'CALENDAR' && renderCalendar()}
            {view === 'LIBRARY' && <Library ref={libraryRef} items={libraryItems} onUpdate={handleUpdateLibrary} lang={lang} dateLocale={dateLocale} />}
            {view === 'STATS' && <DeepInsights entries={entries} lang={lang} />}
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent px-2 py-1 z-50 h-24 flex items-end pb-2">
            <div className="grid grid-cols-5 items-center w-full relative">
                <button 
                    onClick={() => { setView('DASHBOARD'); setSelectedDay(null); }}
                    className={`flex flex-col items-center gap-1 py-2 transition-all duration-300 rounded-xl ${view === 'DASHBOARD' ? 'text-violet-400' : 'text-slate-600 hover:text-slate-400'}`}
                >
                    <History size={20} strokeWidth={view === 'DASHBOARD' ? 2.5 : 2} className={view === 'DASHBOARD' ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : ''}/>
                    <span className={view === 'DASHBOARD' ? 'opacity-100 font-bold text-[10px]' : 'opacity-70 text-[10px]'}>{t.nav_today}</span>
                </button>
                
                <button 
                    onClick={() => { setView('CALENDAR'); setSelectedDay(null); }}
                    className={`flex flex-col items-center gap-1 py-2 transition-all duration-300 rounded-xl ${view === 'CALENDAR' ? 'text-violet-400' : 'text-slate-600 hover:text-slate-400'}`}
                >
                    <CalendarIcon size={20} strokeWidth={view === 'CALENDAR' ? 2.5 : 2} className={view === 'CALENDAR' ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : ''}/>
                    <span className={view === 'CALENDAR' ? 'opacity-100 font-bold text-[10px]' : 'opacity-70 text-[10px]'}>{t.nav_history}</span>
                </button>
                
                <div className="relative -top-8 flex justify-center">
                    <button
                        onClick={handleCentralButtonClick}
                        className="w-14 h-14 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full shadow-[0_4px_20px_rgba(124,58,237,0.5)] flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all border border-violet-400/30 group z-50"
                    >
                         <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                <button 
                    onClick={() => { setView('STATS'); setSelectedDay(null); }}
                    className={`flex flex-col items-center gap-1 py-2 transition-all duration-300 rounded-xl ${view === 'STATS' ? 'text-violet-400' : 'text-slate-600 hover:text-slate-400'}`}
                >
                    <BarChart2 size={20} strokeWidth={view === 'STATS' ? 2.5 : 2} className={view === 'STATS' ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : ''}/>
                    <span className={view === 'STATS' ? 'opacity-100 font-bold text-[10px]' : 'opacity-70 text-[10px]'}>{t.nav_insights}</span>
                </button>
            
                <button 
                    onClick={() => { setView('LIBRARY'); setSelectedDay(null); }}
                    className={`flex flex-col items-center gap-1 py-2 transition-all duration-300 rounded-xl ${view === 'LIBRARY' ? 'text-violet-400' : 'text-slate-600 hover:text-slate-400'}`}
                >
                    <LibraryIcon size={20} strokeWidth={view === 'LIBRARY' ? 2.5 : 2} className={view === 'LIBRARY' ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : ''}/>
                    <span className={view === 'LIBRARY' ? 'opacity-100 font-bold text-[10px]' : 'opacity-70 text-[10px]'}>{t.nav_lib}</span>
                </button>
            </div>
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
            onDataChange={() => {}} // LocalStorage updates handled via Firebase now for logged in users
            currentLang={lang}
            onLangChange={changeLanguage}
            achievementsList={achievementsList}
            unlockedAchievements={unlockedAchievements}
            dateLocale={dateLocale}
        />
        <AiLockModal 
            isOpen={false} 
            onClose={() => {}} 
            onSuccess={() => {}}
            accessState={aiAccess}
            onUpdateState={setAiAccess}
            lang={lang}
        />
        </div>
    </div>
  );
}