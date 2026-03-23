
import React, { useMemo } from 'react';
import { Student, AttendanceRecord } from '../types';

interface StudentDetailModalProps {
  student: Student;
  records: AttendanceRecord[];
  className: string;
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, records, className, onClose }) => {
  const history = useMemo(() => {
    // Pega apenas os registros da classe deste aluno
    return records
      .filter(r => r.classId === student.classId)
      .sort((a, b) => new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime())
      .map(r => ({
        date: r.date,
        theme: r.lessonTheme,
        isPresent: r.presentStudentIds.includes(student.id)
      }));
  }, [student, records]);

  const stats = useMemo(() => {
    const total = history.length;
    const presences = history.filter(h => h.isPresent).length;
    const percentage = total > 0 ? Math.round((presences / total) * 100) : 0;
    return { total, presences, absences: total - presences, percentage };
  }, [history]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-8 bg-[#6e295e] text-white flex justify-between items-start shrink-0">
          <div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">{className}</span>
            <h3 className="text-3xl font-black mt-2 uppercase tracking-tighter leading-none">{student.name}</h3>
            <div className="flex gap-4 mt-3">
              <p className="text-purple-200 text-[10px] font-black uppercase tracking-widest">Nascimento: {new Date(student.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
              <p className="text-purple-200 text-[10px] font-black uppercase tracking-widest">Status: {student.active ? 'Ativo' : 'Inativo'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-8 grid grid-cols-3 gap-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Presenças</p>
            <p className="text-2xl font-black text-indigo-600">{stats.presences}</p>
          </div>
          <div className="text-center border-x border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faltas</p>
            <p className="text-2xl font-black text-red-500">{stats.absences}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frequência</p>
            <p className={`text-2xl font-black ${stats.percentage >= 70 ? 'text-emerald-600' : 'text-amber-500'}`}>{stats.percentage}%</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Histórico de Assiduidade</h4>
          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-purple-200 transition-all">
                <div className="min-w-0 flex-1 pr-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                  <p className="font-bold text-slate-700 truncate text-sm">{h.theme || 'Lição sem tema registrado'}</p>
                </div>
                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                  h.isPresent ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-400 border border-red-100'
                }`}>
                  {h.isPresent ? 'Presente' : 'Ausente'}
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="text-center py-20 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p className="font-bold uppercase text-[10px] tracking-widest italic">Nenhuma aula registrada para este aluno.</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
           <button onClick={onClose} className="px-10 py-3 bg-slate-900 text-white font-black text-[10px] uppercase rounded-xl">Fechar Prontuário</button>
        </div>
      </div>
    </div>
  );
};
