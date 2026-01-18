import React, { useRef } from 'react';
import { X, Download, Trash2, Upload, Globe } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange: () => void;
  currentLang: Language;
  onLangChange: (lang: Language) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onDataChange, currentLang, onLangChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[currentLang];

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">{t.settings_title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
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

          <div className="space-y-3">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.backup_restore}</h3>
             <p className="text-[10px] text-slate-400 mb-2">Since this app is offline, manual backups are the only way to save your data outside this device.</p>
             
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
      </div>
    </div>
  );
};