import React, { useState } from 'react';
import { FirebaseService } from '../services/firebase';
import { LogIn, UserPlus, AlertCircle, Loader2, Globe, User } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await FirebaseService.signIn(email, password);
      } else {
        await FirebaseService.signUp(email, password);
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
        await FirebaseService.signInWithGoogle();
    } catch (err: any) {
        handleAuthError(err);
        setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setError('');
    setLoading(true);
    try {
        await FirebaseService.signInAnonymously();
    } catch (err: any) {
        handleAuthError(err);
        setLoading(false);
    }
  };

  const handleAuthError = (err: any) => {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign in cancelled.');
      } else {
        setError(err.message || 'Authentication failed');
      }
  };

  return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      
       {/* Global Background Orbs - Enhanced Colors */}
       <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-violet-600/40 rounded-full blur-[120px] animate-blob mix-blend-screen pointer-events-none"></div>
       <div className="absolute top-[30%] right-[-20%] w-[60%] h-[60%] bg-fuchsia-600/30 rounded-full blur-[120px] animate-blob animation-delay-2000 mix-blend-screen pointer-events-none"></div>
       <div className="absolute bottom-[-10%] left-[20%] w-[70%] h-[70%] bg-cyan-600/30 rounded-full blur-[120px] animate-blob animation-delay-4000 mix-blend-screen pointer-events-none"></div>
       <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-amber-600/20 rounded-full blur-[100px] animate-blob animation-delay-3000 mix-blend-screen pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/30 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl animate-slide-up">
        
        <div className="relative z-10">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-2 drop-shadow-sm">
                    Solo Insight
                </h1>
                <p className="text-slate-300 text-sm font-medium">
                    {isLogin ? "Welcome back, traveler." : "Begin your journey of self-discovery."}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email</label>
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-violet-500 transition-colors focus:bg-slate-900/80 placeholder-slate-600"
                        placeholder="name@example.com"
                    />
                </div>
                
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Password</label>
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-violet-500 transition-colors focus:bg-slate-900/80 placeholder-slate-600"
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-300 text-xs bg-red-950/40 p-3 rounded-lg border border-red-500/20 backdrop-blur-sm">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full mt-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-violet-900/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed border border-white/10"
                >
                    {loading ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        isLogin ? <><LogIn size={18} /> Sign In</> : <><UserPlus size={18} /> Create Account</>
                    )}
                </button>
            </form>

            <div className="my-6 flex items-center gap-4">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-xs text-slate-500 font-medium">OR CONTINUE WITH</span>
                <div className="h-px bg-white/10 flex-1"></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                 <button 
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                 >
                    {/* Simple Google G Icon Representation */}
                    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                      <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                      </g>
                    </svg>
                    Google
                 </button>

                 <button 
                    type="button"
                    onClick={handleAnonymousLogin}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-slate-800 text-slate-300 font-bold py-3 rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors disabled:opacity-50"
                 >
                    <User size={18} />
                    Guest
                 </button>
            </div>

            <div className="mt-8 text-center">
                <p className="text-slate-400 text-sm">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button 
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="ml-2 text-violet-300 hover:text-white font-bold transition-colors"
                    >
                        {isLogin ? "Sign Up" : "Sign In"}
                    </button>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};