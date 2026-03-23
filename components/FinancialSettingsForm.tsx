import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { ChurchSettings } from '../types';

interface FinancialSettingsFormProps {
  onSave: () => void;
}

export const FinancialSettingsForm: React.FC<FinancialSettingsFormProps> = ({ onSave }) => {
  const [settings, setSettings] = useState<ChurchSettings>({
    id: '',
    name: '',
    pastor: '',
    secretary: '',
    superintendent: '',
    address: '',
    footer_text: '',
    logo_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.get('church_settings');
      if (data && data.length > 0) setSettings(data[0]);
    } catch (err: any) {
      console.error('Erro ao carregar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'A logo deve ter no máximo 1MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Keep existing EBD fields intact
      const payload = {
        name: settings.name,
        pastor: settings.pastor,
        address: settings.address,
        footer_text: settings.footer_text,
        logo_url: settings.logo_url
      };

      if (settings.id) {
        await api.put('church_settings', settings.id, payload);
      } else {
        await api.post('church_settings', {
          ...payload,
          secretary: '',
          superintendent: ''
        });
      }
      
      setMessage({ type: 'success', text: 'Configurações atualizadas com sucesso!' });
      onSave();
      fetchSettings();
    } catch (err: any) {
      console.error('Erro API:', err);
      setMessage({ 
        type: 'error', 
        text: `Erro ao salvar: ${err.message}` 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-black uppercase text-[10px]">Sincronizando...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white p-6 md:p-12 rounded-[40px] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-8 mb-12 pb-10 border-b border-slate-100 text-center md:text-left">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-32 h-32 bg-slate-100 rounded-[32px] flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200 group-hover:border-emerald-500 transition-all shadow-inner">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo Preview" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              )}
              <div className="absolute inset-0 bg-emerald-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-black text-[10px] uppercase">Alterar Logo</div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
          
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight leading-tight">Configurações da Tesouraria</h2>
            <p className="text-[11px] text-slate-400 font-bold max-w-md">Defina os dados oficiais da igreja que aparecerão nos relatórios financeiros.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {message && (
            <div className={`p-6 rounded-3xl text-sm font-bold border animate-in zoom-in-95 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Congregação / Igreja</label>
            <input type="text" required value={settings.name} onChange={e => setSettings({ ...settings, name: e.target.value })} placeholder="Ex: AD Ministério Sede" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pastor Titular / Presidente</label>
            <input type="text" value={settings.pastor || ''} onChange={e => setSettings({ ...settings, pastor: e.target.value })} placeholder="Nome do Pastor" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
            <input type="text" value={settings.address || ''} onChange={e => setSettings({ ...settings, address: e.target.value })} placeholder="Rua, Número, Bairro - Cidade/UF" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rodapé dos Relatórios PDF</label>
            <textarea value={settings.footer_text || ''} onChange={e => setSettings({ ...settings, footer_text: e.target.value })} placeholder="Informações que aparecerão na base dos relatórios..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium text-slate-600 h-24 resize-none" />
          </div>

          <button type="submit" disabled={saving} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs">
            {saving ? 'SALVANDO DADOS...' : 'SALVAR CONFIGURAÇÕES'}
          </button>
        </form>
      </div>
    </div>
  );
};
