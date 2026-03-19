
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { createClient } from '@supabase/supabase-js';
import { Profile, UserRole, AppModule } from '../types';

export const UserManagement: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  
  // Create User States
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('TEACHER');
  const [newAllowedModules, setNewAllowedModules] = useState<AppModule[]>([AppModule.EBD]);
  
  // Edit User States
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('TEACHER');
  const [editAllowedModules, setEditAllowedModules] = useState<AppModule[]>([]);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar perfis:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) {
      return;
    }

    setSaving(true);
    try {
      const supabaseUrl = 'https://yfeqddbvvhioyllkcnca.supabase.co';
      const supabaseKey = 'sb_publishable_wXpZdqfj7wBjJSRREWbMFg_tHT2fUBq';
      
      const tempClient = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: { data: { full_name: newName, role: newRole, allowed_modules: newAllowedModules } }
      });

      if (authError) throw authError;

      setIsAddingUser(false);
      resetCreateForm();
      setTimeout(() => fetchProfiles(), 1500);
      
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: editName, 
          role: editRole,
          allowed_modules: editAllowedModules
        })
        .eq('id', editingProfile.id);

      if (error) throw error;

      setEditingProfile(null);
      await fetchProfiles();
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('TEACHER');
    setNewAllowedModules([AppModule.EBD]);
  };

  const handleDeleteAccess = async (profile: Profile) => {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
      if (error) throw error;
      setProfiles(profiles.filter(p => p.id !== profile.id));
      setDeletingProfile(null);
    } catch (err: any) {
      console.error(err.message);
    }
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-black uppercase text-[10px]">Sincronizando...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800">Controle de Acessos</h2>
            <p className="text-sm text-slate-500">Gerencie usuários e cargos.</p>
          </div>
          <button 
            onClick={() => setIsAddingUser(true)} 
            className="bg-indigo-600 text-white px-6 py-4 rounded-2xl text-xs font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
            NOVO ACESSO
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                <th className="px-8 py-5">Nome / E-mail</th>
                <th className="px-8 py-5">Cargo</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map(profile => (
                <tr key={profile.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="font-bold text-slate-700">{profile.full_name || 'Usuário Sem Nome'}</p>
                    <p className="text-xs text-slate-400">{profile.email}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                      profile.role === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {profile.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingProfile(profile);
                          setEditName(profile.full_name || '');
                          setEditRole(profile.role);
                          setEditAllowedModules(profile.allowed_modules || []);
                        }} 
                        className="text-indigo-600 font-black text-[10px] uppercase hover:underline"
                      >
                        Editar
                      </button>
                      <button onClick={() => setDeletingProfile(profile)} className="text-red-500 font-black text-[10px] uppercase hover:underline">Remover</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-10 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-800 mb-6 uppercase tracking-tighter">Criar Novo Acesso</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500" placeholder="Nome do Professor" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500" placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500" placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value as UserRole)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all">
                  <option value="TEACHER">Professor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Módulos Permitidos</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: AppModule.EBD, label: 'EBD Manager Pro' },
                    { id: AppModule.FINANCIAL, label: 'Tesouraria' },
                    { id: AppModule.MEMBERS, label: 'Membrezia (Secretaria)' },
                    { id: AppModule.MISSIONS, label: 'Missões' },
                    { id: AppModule.CONFIG, label: 'Configurações' }
                  ].map(module => (
                    <label key={module.id} className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={newAllowedModules.includes(module.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewAllowedModules([...newAllowedModules, module.id]);
                          } else {
                            setNewAllowedModules(newAllowedModules.filter(m => m !== module.id));
                          }
                        }}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-bold text-slate-700">{module.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setIsAddingUser(false)} className="flex-1 py-4 text-slate-500 font-black text-xs uppercase hover:bg-slate-50 rounded-2xl">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700">
                  {saving ? 'PROCESSANDO...' : 'CRIAR ACESSO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Remoção de Acesso */}
      {deletingProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Remover Acesso</h3>
            <p className="text-slate-500 mb-8 font-medium text-sm">Deseja remover permanentemente o acesso de <b>{deletingProfile.full_name}</b>?</p>
            <div className="flex gap-4">
              <button onClick={() => setDeletingProfile(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs">CANCELAR</button>
              <button onClick={() => handleDeleteAccess(deletingProfile)} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-xs">REMOVER</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-10 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-800 mb-6 uppercase tracking-tighter">Editar Acesso</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value as UserRole)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all">
                  <option value="TEACHER">Professor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Módulos Permitidos</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: AppModule.EBD, label: 'EBD Manager Pro' },
                    { id: AppModule.FINANCIAL, label: 'Tesouraria' },
                    { id: AppModule.MEMBERS, label: 'Membrezia (Secretaria)' },
                    { id: AppModule.MISSIONS, label: 'Missões' },
                    { id: AppModule.CONFIG, label: 'Configurações' }
                  ].map(module => (
                    <label key={module.id} className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={editAllowedModules.includes(module.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditAllowedModules([...editAllowedModules, module.id]);
                          } else {
                            setEditAllowedModules(editAllowedModules.filter(m => m !== module.id));
                          }
                        }}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-bold text-slate-700">{module.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setEditingProfile(null)} className="flex-1 py-4 text-slate-500 font-black text-xs uppercase hover:bg-slate-50 rounded-2xl">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700">
                  {saving ? 'SALVANDO...' : 'SALVAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
