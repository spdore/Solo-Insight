import React, { useState, useEffect } from 'react';
import { Entry, OrgasmType } from '../types';
import { X, Clock, Play, Pause, Save, RotateCcw, Zap, Link as LinkIcon, User, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { StorageService } from '../services/storageService';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<Entry, 'id'>) => void;
  allTags: string[];
  onAddTag: (tag: string) => void;
}

export const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, onSave, allTags, onAddTag }) => {
  const [mode, setMode] = useState<'NOW' | 'PAST'>('NOW');
  const [duration, setDuration] = useState<number>(0); // in seconds
  const [timerRunning, setTimerRunning] = useState(false);
  const [intensity, setIntensity] = useState<number>(3);
  const [orgasm, setOrgasm] = useState<OrgasmType>('YES');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [newTagInput, setNewTagInput] = useState('');
  
  // Content / Library Fields
  const [contentUrl, setContentUrl] = useState('');
  const [contentActor, setContentActor] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(false);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setDuration(0);
      setTimerRunning(false);
      setIntensity(3);
      setOrgasm('YES');
      setSelectedTags([]);
      setNote('');
      setDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setMode('NOW');
      setContentUrl('');
      setContentActor('');
      setSaveToLibrary(false);
    }
  }, [isOpen]);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (timerRunning) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleSave = () => {
    const finalDuration = Math.ceil(duration / 60) || 1; // Minimum 1 min
    const timestamp = mode === 'NOW' ? Date.now() : new Date(date).getTime();
    
    // Save to Library if requested
    if (saveToLibrary && (contentUrl || contentActor)) {
        StorageService.addLibraryItem({
            id: crypto.randomUUID(),
            url: contentUrl,
            actor: contentActor,
            isFavorite: false,
            createdAt: Date.now()
        });
    }

    onSave({
      timestamp,
      duration: finalDuration,
      intensity,
      orgasm,
      tags: selectedTags,
      note,
      contentUsed: {
          url: contentUrl,
          actor: contentActor
      }
    });
    onClose();
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    if (newTagInput.trim()) {
        onAddTag(newTagInput.trim());
        toggleTag(newTagInput.trim());
        setNewTagInput('');
    }
  }

  const getIntensityGradient = (level: number) => {
     // Visual feedback for intensity slider
     if (intensity >= level) {
         if (intensity <= 2) return 'bg-slate-600 text-white';
         if (intensity === 3) return 'bg-violet-600 text-white shadow-[0_0_10px_rgba(124,58,237,0.4)]';
         return 'bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(192,38,211,0.5)]';
     }
     return 'bg-slate-800 text-slate-500 hover:bg-slate-700';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] pointer-events-auto overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900">
            <div className="flex bg-slate-950 p-1 rounded-full border border-slate-800">
                <button 
                    onClick={() => setMode('NOW')}
                    className={`px-4 py-1 text-xs font-semibold rounded-full transition-all ${mode === 'NOW' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Live
                </button>
                <button 
                    onClick={() => setMode('PAST')}
                    className={`px-4 py-1 text-xs font-semibold rounded-full transition-all ${mode === 'PAST' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Manual
                </button>
            </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-8 flex-1">
          
          {/* Duration / Timer */}
          <div className="flex flex-col items-center justify-center space-y-6">
            {mode === 'NOW' ? (
                <>
                    <div className="relative">
                        <div className={`text-7xl font-light tabular-nums tracking-tighter ${timerRunning ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'text-slate-500'} transition-all`}>
                            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                        </div>
                        {timerRunning && <div className="absolute -inset-4 bg-violet-500/10 blur-xl rounded-full -z-10 animate-pulse"></div>}
                    </div>
                    
                    <div className="flex gap-6 items-center">
                         <button 
                            onClick={() => { setTimerRunning(false); setDuration(0); }}
                            className="p-4 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                        >
                            <RotateCcw size={20} />
                        </button>
                        <button 
                            onClick={() => setTimerRunning(!timerRunning)}
                            className={`p-6 rounded-full transition-all transform active:scale-95 ${
                                timerRunning 
                                ? 'bg-slate-100 text-slate-900 shadow-lg shadow-slate-100/20' 
                                : 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/30 border border-violet-500'
                            }`}
                        >
                            {timerRunning ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                        </button>
                    </div>
                </>
            ) : (
                <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="mb-4">
                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block tracking-wider">When</label>
                        <input 
                            type="datetime-local" 
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-3 bg-slate-900 rounded-lg border border-slate-700 text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                            style={{colorScheme: 'dark'}}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block tracking-wider">Duration (Minutes)</label>
                        <div className="flex items-center gap-2 bg-slate-900 rounded-lg border border-slate-700 px-3">
                            <Clock size={16} className="text-slate-500"/>
                            <input 
                                type="number" 
                                value={Math.ceil(duration / 60)} 
                                onChange={(e) => setDuration(parseInt(e.target.value) * 60)}
                                className="w-full p-3 bg-transparent text-slate-200 focus:outline-none placeholder-slate-600"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>
            )}
          </div>

          <div className="h-px bg-slate-800 w-full" />

          {/* Intensity */}
          <div>
            <div className="flex justify-between items-center mb-4 px-1">
                 <label className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <Zap size={14} className="text-violet-400" />
                    Intensity
                 </label>
                 <span className="text-xs text-slate-500 font-medium">{intensity}/5</span>
            </div>
            
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setIntensity(level)}
                  className={`flex-1 h-12 rounded-lg flex items-center justify-center text-sm font-bold transition-all border border-transparent ${getIntensityGradient(level)}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-400 mb-3 block tracking-wider px-1">Climax</label>
            <div className="grid grid-cols-3 gap-3">
                {(['YES', 'NO', 'EDGING'] as OrgasmType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => setOrgasm(type)}
                        className={`py-3 px-2 rounded-lg text-xs font-bold tracking-wide transition-all border ${
                            orgasm === type 
                            ? 'bg-slate-100 text-slate-900 border-white shadow-[0_0_15px_rgba(255,255,255,0.15)]' 
                            : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600 hover:text-slate-300'
                        }`}
                    >
                        {type === 'YES' ? 'CLIMAX' : type}
                    </button>
                ))}
            </div>
          </div>

          {/* Content Source (New Section) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
             <label className="text-xs font-bold uppercase text-slate-400 mb-3 block tracking-wider">What did you watch?</label>
             <div className="space-y-3">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                    <LinkIcon size={14} className="text-slate-500 shrink-0"/>
                    <input 
                      type="text" 
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      placeholder="Paste link..."
                      className="bg-transparent w-full text-sm text-slate-200 outline-none placeholder-slate-600"
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                    <User size={14} className="text-slate-500 shrink-0"/>
                    <input 
                      type="text" 
                      value={contentActor}
                      onChange={(e) => setContentActor(e.target.value)}
                      placeholder="Actor name..."
                      className="bg-transparent w-full text-sm text-slate-200 outline-none placeholder-slate-600"
                    />
                </div>
                <div className="flex items-center gap-3 pt-1">
                    <button 
                        onClick={() => setSaveToLibrary(!saveToLibrary)}
                        className={`flex items-center gap-2 text-xs font-medium transition-colors ${saveToLibrary ? 'text-violet-400' : 'text-slate-500'}`}
                    >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${saveToLibrary ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-600'}`}>
                            {saveToLibrary && <Archive size={10} />}
                        </div>
                        Save to Library for next time
                    </button>
                </div>
             </div>
          </div>

          {/* Tags */}
          <div>
             <label className="text-xs font-bold uppercase text-slate-400 mb-3 block tracking-wider px-1">Context Tags</label>
             <div className="flex flex-wrap gap-2 mb-3">
                {allTags.map(tag => (
                    <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            selectedTags.includes(tag)
                            ? 'bg-violet-900/40 text-violet-200 border-violet-500/50'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'
                        }`}
                    >
                        {tag}
                    </button>
                ))}
             </div>
             <div className="flex gap-2">
                <input 
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Add custom tag..."
                    className="flex-1 px-4 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg outline-none text-slate-300 focus:border-violet-500 transition-colors placeholder-slate-600"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                />
             </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-400 mb-2 block tracking-wider px-1">Private Notes</label>
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none resize-none h-28 placeholder-slate-700"
                placeholder="Mood, thoughts, details..."
            />
            <div className="text-right text-[10px] text-slate-600 mt-2">{note.length}/500</div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-900">
            <button 
                onClick={handleSave}
                className="w-full py-4 bg-white text-slate-950 font-bold rounded-xl shadow-lg hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
                <Save size={18} />
                Save Record
            </button>
        </div>
      </div>
    </div>
  );
};
