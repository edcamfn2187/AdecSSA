
import React, { useState, useEffect } from 'react';
import { Class, Teacher } from '../types';

interface ClassFormProps {
  teachers: Teacher[];
  onSave: (classData: Omit<Class, 'id'> & { id?: string }) => void;
  onCancel: () => void;
  editClass?: Class | null;
}

export const ClassForm: React.FC<ClassFormProps> = ({ teachers, onSave, onCancel, editClass }) => {
  const [name, setName] = useState(editClass?.name || '');
  const [description, setDescription] = useState(editClass?.description || '');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>(editClass?.teachers || []);

  useEffect(() => {
    if (editClass) {
      setName(editClass.name);
      setDescription(editClass.description || '');
      setSelectedTeachers(editClass.teachers || []);
    }
  }, [editClass]);

  const toggleTeacher = (teacherName: string) => {
    setSelectedTeachers(prev => 
      prev.includes(teacherName) 
        ? prev.filter(t => t !== teacherName) 
        : [...prev, teacherName]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert('O nome da classe é obrigatório.');
      return;
    }
    if (selectedTeachers.length === 0) {
      alert('Selecione pelo menos um professor.');
      return;
    }
    onSave({
      id: editClass?.id,
      name,
      description,
      teachers: selectedTeachers
    });
  };

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200">
      <h3 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tighter">
        {editClass ? 'Editar Classe' : 'Criar Nova Classe'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Classe *</label>
          <input 
            type="text" 
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Adolescentes, Discipulado..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição / Faixa Etária</label>
          <textarea 
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Detalhes adicionais ou faixa etária da classe..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium resize-none h-24"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Professores Responsáveis *</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 max-h-60 overflow-y-auto custom-scrollbar">
            {teachers.map(t => (
              <label 
                key={t.id} 
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedTeachers.includes(t.name) 
                    ? 'bg-white border-indigo-200 shadow-sm' 
                    : 'bg-transparent border-transparent hover:bg-white/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  selectedTeachers.includes(t.name) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
                }`}>
                  {selectedTeachers.includes(t.name) && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                  )}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={selectedTeachers.includes(t.name)}
                  onChange={() => toggleTeacher(t.name)}
                />
                <span className={`text-sm font-bold ${selectedTeachers.includes(t.name) ? 'text-slate-800' : 'text-slate-500'}`}>
                  {t.name}
                </span>
              </label>
            ))}
            {!teachers.length && (
              <div className="col-span-full py-4 text-center text-xs text-slate-400 italic">
                Nenhum professor cadastrado no sistema.
              </div>
            )}
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
            {editClass ? 'SALVAR ALTERAÇÕES' : 'CRIAR CLASSE'}
          </button>
        </div>
      </form>
    </div>
  );
};
