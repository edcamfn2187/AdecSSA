
import React, { useMemo } from 'react';
import { TeacherAttendanceRecord } from '../types';

interface TeacherAttendanceHistoryProps {
  records: TeacherAttendanceRecord[];
  onEdit: (date: string) => void;
  onDelete: (id: string) => void;
}

export const TeacherAttendanceHistory: React.FC<TeacherAttendanceHistoryProps> = ({ records, onEdit, onDelete }) => {
  
  const groupedByMonth = useMemo(() => {
    const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const groups: { [key: string]: TeacherAttendanceRecord[] } = {};
    
    sorted.forEach(record => {
      const dateObj = new Date(record.date + 'T00:00:00');
      const monthYear = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalized = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
      
      if (!groups[capitalized]) groups[capitalized] = [];
      groups[capitalized].push(record);
    });
    
    return groups;
  }, [records]);

  const months = Object.keys(groupedByMonth);

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-[32px] p-20 text-center border border-slate-200 border-dashed animate-in fade-in duration-500">
        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest italic">Nenhum histórico de chamada de professores encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-4xl mx-auto pb-20">
      {months.map(month => (
        <div key={month} className="space-y-6">
          <div className="flex items-center gap-4 px-4">
            <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] whitespace-nowrap">{month}</h3>
            <div className="h-px w-full bg-slate-200"></div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {groupedByMonth[month].map(record => {
              const eventDate = new Date(record.date + 'T00:00:00');
              const presencesCount = record.presentTeacherIds?.length || 0;

              return (
                <div 
                  key={record.id} 
                  className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col md:flex-row group"
                >
                  <div className="bg-slate-50 md:w-28 flex flex-row md:flex-col items-center justify-center p-4 md:p-6 border-b md:border-b-0 md:border-r border-slate-100 shrink-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{eventDate.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                    <span className="text-3xl font-black text-slate-800 leading-none ml-2 md:ml-0 md:mt-1">{eventDate.getDate()}</span>
                  </div>

                  <div className="flex-1 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left flex-1 min-w-0">
                      <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                        <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-sm">
                          {presencesCount} LÍDERES PRESENTES
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chamada Ministerial</span>
                      </div>
                      {record.observations && (
                        <p className="mt-3 text-slate-500 text-xs font-medium italic line-clamp-2 border-l-2 border-slate-100 pl-3">
                          "{record.observations}"
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(record.date)} 
                        className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm"
                        title="Corrigir Chamada"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      </button>
                      <button 
                        onClick={() => onDelete(record.id)} 
                        className="p-3 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-sm"
                        title="Excluir Registro"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
