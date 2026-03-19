
import React, { useMemo } from 'react';
import { AttendanceRecord, Class } from '../types';

interface ReportHistoryProps {
  records: AttendanceRecord[];
  classes: Class[];
  onEdit: (record: AttendanceRecord) => void;
  onDelete: (id: string) => void;
  isAdmin?: boolean;
}

export const ReportHistory: React.FC<ReportHistoryProps> = ({ records, classes, onEdit, onDelete, isAdmin }) => {
  
  // Agrupamento por mês e depois por data (idêntico ao LessonCalendar)
  const groupedByMonthAndDate = useMemo(() => {
    const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const monthGroups: { [month: string]: { [date: string]: AttendanceRecord[] } } = {};
    
    sorted.forEach(record => {
      // record.date já vem como YYYY-MM-DD
      const dateObj = new Date(record.date + 'T00:00:00');
      const monthYear = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
      
      if (!monthGroups[capitalizedMonth]) {
        monthGroups[capitalizedMonth] = {};
      }
      
      if (!monthGroups[capitalizedMonth][record.date]) {
        monthGroups[capitalizedMonth][record.date] = [];
      }
      
      monthGroups[capitalizedMonth][record.date].push(record);
    });
    
    return monthGroups;
  }, [records]);

  const months = Object.keys(groupedByMonthAndDate);

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-20 text-center border border-slate-200">
        <div className="text-slate-300 mb-4 italic font-medium">Nenhum lançamento histórico encontrado.</div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      {months.map(month => (
        <div key={month} className="space-y-6">
          {/* Divisor de Mês */}
          <div className="flex items-center gap-4 px-4">
            <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] whitespace-nowrap">{month}</h3>
            <div className="h-px w-full bg-slate-200"></div>
          </div>

          <div className="space-y-4">
            {Object.keys(groupedByMonthAndDate[month]).sort((a, b) => b.localeCompare(a)).map(dateStr => {
              const dayRecords = groupedByMonthAndDate[month][dateStr];
              const eventDate = new Date(dateStr + 'T00:00:00');

              return (
                <div 
                  key={dateStr} 
                  className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col md:flex-row"
                >
                  {/* Indicador de Data Lateral */}
                  <div className="bg-slate-50 md:w-32 flex flex-row md:flex-col items-center justify-center p-4 md:p-6 border-b md:border-b-0 md:border-r border-slate-100 shrink-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{eventDate.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                    <span className="text-3xl font-black text-slate-800 leading-none ml-2 md:ml-0 md:mt-1">{eventDate.getDate()}</span>
                  </div>

                  {/* Tabela de Lançamentos do Dia */}
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/30">
                          <th className="px-8 py-4 min-w-[200px]">Classe / Tema</th>
                          <th className="px-4 py-4 text-center w-24">Asst.</th>
                          <th className="px-4 py-4 text-center w-20">Rev.</th>
                          <th className="px-4 py-4 text-center w-32">Oferta</th>
                          <th className="px-8 py-4 text-right w-32">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {dayRecords.map(record => {
                          const classInfo = classes.find(c => c.id === record.classId);
                          const assistance = (record.presentStudentIds?.length || 0) + (record.visitorCount || 0);
                          
                          return (
                            <tr key={record.id} className="group hover:bg-indigo-50/30 transition-colors">
                              <td className="px-8 py-5">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-indigo-600 uppercase mb-0.5">{classInfo?.name || 'Geral'}</span>
                                  <span className="text-sm font-bold text-slate-700 tracking-tight leading-tight">{record.lessonTheme}</span>
                                </div>
                              </td>
                              <td className="px-4 py-5 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-black text-[11px] shadow-sm">
                                    {assistance}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase whitespace-nowrap">P:{record.presentStudentIds?.length || 0} V:{record.visitorCount || 0}</span>
                                </div>
                              </td>
                              <td className="px-4 py-5 text-center">
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 font-black text-[11px]">
                                  {record.magazineCount || 0}
                                </span>
                              </td>
                              <td className="px-4 py-5 text-center">
                                <span className="font-bold text-slate-600 text-xs whitespace-nowrap">
                                  {record.offeringAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-right">
                                <div className="flex justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => onEdit(record)} 
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm transition-all"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                  </button>
                                  {isAdmin && (
                                    <button 
                                      onClick={() => onDelete(record.id)} 
                                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl shadow-sm transition-all"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
