
import React, { useState, useEffect } from 'react';
import { CalendarEvent, Class } from '../types';

interface CalendarFormProps {
  classes: Class[];
  onSave: (event: Omit<CalendarEvent, 'id'> & { id?: string }) => void;
  onCancel: () => void;
  editEvent?: CalendarEvent | null;
}

export const CalendarForm: React.FC<CalendarFormProps> = ({ classes, onSave, onCancel, editEvent }) => {
  const [date, setDate] = useState(editEvent?.date || '');
  const [theme, setTheme] = useState(editEvent?.theme || '');
  const [classId, setClassId] = useState(editEvent?.classId || '');
  const [description, setDescription] = useState(editEvent?.description || '');

  useEffect(() => {
    if (editEvent) {
      setDate(editEvent.date);
      setTheme(editEvent.theme);
      setClassId(editEvent.classId || '');
      setDescription(editEvent.description || '');
    }
  }, [editEvent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !theme) {
      alert('Data e Tema são obrigatórios.');
      return;
    }
    onSave({
      id: editEvent?.id,
      date,
      theme,
      classId: classId || undefined,
      description
    });
  };

  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-300">
      <h3 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tighter">
        {editEvent ? 'Editar Aula Agendada' : 'Agendar Nova Aula'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Aula *</label>
            <input 
              type="date" 
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Classe (Opcional)</label>
            <select 
              value={classId}
              onChange={e => setClassId(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">Todas as Classes / Geral</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tema da Lição *</label>
          <input 
            type="text" 
            required
            value={theme}
            onChange={e => setTheme(e.target.value)}
            placeholder="Ex: A Armadura de Deus"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-medium"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações / Descrição</label>
          <textarea 
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Detalhes adicionais sobre a aula..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-medium h-32 resize-none"
          />
        </div>

        <div className="pt-6 flex gap-4">
          <button type="button" onClick={onCancel} className="flex-1 py-4 text-slate-500 font-black text-xs uppercase hover:bg-slate-50 rounded-2xl">Cancelar</button>
          <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700">
            {editEvent ? 'SALVAR ALTERAÇÕES' : 'AGENDAR AULA'}
          </button>
        </div>
      </form>
    </div>
  );
};
