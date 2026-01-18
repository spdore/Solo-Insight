import React, { useState } from 'react';
import { Lock, Unlock, X, ShieldAlert } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { AiAccessState, Language } from '../services/types';
import { translations } from '../utils/translations';

interface AiLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accessState: AiAccessState;
  onUpdateState: (state: AiAccessState) => void;
  lang: Language;
}

const CORRECT_KEY = "114514";
const MAX_ATTEMPTS = 5;

export const AiLockModal: React.FC<AiLockModalProps> = ({ isOpen, onClose, onSuccess, accessState, onUpdateState, lang }) => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const t = translations[lang];

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (accessState.attempts >= MAX_ATTEMPTS) {
        setError('Maximum attempts exceeded. Feature locked.');
        return;
    }

    if (inputKey === CORRECT_KEY) {
        // Success
        const newState = { ...accessState, unlocked: true };
        onUpdateState(StorageService.updateAiAccessState(newState));
        onSuccess();
        onClose();
    } else {
        // Failure
        const newAttempts = accessState.attempts + 1;
        const newState = { ...accessState, attempts: newAttempts };
        onUpdateState(StorageService.updateAiAccessState(newState));
        
        // UI Feedback
        setShake(true);
        setTimeout(() => setShake(false), 500);
        
        if (newAttempts >= MAX_ATTEMPTS) {
            setError('Access permanently disabled due to too many failed attempts.');
        } else {
            setError(`Incorrect key. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
            setInputKey('');
        }
    }
  };

  const isLocked = accessState.attempts >= MAX_ATTEMPTS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      <div className={`relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200 ${shake ? 'animate-shake' : ''}`}>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <X size={20} />
        </button>

        <div className="flex flex-col items-center mb-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isLocked ? 'bg-red-900/30 text-red-500' : 'bg-indigo-900/30 text-indigo-400'}`}>
                {isLocked ? <ShieldAlert size={24} /> : <Lock size={24} />}
            </div>
            <h2 className="text-xl font-bold text-white">{t.security_check}</h2>
            <p className="text-sm text-slate-400 mt-1 text-center">
                {isLocked 
                    ? "This feature has been disabled." 
                    : t.enter_code}
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <input 
                type="password" 
                value={inputKey}
                onChange={(e) => { setError(''); setInputKey(e.target.value); }}
                disabled={isLocked}
                placeholder="Access Code"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg tracking-widest text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-600"
                autoFocus
            />

            {error && (
                <div className={`text-xs text-center font-medium ${isLocked ? 'text-red-500' : 'text-amber-500'}`}>
                    {error}
                </div>
            )}

            {!isLocked && (
                <button 
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-900/20"
                >
                    {t.unlock_feature}
                </button>
            )}

            {isLocked && (
                <button 
                    type="button"
                    onClick={onClose}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all"
                >
                    {t.close}
                </button>
            )}
        </form>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};