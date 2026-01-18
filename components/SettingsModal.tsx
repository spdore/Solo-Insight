import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Trash2, Upload, Award, ChevronRight, ArrowLeft } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Language, Achievement } from '../services/types';
import { translations } from '../utils/translations';
import { format } from 'date-fns';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange: () => void;
  currentLang: Language;
  onLangChange: (lang: Language) => void;
  achievementsList: Achievement[];
  unlockedAchievements: Record<string, number>;
  dateLocale: any;
}

type SettingsView = 'MAIN' | 'ACHIEVEMENTS';

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  onDataChange, 
  currentLang, 
  onLangChange,
  achievementsList,
  unlockedAchievements,
  dateLocale
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<SettingsView>('MAIN');
  const t = translations[currentLang];

  useEffect(() => {
    if (isOpen) {
        setView('MAIN');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = () => {
    const data = StorageService.getFullBackupData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solo-insight-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json);

        if (!data.entries && !data.tags) throw new Error("Invalid backup file format");

        if (window.confirm(`Found ${data.entries?.length || 0} entries. This will OVERWRITE your current data. Continue?`)) {
            if (data.entries) localStorage.setItem('solo_insight_entries', JSON.stringify(data.entries));
            if (data.tags) localStorage.setItem('solo_insight_tags', JSON.stringify(data.tags));
            if (data.insights) localStorage.setItem('solo_insight_saved_insights', JSON.stringify(data.insights));
            if (data.achievements) localStorage.setItem('solo_insight_achievements_state', JSON.stringify(data.achievements));
            if (data.library) localStorage.setItem('solo_insight_library', JSON.stringify(data.library));
            if (data.aiAccess) localStorage.setItem('solo_insight_ai_access', JSON.stringify(data.aiAccess));
            if (data.language) StorageService.setLanguage(data.language);
            
            alert('Data restored locally. Refreshing...');
            onDataChange();
            onClose();
        }
      } catch (err) {
        alert('Failed to import file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure? This will delete ALL history from THIS DEVICE.')) {
      localStorage.clear();
      onDataChange();
      onClose();
    }
  };

  const renderMainContent = () => (
      <div className="p-6 space-y-8 animate-in slide-in-from-left duration-300">
          
          {/* Achievements Button */}
          <div className="space-y-3">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.nav_awards}</h3>
             <button 
                onClick={() => setView('ACHIEVEMENTS')}
                className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl p-4 flex items-center justify-between group transition-all"
             >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg">
                        <Award size={20} />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                            {t.view_achievements}
                        </div>
                        <div className="text-[10px] text-slate-400">
                             {Object.keys(unlockedAchievements).length}/{achievementsList.length} {t.unlocked_status}
                        </div>
                    </div>
                </div>
                <ChevronRight size={18} className="text-slate-500 group-hover:text-white transition-colors" />
             </button>
          </div>

          <div className="h-px bg-slate-800 w-full" />
          
          {/* Language Section */}
          <div className="space-y-3">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.language}</h3>
             <div className="flex gap-2">
                <button 
                   onClick={() => onLangChange('en')}
                   className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${currentLang === 'en' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                >
                    English
                </button>
                <button 
                   onClick={() => onLangChange('zh')}
                   className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${currentLang === 'zh' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                >
                    中文
                </button>
             </div>
          </div>

          {/* Data Section */}
          <div className="space-y-3">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.backup_restore}</h3>
             <p className="text-[10px] text-slate-400 mb-2">{t.manual_backup_warning}</p>
             
             <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={handleExport}
                    className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors gap-2 border border-slate-700"
                 >
                    <Download size={20} className="text-violet-400"/>
                    <span className="text-xs font-bold text-slate-200">{t.export_json}</span>
                 </button>

                 <button 
                    onClick={handleImportClick}
                    className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors gap-2 border border-slate-700"
                 >
                    <Upload size={20} className="text-emerald-400"/>
                    <span className="text-xs font-bold text-slate-200">{t.import_data}</span>
                 </button>
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
             </div>
          </div>

          <div className="space-y-3 pt-2">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.danger_zone}</h3>
             <button 
                onClick={handleClearData}
                className="w-full flex items-center justify-between p-4 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 rounded-xl transition-colors group"
             >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-900/20 group-hover:bg-red-900/40 rounded-lg text-red-400 transition-colors">
                        <Trash2 size={18} />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-bold text-red-400">{t.factory_reset}</div>
                        <div className="text-[10px] text-red-500/70">Wipe local data</div>
                    </div>
                </div>
             </button>
          </div>
      </div>
  );

  const renderAchievementsContent = () => (
      <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
          <div className="p-4 overflow-y-auto no-scrollbar space-y-3 flex-1">
              {achievementsList.map(ach => {
                    const isUnlocked = !!unlockedAchievements[ach.id];
                    return (
                        <div key={ach.id} className={`p-4 rounded-xl border flex items-center gap-4 relative overflow-hidden transition-all ${isUnlocked ? 'bg-slate-800/50 border-violet-900/40' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
                            {isUnlocked && <div className="absolute inset-0 bg-gradient-to-r from-violet-900/10 to-transparent pointer-events-none"></div>}
                            
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${isUnlocked ? 'bg-violet-950 text-violet-300 border-violet-800 shadow-lg shadow-violet-900/20' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>
                                <Award size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className={`text-sm font-bold ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>{ach.title}</h4>
                                    {isUnlocked && <span className="text-[10px] text-violet-400 font-medium bg-violet-900/20 px-1.5 py-0.5 rounded border border-violet-500/20">{format(new Date(unlockedAchievements[ach.id]), 'MM/dd')}</span>}
                                </div>
                                <p className="text-xs text-slate-400 leading-snug">{ach.description}</p>
                            </div>
                        </div>
                    )
                })}
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Container: 保持与原先完全一致的大小 */}
      <div className="relative w-full max-w-sm h-[80vh] max-h-[600px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Dynamic Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
              {view === 'ACHIEVEMENTS' && (
                  <button onClick={() => setView('MAIN')} className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                      <ArrowLeft size={18} />
                  </button>
              )}
              <h2 className="text-lg font-bold text-white">
                  {view === 'ACHIEVEMENTS' ? t.nav_awards : t.settings_title}
              </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Dynamic Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
            {view === 'MAIN' ? renderMainContent() : renderAchievementsContent()}
        </div>
      </div>
    </div>
  );
};