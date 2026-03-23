
import React, { useState, useEffect } from 'react';
import { Teacher, TeacherAttendanceRecord } from '../types';
import { api } from '../services/api';

interface TeacherAttendanceFormProps {
  teachers: Teacher[];
  onSaveSuccess: () => void;
  initialDate?: string;
}

export const TeacherAttendanceForm: React.FC<TeacherAttendanceFormProps> = ({ teachers, onSaveSuccess, initialDate }) => {
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState('');
  const [saving, setSaving] = useState(false);

  // Sincroniza a data se ela mudar via props (navegação de histórico)
  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  // Busca se já existe chamada para esta data ao mudar o calendário
  useEffect(() => {
    const fetchExistingRecord = async () => {
      setLoading(true);
      try {
        const data = await api.get('teacher_attendance', { date });

        if (data && data.length > 0) {
          const record = data[0];
          setPresentIds(record.present_teacher_ids || []);
          setObservations(record.observations || '');
        } else {
          setPresentIds([]);
          setObservations('');
        }
      } catch (e) {
        setPresentIds([]);
      } finally {
        setLoading(false);
      }
    };
    fetchExistingRecord();
  }, [date]);

  const toggleTeacher = (id: string) => {
    setPresentIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleMarkAll = () => {
    if (presentIds.length === teachers.length) {
      setPresentIds([]);
    } else {
      setPresentIds(teachers.map(t => t.id));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        date,
        present_teacher_ids: presentIds,
        observations
      };

      await api.upsert('teacher_attendance', payload, 'date');
      
      onSaveSuccess();
    } catch (err: any) {
      alert('Erro ao salvar chamada: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searching.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 pb-8 border-b border-slate-100">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">
              {initialDate ? 'Corrigir Chamada' : 'Chamada de Professores'}
            </h2>
            <p className="text-slate-500 font-medium mt-1">Registre a frequência dos líderes da EBD.</p>
          </div>
          <div className="w-full md:w-auto">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Data do Evento</label>
            <input 
              type="date" 
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full md:w-64 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Pesquisar professor..." 
                value={searching}
                onChange={e => setSearching(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-300 font-medium"
              />
              <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <button 
              onClick={handleMarkAll}
              className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-200 transition-all"
            >
              {presentIds.length === teachers.length ? 'Desmarcar Todos' : 'Marcar Todos'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase text-xs animate-pulse">Carregando registros...</div>
            ) : filteredTeachers.length > 0 ? (
              filteredTeachers.map(teacher => (
                <label 
                  key={teacher.id} 
                  className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer border-2 transition-all group ${
                    presentIds.includes(teacher.id) 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                      : 'bg-white border-slate-100 hover:border-indigo-200 text-slate-700'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm leading-none">{teacher.name}</span>
                    <span className={`text-[9px] font-black uppercase mt-1 ${presentIds.includes(teacher.id) ? 'text-indigo-200' : 'text-slate-400'}`}>Professor(a)</span>
                  </div>
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    presentIds.includes(teacher.id) ? 'bg-white border-white' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {presentIds.includes(teacher.id) && (
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                    )}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={presentIds.includes(teacher.id)} 
                    onChange={() => toggleTeacher(teacher.id)}
                  />
                </label>
              ))
            ) : (
              <div className="col-span-full py-20 text-center text-slate-400 italic">Nenhum professor encontrado.</div>
            )}
          </div>

          <div className="space-y-2 pt-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações da Chamada</label>
            <textarea 
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Ex: Reunião de obreiros, motivo de ausência justificada..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-medium h-24 resize-none"
            />
          </div>

          <div className="pt-6">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
            >
              {saving ? 'SALVANDO...' : 'SALVAR CHAMADA DOS PROFESSORES'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
