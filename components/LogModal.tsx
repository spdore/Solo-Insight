import React, { useState, useEffect } from 'react';
import { Entry, OrgasmType, Language } from '../types';
import { X, Clock, Play, Pause, Save, RotateCcw, Zap, Link as LinkIcon, User, Archive, ChevronLeft, ArrowRight, Check, Calendar, Square } from 'lucide-react';
import { format } from 'date-fns';
import { StorageService } from '../services/storageService';
import { translations } from '../utils/translations';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<Entry, 'id'>) => void;
  allTags: string[];
  onAddTag: (tag: string) => void;
  lang: Language;
}

const TOTAL_STEPS = 6;

export const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, onSave, allTags, onAddTag, lang }) => {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<'NOW' | 'PAST'>('NOW');
  const [duration, setDuration] = useState<number>(0); 
  const [timerRunning, setTimerRunning] = useState(false);
  const [intensity, setIntensity] = useState<number>(3);
  const [orgasm, setOrgasm] = useState<OrgasmType>('YES');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [newTagInput, setNewTagInput] = useState('');
  
  const [contentUrl, setContentUrl] = useState('');
  const [contentActor, setContentActor] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    if (isOpen) {
      setStep(1);
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

  useEffect(() => {
    let interval: any;
    if (timerRunning) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(s => s + 1);
    else handleSave();
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const handleSave = () => {
    const finalDuration = Math.ceil(duration / 60) || 1; 
    const timestamp = mode === 'NOW' ? Date.now() : new Date(date).getTime();
    
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
      contentUsed: { url: contentUrl, actor: contentActor }
    });
    onClose();
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) setSelectedTags(selectedTags.filter(t => t !== tag));
    else setSelectedTags([...selectedTags, tag]);
  };

  const handleAddCustomTag = () => {
    if (newTagInput.trim()) {
        onAddTag(newTagInput.trim());
        toggleTag(newTagInput.trim());
        setNewTagInput('');
    }
  }

  const getTranslatedTag = (tag: string) => {
    const key = `tag_${tag.replace(/\s+/g, '_')}` as keyof typeof t;
    return (t as any)[key] || tag;
  };

  // --- UI COMPONENTS ---

  const StepHeader = ({ title, icon: Icon }: { title: string, icon?: any }) => (
    <div className="flex items-center gap-2 mb-6 opacity-60">
        {Icon && <Icon size={14} className="text-violet-400" />}
        <span className="text-xs font-bold uppercase tracking-widest text-white">{title}</span>
    </div>
  );

  const renderDurationCard = () => (
    <div className="flex flex-col h-full">
      {/* Mode Toggle Pilled */}
      <div className="flex justify-center mb-8">
        <div className="bg-slate-900 p-1 rounded-full border border-slate-800 flex">
            <button 
                onClick={() => { setMode('NOW'); setTimerRunning(false); }}
                className={`px-4 py-1.5 text-[10px] font-bold rounded-full transition-all ${mode === 'NOW' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
            >
                {t.log_live}
            </button>
            <button 
                onClick={() => { setMode('PAST'); setTimerRunning(false); }}
                className={`px-4 py-1.5 text-[10px] font-bold rounded-full transition-all ${mode === 'PAST' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
            >
                {t.log_manual}
            </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {mode === 'NOW' ? (
            <>
                <div className={`text-6xl font-thin tabular-nums tracking-tighter mb-10 select-none ${timerRunning ? 'text-white' : 'text-slate-600'} transition-colors`}>
                    {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                </div>
                
                <div className="flex items-center gap-6 relative">
                    {/* Reset Button (Only visible if paused and has duration) */}
                    {duration > 0 && !timerRunning && (
                        <button 
                            onClick={() => { setTimerRunning(false); setDuration(0); }}
                            className="absolute -left-20 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-slate-900 text-slate-500 hover:text-white transition-colors border border-slate-800"
                        >
                            <RotateCcw size={18} />
                        </button>
                    )}
                    
                    {/* Main Start/Stop Button */}
                    <div className="flex flex-col items-center gap-3">
                        <button 
                            onClick={() => setTimerRunning(!timerRunning)}
                            className={`w-24 h-24 flex items-center justify-center rounded-full transition-all active:scale-95 shadow-2xl ${
                                timerRunning 
                                ? 'bg-rose-500/10 text-rose-500 border-2 border-rose-500/50 hover:bg-rose-500/20 shadow-rose-900/20' 
                                : 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-violet-900/40 border-0'
                            }`}
                        >
                            {timerRunning ? (
                                <Square size={32} fill="currentColor" />
                            ) : (
                                <Play size={32} fill="currentColor" className="ml-1" />
                            )}
                        </button>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider animate-pulse">
                            {timerRunning ? (lang === 'zh' ? '点击结束' : 'Tap to Finish') : (duration > 0 ? (lang === 'zh' ? '继续' : 'Resume') : (lang === 'zh' ? '开始' : 'Start'))}
                        </span>
                    </div>
                </div>
            </>
        ) : (
            <div className="w-full space-y-4 px-4">
                <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-1">{t.when}</label>
                    <div className="flex items-center bg-slate-900 rounded-xl px-4 py-3 border border-slate-800">
                        <Calendar size={16} className="text-slate-500 mr-3"/>
                        <input 
                            type="datetime-local" 
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent text-sm text-white w-full outline-none font-medium"
                            style={{colorScheme: 'dark'}}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 uppercase font-bold pl-1">{t.duration_min}</label>
                     <div className="flex items-center bg-slate-900 rounded-xl px-4 py-3 border border-slate-800">
                        <Clock size={16} className="text-slate-500 mr-3"/>
                        <input 
                            type="number" 
                            value={Math.ceil(duration / 60)} 
                            onChange={(e) => setDuration(parseInt(e.target.value) * 60)}
                            className="bg-transparent text-lg font-bold text-white w-full outline-none"
                            placeholder="0"
                        />
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );

  const renderIntensityCard = () => (
    <div className="flex flex-col h-full px-4">
       <StepHeader title={t.intensity} icon={Zap} />
       
       <div className="flex-1 flex flex-col justify-center gap-3">
          {[5, 4, 3, 2, 1].map((level) => (
             <button 
                key={level}
                onClick={() => setIntensity(level)}
                className={`group relative w-full h-14 rounded-xl flex items-center px-4 transition-all duration-300 overflow-hidden ${
                    intensity === level 
                    ? 'ring-1 ring-white/20' 
                    : 'hover:bg-slate-900'
                }`}
             >
                {/* Background Bar */}
                <div 
                    className={`absolute inset-0 opacity-20 transition-all duration-500 ${
                        level === 5 ? 'bg-fuchsia-600' : 
                        level === 4 ? 'bg-violet-600' : 
                        level === 3 ? 'bg-indigo-600' : 
                        'bg-slate-600'
                    }`} 
                    style={{ width: intensity === level ? '100%' : '0%' }}
                />

                {/* Level Bars Indicator */}
                <div className="flex gap-1.5 mr-4">
                    {Array(level).fill(0).map((_, i) => (
                        <div key={i} className={`w-1.5 h-6 rounded-sm ${intensity === level ? 'bg-white' : 'bg-slate-700 group-hover:bg-slate-600'}`}></div>
                    ))}
                </div>

                <span className={`text-lg font-medium ml-auto ${intensity === level ? 'text-white' : 'text-slate-500'}`}>{level}</span>
             </button>
          ))}
       </div>
    </div>
  );

  const renderOutcomeCard = () => (
    <div className="flex flex-col h-full px-4">
      <StepHeader title={t.climax} icon={Check} />
      
      <div className="flex-1 flex flex-col justify-center gap-4">
        {(['YES', 'EDGING', 'NO'] as OrgasmType[]).map((type) => (
            <button
                key={type}
                onClick={() => setOrgasm(type)}
                className={`h-20 w-full rounded-2xl border flex items-center justify-between px-6 transition-all relative overflow-hidden group ${
                    orgasm === type 
                    ? 'bg-slate-800 border-slate-600 text-white' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
            >
                {orgasm === type && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-violet-500"></div>}
                
                <span className="text-lg font-bold tracking-wide">{
                    type === 'YES' ? t.orgasm_yes : type === 'NO' ? t.orgasm_no : t.orgasm_edging
                }</span>
                
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    orgasm === type ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-600'
                }`}>
                    {orgasm === type && <Check size={14} strokeWidth={4} />}
                </div>
            </button>
        ))}
      </div>
    </div>
  );

  const renderTagsCard = () => (
    <div className="flex flex-col h-full px-4 overflow-hidden">
      <StepHeader title={t.context_tags} />
      
      <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
        <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
                <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-4 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                        selectedTags.includes(tag)
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                >
                    {getTranslatedTag(tag)}
                </button>
            ))}
            
            <div className="flex items-center gap-2 w-full mt-4 border-t border-slate-800 pt-4">
                <input 
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Add custom tag..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                />
                <button onClick={handleAddCustomTag} className="text-violet-400 font-bold text-xl px-2">+</button>
            </div>
        </div>
      </div>
    </div>
  );

  const renderContentCard = () => (
    <div className="flex flex-col h-full px-4">
       <StepHeader title={t.what_watched} icon={LinkIcon} />

       <div className="flex-1 flex flex-col pt-4 gap-4">
            <div className="bg-slate-900 rounded-2xl p-1 border border-slate-800">
                 <div className="flex items-center px-4 py-3 border-b border-slate-800/50">
                    <User size={16} className="text-slate-500 mr-3"/>
                    <input 
                        type="text" 
                        value={contentActor}
                        onChange={(e) => setContentActor(e.target.value)}
                        placeholder={t.placeholder_actor}
                        className="bg-transparent w-full text-sm text-white outline-none placeholder-slate-600"
                    />
                </div>
                <div className="flex items-center px-4 py-3">
                    <LinkIcon size={16} className="text-slate-500 mr-3"/>
                    <input 
                        type="text" 
                        value={contentUrl}
                        onChange={(e) => setContentUrl(e.target.value)}
                        placeholder={t.placeholder_link}
                        className="bg-transparent w-full text-sm text-white outline-none placeholder-slate-600"
                    />
                </div>
            </div>

            <button 
                onClick={() => setSaveToLibrary(!saveToLibrary)}
                className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                    saveToLibrary 
                    ? 'bg-indigo-900/30 text-indigo-300 border border-indigo-500/30' 
                    : 'bg-transparent text-slate-500 border border-slate-800 hover:bg-slate-900'
                }`}
            >
                <Archive size={14} />
                {t.save_library}
            </button>
       </div>
    </div>
  );

  const renderNotesCard = () => (
    <div className="flex flex-col h-full px-4">
       <StepHeader title={t.private_notes} />
       <div className="flex-1 pt-2 pb-4">
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                className="w-full h-full bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 focus:border-indigo-500 outline-none resize-none placeholder-slate-600 leading-relaxed"
                placeholder="Write your thoughts..."
                autoFocus
            />
       </div>
    </div>
  );

  if (!isOpen) return null;

  // Logic to disable Next button if timer is running or hasn't started in NOW mode
  const isNextDisabled = step === 1 && mode === 'NOW' && (timerRunning || duration === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto transition-opacity duration-300" onClick={onClose} />
      
      {/* 
        PREMIUM CARD DESIGN 
        Fixed Dimensions: 320px x 540px
      */}
      <div className="relative w-[320px] h-[540px] bg-[#0B0F19] border border-slate-800/60 rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col pointer-events-auto overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Step Indicator (Subtle Dots) */}
        <div className="absolute top-6 left-0 right-0 flex justify-center gap-1.5 z-20">
            {Array(TOTAL_STEPS).fill(0).map((_, i) => (
                <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all duration-300 ${i + 1 === step ? 'w-4 bg-white' : 'w-1 bg-slate-700'}`}
                />
            ))}
        </div>

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-slate-900 text-slate-500 hover:text-white transition-colors">
            <X size={16} />
        </button>

        {/* Content Body */}
        <div className="flex-1 pt-14 pb-20">
            {step === 1 && renderDurationCard()}
            {step === 2 && renderIntensityCard()}
            {step === 3 && renderOutcomeCard()}
            {step === 4 && renderTagsCard()}
            {step === 5 && renderContentCard()}
            {step === 6 && renderNotesCard()}
        </div>

        {/* Footer Navigation (Fixed Height) */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#0B0F19]/90 backdrop-blur-md border-t border-slate-800/50 flex items-center justify-between px-6 z-10">
            <div>
                {step > 1 && (
                    <button 
                        onClick={handleBack}
                        className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                )}
            </div>

            {step < TOTAL_STEPS ? (
                <button 
                    onClick={handleNext}
                    disabled={isNextDisabled}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg transition-all active:scale-95 ${
                        isNextDisabled 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none opacity-50' 
                        : 'bg-white text-black shadow-white/10 hover:bg-slate-200'
                    }`}
                >
                    Next <ArrowRight size={16} />
                </button>
            ) : (
                <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-full text-sm font-bold shadow-lg shadow-violet-500/20 hover:brightness-110 transition-transform active:scale-95"
                >
                    Save <Save size={16} />
                </button>
            )}
        </div>
      </div>
    </div>
  );
};