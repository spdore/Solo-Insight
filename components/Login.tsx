import React, { useState } from 'react';
import { FirebaseService } from '../services/firebase';
import { Mail, Lock, LogIn, Chrome, Ghost, AlertCircle, ArrowRight } from 'lucide-react';

export const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await FirebaseService.signInEmail(email, password);
      } else {
        await FirebaseService.signUpEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await FirebaseService.signInGoogle();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAnon = async () => {
    setLoading(true);
    setError('');
    try {
      await FirebaseService.signInAnon();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[#020617] flex items-center justify-center overflow-hidden font-sans">
      
      {/* Background Ambience - 20% Opacity Slow Moving Orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-violet-600/20 rounded-full blur-[100px] animate-blob"></div>
        <div className="absolute top-[40%] right-[-10%] w-[40vw] h-[40vw] bg-fuchsia-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] bg-cyan-600/20 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card - Frosted Glass */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl"></div>
        
        <div className="relative z-20 flex flex-col items-center">
            {/* Header */}
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent tracking-tight">
                    Solo Insight
                </h1>
                <p className="text-slate-400 text-sm mt-2 font-medium tracking-wide uppercase">
                    Private Journey Tracker
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-6 flex items-center gap-3 text-red-400 text-xs font-medium animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="w-full space-y-4">
                <div className="space-y-1">
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                            type="email" 
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                            type="password" 
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                        />
                    </div>
                </div>

                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            {isLogin ? 'Sign In' : 'Create Account'}
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <span>{isLogin ? "New here?" : "Already have an account?"}</span>
                <button 
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    className="text-violet-400 hover:text-violet-300 font-bold transition-colors"
                >
                    {isLogin ? "Sign up" : "Log in"}
                </button>
            </div>

            {/* Divider */}
            <div className="w-full flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-slate-800"></div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Or continue with</span>
                <div className="flex-1 h-px bg-slate-800"></div>
            </div>

            {/* Social Buttons */}
            <div className="grid grid-cols-2 gap-3 w-full">
                <button 
                    onClick={handleGoogle}
                    className="flex items-center justify-center gap-2 bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors shadow-lg shadow-white/5 active:scale-[0.98]"
                >
                    <Chrome size={18} />
                    Google
                </button>
                <button 
                    onClick={handleAnon}
                    className="flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-700 hover:text-white transition-colors active:scale-[0.98]"
                >
                    <Ghost size={18} />
                    Anonymous
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};