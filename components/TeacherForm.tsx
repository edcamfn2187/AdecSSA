
import React, { useState, useEffect } from 'react';
import { Teacher } from '../types';

interface TeacherFormProps {
  onSave: (teacherData: Omit<Teacher, 'id'> & { id?: string }) => void;
  onCancel: () => void;
  editTeacher?: Teacher | null;
}

export const TeacherForm: React.FC<TeacherFormProps> = ({ onSave, onCancel, editTeacher }) => {
  const [name, setName] = useState(editTeacher?.name || '');
  const [email, setEmail] = useState(editTeacher?.email || '');
  const [birthDate, setBirthDate] = useState(editTeacher?.birthDate || '1980-01-01');

  useEffect(() => {
    if (editTeacher) {
      setName(editTeacher.name);
      setEmail(editTeacher.email || '');
      setBirthDate(editTeacher.birthDate);
    }
  }, [editTeacher]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !birthDate) {
      alert('Nome e Data de Nascimento são obrigatórios.');
      return;
    }
    onSave({
      id: editTeacher?.id,
      name,
      email,
      birthDate
    });
  };

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-800">
            {editTeacher ? 'Editar Professor' : 'Novo Professor'}
          </h3>
          <p className="text-sm text-slate-500 font-medium">Cadastre os líderes das classes bíblicas</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo *</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Prof. Marcos Silva"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Data de Nascimento *</label>
            <input 
              type="date" 
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Contato</label>
          <input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="professor@email.com"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
          />
        </div>

        <div className="pt-6 flex gap-4">
          <button 
            type="button" 
            onClick={onCancel}
            className="flex-1 px-6 py-4 text-slate-600 font-black hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-200"
          >
            CANCELAR
          </button>
          <button 
            type="submit"
            className="flex-1 px-6 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            {editTeacher ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR PROFESSOR'}
          </button>
        </div>
      </form>
    </div>
  );
};
