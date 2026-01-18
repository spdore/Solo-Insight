import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Loader2,
  AlertTriangle
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
  const [syncError, setSyncError] = useState<string | null>(null);

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

  // Unsubscribe ref to handle cleanup correctly
  const unsubscribeDataRef = useRef<(() => void) | null>(null);

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
    const unsubscribeAuth = FirebaseService.observeAuth(async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setSyncError(null);
      
      // Cleanup previous data listener if exists
      if (unsubscribeDataRef.current) {
          unsubscribeDataRef.current();
          unsubscribeDataRef.current = null;
      }

      if (currentUser) {
        // OPTIMIZATION: Check if we have synced this user on this device before.
        // If yes, we skip the blocking loader to prevent "hanging" feeling.
        const hasSyncedBefore = localStorage.getItem(`si_synced_${currentUser.uid}`) === 'true';
        
        if (!hasSyncedBefore) {
            setDataLoading(true);
        }
        
        // Directly subscribe without awaiting initialization.
        // Initialize only if the listener returns null (document missing).
        try {
            unsubscribeDataRef.current = FirebaseService.subscribeToUserData(
                currentUser.uid, 
                async (data) => {
                    if (data) {
                        // Success: Data exists
                        setEntries(data.entries || []);
                        setTags(data.tags || StorageService.getTags());
                        setLibraryItems(data.library || []);
                        setUnlockedAchievements(data.achievements || {});
                        setAiAccess(data.aiAccess || { unlocked: false, attempts: 0 });
                        
                        setDataLoading(false);
                        localStorage.setItem(`si_synced_${currentUser.uid}`, 'true');
                    } else {
                        // Data is null: Document doesn't exist yet (First ever login or data wiped)
                        // Trigger initialization now
                        console.log("No user data found, initializing...");
                        // Ensure loader is showing for this operation
                        setDataLoading(true); 
                        try {
                            await FirebaseService.initUserDoc(currentUser.uid);
                            // initUserDoc success will trigger this listener again with data
                        } catch (err) {
                            console.error("Init failed:", err);
                            setSyncError("Failed to create user profile.");
                            setDataLoading(false);
                        }
                    }
                },
                (error) => {
                    console.error("Sync Error:", error);
                    setSyncError("Sync failed. Check connection.");
                    setDataLoading(false);
                }
            );
        } catch (err) {
            console.error("Subscription setup failed:", err);
            setDataLoading(false);
        }
        
      } else {
        // Clear data on logout
        setEntries([]);
        setDataLoading(false);
      }
    });

    // Load Local Prefs (Language) independent of auth
    setLang(StorageService.getLanguage());

    return () => {
        unsubscribeAuth();
        if (unsubscribeDataRef.current) unsubscribeDataRef.current();
    };
  }, []);

  const changeLanguage = (newLang: Language) => {
    StorageService.setLanguage(newLang);
    setLang(newLang);
  };

  const handleSignOut = () => {
    if (user) {
        // Optional: clear local sync flag on manual sign out if you want to force sync screen next time
        // localStorage.removeItem(`si_synced_${user.uid}`);
    }
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
                onClick={() => setView('ACHIEVEMENTS')}
                className="p-3 rounded-full border bg-slate-900/40 border-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all backdrop-blur-md"
                title="Achievements"
            >
                <Award size={20} />
            </button>
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-3 rounded-full border bg-slate-900/40 border-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all backdrop-blur-md"
            >
                <Settings size={20} />
            </button>
        </div>
      </header>

      {/* Sync Error Alert */}
      {syncError && (
          <div className="bg-red-950/30 border border-red-900/50 p-4 rounded-2xl flex items-center gap-3 backdrop-blur-md mb-4">
              <AlertTriangle className="text-red-400 shrink-0" size={20} />
              <p className="text-xs text-red-200">{syncError}</p>
          </div>
      )}

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
    </div>
  );

  const renderAchievements = () => (
    <div className="space-y-6 animate-slide-up pb-24">
      <header className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            {t.nav_awards}
            <span className="text-xs font-normal text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                {Object.keys(unlockedAchievements).length}/{achievementsList.length}
            </span>
        </h1>
      </header>

      <div className="grid gap-3">
        {achievementsList.map(ach => {
           const isUnlocked = !!unlockedAchievements[ach.id];
           return (
             <div key={ach.id} className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${isUnlocked ? 'bg-indigo-900/20 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-slate-900/40 border-slate-800 opacity-50 grayscale'}`}>
                <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-xl shadow-inner ${isUnlocked ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-orange-900/20' : 'bg-slate-800 text-slate-600'}`}>
                    <Award size={24} />
                </div>
                <div>
                   <h3 className={`font-bold text-sm ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>{ach.title}</h3>
                   <p className="text-xs text-slate-500 mt-0.5 leading-snug">{ach.description}</p>
                   {isUnlocked && <p className="text-[10px] text-indigo-400 mt-1.5 font-medium flex items-center gap-1"><CheckCircle2 size={10}/> {t.unlocked} {format(unlockedAchievements[ach.id], 'MMM d', { locale: dateLocale })}</p>}
                </div>
             </div>
           );
        })}
      </div>
    </div>
  );

  if (authLoading) return <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-violet-500"><Loader2 size={32} className="animate-spin" /></div>;
  if (!user) return <AuthPage />;

  return (
    <div className="bg-slate-950 min-h-[100dvh] text-slate-200 font-sans selection:bg-violet-500/30 pb-24">
       {/* Background Effects */}
       <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-900/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-900/10 rounded-full blur-[100px]"></div>
       </div>

       <div className="relative z-10 container mx-auto max-w-md p-4 min-h-full">
          {view === 'DASHBOARD' && renderDashboard()}
          {view === 'CALENDAR' && renderCalendar()}
          {view === 'LIBRARY' && <Library items={libraryItems} onUpdate={handleUpdateLibrary} lang={lang} dateLocale={dateLocale} />}
          {view === 'STATS' && <DeepInsights entries={entries} lang={lang} />}
          {view === 'ACHIEVEMENTS' && renderAchievements()}
       </div>

       {/* Bottom Navigation */}
       <nav className="fixed bottom-0 left-0 right-0 bg-[#0B0F19]/90 backdrop-blur-xl border-t border-slate-800/50 pb-safe pt-2 px-4 flex justify-around items-center z-40 h-20 max-w-md mx-auto">
          <button onClick={() => setView('DASHBOARD')} className={`flex flex-col items-center p-2 transition-colors ${view === 'DASHBOARD' ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Activity size={20} />
            <span className="text-[9px] font-bold uppercase mt-1">{t.nav_today}</span>
          </button>
          
          <button onClick={() => setView('CALENDAR')} className={`flex flex-col items-center p-2 transition-colors ${view === 'CALENDAR' ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <CalendarIcon size={20} />
            <span className="text-[9px] font-bold uppercase mt-1">{t.nav_history}</span>
          </button>

          <button 
              onClick={() => setIsLogModalOpen(true)}
              className="mb-8 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)] border border-white/10 hover:scale-105 transition-transform active:scale-95"
          >
              <Plus size={28} />
          </button>

           <button onClick={() => setView('STATS')} className={`flex flex-col items-center p-2 transition-colors ${view === 'STATS' ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <BarChart2 size={20} />
            <span className="text-[9px] font-bold uppercase mt-1">{t.nav_insights}</span>
          </button>

           <button onClick={() => setView('LIBRARY')} className={`flex flex-col items-center p-2 transition-colors ${view === 'LIBRARY' ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <LibraryIcon size={20} />
            <span className="text-[9px] font-bold uppercase mt-1">{t.nav_lib}</span>
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
          onDataChange={() => {
              setEntries(StorageService.getEntries());
              setTags(StorageService.getTags());
              setUnlockedAchievements(StorageService.getUnlockedAchievements());
              // Force reload
              window.location.reload();
          }}
          currentLang={lang}
          onLangChange={changeLanguage}
       />

    </div>
  );
}