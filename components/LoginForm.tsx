
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ICONS } from '../constants';
import { ChurchSettings } from '../types';

interface LoginFormProps {
  onLoginSuccess: () => void;
  initialSettings: ChurchSettings | null;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, initialSettings }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [churchSettings, setChurchSettings] = useState<ChurchSettings | null>(initialSettings);

  useEffect(() => {
    if (!initialSettings) {
      const fetchSettings = async () => {
        try {
          const data = await api.get('church_settings');
          if (data && data.length > 0) setChurchSettings(data[0]);
        } catch (e) {
          console.warn("Could not fetch church settings for login screen.");
        }
      };
      fetchSettings();
    }
  }, [initialSettings]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await api.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-[#6e295e] p-10 text-white text-center relative overflow-hidden">
          {/* Logo Container */}
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-white/10 overflow-hidden relative">
             {churchSettings?.logo_url ? (
               <img src={churchSettings.logo_url} alt="Logo" className="w-full h-full object-cover animate-in fade-in duration-500" />
             ) : (
               <div className={`text-white scale-125 ${!churchSettings ? 'animate-pulse' : ''}`}>
                <ICONS.Bible />
               </div>
             )}
          </div>
          
          {churchSettings ? (
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-tight animate-in slide-in-from-bottom-2">
              {churchSettings.name}
            </h1>
          ) : (
            <div className="h-8 w-48 bg-white/10 rounded-lg mx-auto animate-pulse"></div>
          )}
          
          <p className="text-purple-100 text-[10px] mt-2 opacity-80 font-black uppercase tracking-widest">
            Gestão de Escola Bíblica
          </p>
          
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>
        </div>

        <div className="p-10">
          <form onSubmit={handleAuth} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-red-100 text-center animate-in slide-in-from-top-2">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="professor@ebd.com"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-[#6e295e]/10 focus:border-[#6e295e] outline-none transition-all font-bold text-slate-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-[#6e295e]/10 focus:border-[#6e295e] outline-none transition-all font-bold text-slate-700"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-[#6e295e] text-white font-black rounded-2xl shadow-xl hover:bg-[#5a214d] transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs mt-4"
            >
              {loading ? 'AUTENTICANDO...' : 'ENTRAR NO PAINEL'}
            </button>
          </form>
          
          <div className="mt-10 text-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
              Problemas com seu acesso?<br/>
              <span className="text-[#6e295e]">Contate o seu administrador.</span>
            </p>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-8 text-center">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] opacity-40">
          EBD Manager Pro
        </p>
      </div>
    </div>
  );
};
