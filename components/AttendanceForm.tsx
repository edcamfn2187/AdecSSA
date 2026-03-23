
import React, { useState, useEffect, useMemo } from 'react';
import { Class, Student, AttendanceRecord, CalendarEvent } from '../types';

interface AttendanceFormProps {
  classes: Class[];
  students: Student[];
  calendarEvents: CalendarEvent[];
  onSave: (record: AttendanceRecord) => void;
  editRecord?: AttendanceRecord | null;
  onCancel?: () => void;
}

export const AttendanceForm: React.FC<AttendanceFormProps> = ({ 
  classes, 
  students, 
  calendarEvents,
  onSave, 
  editRecord,
  onCancel 
}) => {
  const [selectedClassId, setSelectedClassId] = useState(editRecord?.classId || classes[0]?.id || '');
  const [date, setDate] = useState(editRecord?.date || new Date().toISOString().split('T')[0]);
  const [presentIds, setPresentIds] = useState<string[]>(editRecord?.presentStudentIds || []);
  const [bibleCount, setBibleCount] = useState(editRecord?.bibleCount || 0);
  const [magazines, setMagazines] = useState(editRecord?.magazineCount || 0);
  const [visitors, setVisitors] = useState(editRecord?.visitorCount || 0);
  const [offering, setOffering] = useState(editRecord?.offeringAmount || 0);
  const [theme, setTheme] = useState(editRecord?.lessonTheme || '');

  const [offeringDisplay, setOfferingDisplay] = useState('');

  const classLessons = useMemo(() => {
    return calendarEvents
      .filter(e => !e.classId || e.classId === selectedClassId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [calendarEvents, selectedClassId]);

  const lessonForSelectedDate = useMemo(() => {
    return classLessons.find(l => l.date === date);
  }, [classLessons, date]);

  useEffect(() => {
    if (!editRecord) {
      if (lessonForSelectedDate) {
        setTheme(lessonForSelectedDate.theme);
      } else {
        setTheme('');
      }
    }
  }, [selectedClassId, date, lessonForSelectedDate, editRecord]);

  useEffect(() => {
    if (editRecord) {
      setSelectedClassId(editRecord.classId);
      setDate(editRecord.date);
      setPresentIds(editRecord.presentStudentIds);
      setBibleCount(editRecord.bibleCount);
      setMagazines(editRecord.magazineCount);
      setVisitors(editRecord.visitorCount);
      setOffering(editRecord.offeringAmount);
      setTheme(editRecord.lessonTheme);
      setOfferingDisplay(formatCurrencyValue(editRecord.offeringAmount));
    } else {
      setOfferingDisplay('0,00');
    }
  }, [editRecord]);

  const formatCurrencyValue = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleOfferingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); 
    const amount = value === '' ? 0 : parseInt(value) / 100;
    setOffering(amount);
    setOfferingDisplay(formatCurrencyValue(amount));
  };

  // Alunos ordenados em ordem alfabética
  const classStudents = useMemo(() => {
    return students
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClassId]);

  const toggleStudent = (id: string) => {
    setPresentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSave = () => {
    if (!theme) {
      alert('Por favor, insira o tema da lição.');
      return;
    }

    onSave({
      id: editRecord?.id || '',
      classId: selectedClassId,
      date,
      presentStudentIds: presentIds,
      bibleCount: Number(bibleCount) || 0,
      magazineCount: Number(magazines) || 0,
      visitorCount: Number(visitors) || 0,
      offeringAmount: Number(offering) || 0,
      lessonTheme: theme
    });

    if (!editRecord) {
      setPresentIds([]);
      setBibleCount(0);
      setMagazines(0);
      setVisitors(0);
      setOffering(0);
      setOfferingDisplay('0,00');
      setTheme('');
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const formatIsoDate = (isoDate: string) => {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`${editRecord ? 'bg-amber-600' : 'bg-[#6e295e]'} p-6 text-white transition-colors`}>
        <h2 className="text-2xl font-bold">
          {editRecord ? 'Editar Lançamento' : 'Lançar Chamada'}
        </h2>
        <p className="opacity-80 text-sm">
          {editRecord ? `Corrigindo dados do dia ${formatIsoDate(date)}` : 'Informe os dados da aula de hoje'}
        </p>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Data da Aula</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#6e295e]/10 focus:border-[#6e295e] outline-none transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Selecione a Classe</label>
              <select 
                value={selectedClassId} 
                onChange={e => {
                  setSelectedClassId(e.target.value);
                  setPresentIds([]);
                }}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#6e295e]/10 focus:border-[#6e295e] outline-none transition-all font-medium"
                disabled={!!editRecord}
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Escolher Lição Agendada</label>
            <select 
              className="w-full p-4 bg-purple-50/50 border border-purple-100 rounded-2xl focus:ring-4 focus:ring-[#6e295e]/10 focus:border-[#6e295e] outline-none transition-all font-bold text-[#6e295e] appearance-none cursor-pointer"
              onChange={(e) => {
                if (e.target.value) setTheme(e.target.value);
              }}
              value={classLessons.some(l => l.theme === theme) ? theme : ""}
            >
              <option value="">-- Selecione uma lição do calendário --</option>
              {classLessons.map(lesson => {
                const isSelectedDate = lesson.date === date;
                return (
                  <option key={lesson.id} value={lesson.theme}>
                    {isSelectedDate ? '📌 [HOJE] ' : ''}{formatIsoDate(lesson.date)} - {lesson.theme}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Tema Selecionado *</label>
            <input 
              type="text" 
              placeholder="Digite o tema se não estiver na lista..."
              value={theme}
              onChange={e => setTheme(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#6e295e]/10 focus:border-[#6e295e] outline-none transition-all font-bold text-slate-700 uppercase tracking-tight"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bíblias</label>
              <input 
                type="number" 
                inputMode="numeric"
                value={bibleCount === 0 ? '' : bibleCount} 
                onChange={e => setBibleCount(e.target.value === '' ? 0 : Number(e.target.value))} 
                onFocus={handleInputFocus}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#6e295e] font-bold" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revistas</label>
              <input 
                type="number" 
                inputMode="numeric"
                value={magazines === 0 ? '' : magazines} 
                onChange={e => setMagazines(e.target.value === '' ? 0 : Number(e.target.value))} 
                onFocus={handleInputFocus}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#6e295e] font-bold" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visitantes</label>
              <input 
                type="number" 
                inputMode="numeric"
                value={visitors === 0 ? '' : visitors} 
                onChange={e => setVisitors(e.target.value === '' ? 0 : Number(e.target.value))} 
                onFocus={handleInputFocus}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#6e295e] font-bold" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-[#6e295e] uppercase tracking-widest">Oferta (R$)</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={offeringDisplay} 
                onChange={handleOfferingChange}
                onFocus={handleInputFocus}
                placeholder="0,00"
                className="w-full p-3 bg-white border border-purple-200 rounded-xl outline-none focus:border-[#6e295e] font-bold text-[#6e295e] text-right" 
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col h-full border-l border-slate-100 pl-10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Presença ({presentIds.length} de {classStudents.length})</h3>
            <button 
              onClick={() => {
                if (presentIds.length === classStudents.length) setPresentIds([]);
                else setPresentIds(classStudents.map(s => s.id));
              }}
              className="text-[10px] font-black text-[#6e295e] hover:underline uppercase"
            >
              {presentIds.length === classStudents.length ? 'DESMARCAR TODOS' : 'TODOS PRESENTES'}
            </button>
          </div>
          
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[500px] pr-4 custom-scrollbar">
            {classStudents.map(student => (
              <label 
                key={student.id} 
                className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                  presentIds.includes(student.id) 
                    ? 'bg-[#6e295e] border-[#6e295e] text-white shadow-lg shadow-purple-100' 
                    : 'bg-white border-slate-100 text-slate-600 hover:border-purple-200'
                }`}
              >
                <span className="font-bold text-sm tracking-tight">{student.name}</span>
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  presentIds.includes(student.id) ? 'bg-white border-white' : 'bg-slate-50 border-slate-200'
                }`}>
                  {presentIds.includes(student.id) && (
                    <svg className="w-4 h-4 text-[#6e295e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                  )}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={presentIds.includes(student.id)} 
                  onChange={() => toggleStudent(student.id)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="p-10 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-100">
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 bg-[#6e295e] rounded-full animate-pulse"></div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confira os valores e a lista de presença antes de salvar</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button onClick={onCancel} className="flex-1 md:flex-none px-10 py-4 text-slate-500 font-black text-xs uppercase hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
          <button onClick={handleSave} className={`flex-1 md:flex-none px-12 py-4 ${editRecord ? 'bg-amber-600' : 'bg-[#6e295e]'} text-white font-black text-xs uppercase rounded-2xl shadow-xl shadow-purple-100 hover:-translate-y-0.5 active:translate-y-0 transition-all`}>
            {editRecord ? 'ATUALIZAR LANÇAMENTO' : 'SALVAR CHAMADA'}
          </button>
        </div>
      </div>
    </div>
  );
};
