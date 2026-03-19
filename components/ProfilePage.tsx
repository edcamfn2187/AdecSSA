
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { UserSession } from '../types';

interface ProfilePageProps {
  session: UserSession;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ session }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar senha.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-[28px] flex items-center justify-center text-3xl font-black shadow-xl shadow-indigo-100">
            {session.name ? session.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{session.name || 'Usuário'}</h2>
            <p className="text-slate-500 font-medium">{session.email}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
              session.role === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {session.role === 'ADMIN' ? 'Administrador' : 'Professor'}
            </span>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Alterar Senha</h3>
          
          {message && (
            <div className={`p-4 rounded-2xl text-xs font-bold border ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
              <input 
                type="password" 
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="No mínimo 6 caracteres"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
              <input 
                type="password" 
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'ATUALIZANDO...' : 'SALVAR NOVA SENHA'}
          </button>
        </form>
      </div>

      <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 text-center">
        <p className="text-indigo-600 text-xs font-bold">
          Dica de Segurança: Use senhas fortes com números e símbolos para proteger seu acesso ao sistema EBD.
        </p>
      </div>
    </div>
  );
};
