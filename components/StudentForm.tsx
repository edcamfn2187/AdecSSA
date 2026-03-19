
import React, { useState, useEffect } from 'react';
import { Student, Class } from '../types';

interface StudentFormProps {
  classes: Class[];
  onSave: (studentData: Omit<Student, 'id'> & { id?: string }) => void;
  onCancel: () => void;
  editStudent?: Student | null;
  defaultClassId?: string | null;
}

export const StudentForm: React.FC<StudentFormProps> = ({ 
  classes, 
  onSave, 
  onCancel, 
  editStudent,
  defaultClassId 
}) => {
  const [name, setName] = useState(editStudent?.name || '');
  const [classId, setClassId] = useState(editStudent?.classId || defaultClassId || classes[0]?.id || '');
  const [birthDate, setBirthDate] = useState(editStudent?.birthDate || '2010-01-01');
  const [active, setActive] = useState(editStudent?.active ?? true);

  useEffect(() => {
    if (defaultClassId && !editStudent) {
      setClassId(defaultClassId);
    }
  }, [defaultClassId, editStudent]);

  useEffect(() => {
    if (editStudent) {
      setName(editStudent.name);
      setClassId(editStudent.classId);
      setBirthDate(editStudent.birthDate);
      setActive(editStudent.active);
    }
  }, [editStudent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !classId) {
      alert('Nome e Classe são campos obrigatórios.');
      return;
    }
    onSave({
      id: editStudent?.id,
      name,
      classId,
      birthDate,
      active
    });
  };

  const isRestricted = !!defaultClassId && !editStudent;

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-800">
            {editStudent ? 'Editar Aluno' : 'Novo Aluno'}
          </h3>
          <p className="text-sm text-slate-500 font-medium">Preencha os dados do estudante abaixo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo *</label>
          <input 
            type="text" 
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Gabriel Souza"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Classe Vinculada *</label>
            <select 
              value={classId}
              onChange={e => setClassId(e.target.value)}
              disabled={isRestricted}
              className={`w-full p-4 border border-slate-200 rounded-2xl outline-none transition-all font-medium ${isRestricted ? 'bg-slate-100 cursor-not-allowed text-slate-400' : 'bg-slate-50 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500'}`}
            >
              <option value="" disabled>Selecione uma classe</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Data de Nascimento</label>
            <input 
              type="date" 
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
            />
          </div>
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
            {editStudent ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR ALUNO'}
          </button>
        </div>
      </form>
    </div>
  );
};
