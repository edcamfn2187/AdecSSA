
import React, { useMemo, useState } from 'react';
import { CalendarEvent, Class } from '../types';

interface LessonCalendarProps {
  events: CalendarEvent[];
  classes: Class[];
  isAdmin: boolean;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onAdd: (defaultDate?: string) => void;
}

export const LessonCalendar: React.FC<LessonCalendarProps> = ({ events, classes, isAdmin, onEdit, onDelete, onAdd }) => {
  const [expandedDates, setExpandedDates] = useState<string[]>([]);

  // Ordenar e agrupar eventos por mês e depois por data
  const groupedByMonthAndDate = useMemo(() => {
    const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const monthGroups: { [month: string]: { [date: string]: CalendarEvent[] } } = {};
    
    sorted.forEach(event => {
      const dateObj = new Date(event.date + 'T00:00:00');
      const monthYear = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
      
      if (!monthGroups[capitalizedMonth]) {
        monthGroups[capitalizedMonth] = {};
      }
      
      if (!monthGroups[capitalizedMonth][event.date]) {
        monthGroups[capitalizedMonth][event.date] = [];
      }
      
      monthGroups[capitalizedMonth][event.date].push(event);
    });
    
    return monthGroups;
  }, [events]);

  const toggleDate = (dateStr: string) => {
    setExpandedDates(prev => 
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const months = Object.keys(groupedByMonthAndDate);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      {/* HEADER E AÇÃO */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Plano de Ensino</h2>
          <p className="text-slate-500 text-sm font-medium">Cronograma completo das lições bíblicas.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => onAdd()}
            className="px-6 py-3 bg-indigo-600 text-white font-black rounded-xl text-xs uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            + AGENDAR NOVA LIÇÃO
          </button>
        )}
      </div>

      {/* LISTAGEM SEQUENCIAL AGRUPADA POR DATA */}
      {months.length === 0 ? (
        <div className="bg-white/50 p-16 rounded-[40px] border-4 border-dashed border-slate-200 text-center">
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhuma lição cadastrada no currículo</p>
        </div>
      ) : (
        <div className="space-y-8 pb-10">
          {months.map(month => (
            <div key={month} className="space-y-4">
              <div className="flex items-center gap-4 px-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">{month}</h3>
                <div className="h-px w-full bg-slate-200"></div>
              </div>

              <div className="space-y-3">
                {Object.keys(groupedByMonthAndDate[month]).map(dateStr => {
                  const dayEvents = groupedByMonthAndDate[month][dateStr];
                  const eventDate = new Date(dateStr + 'T00:00:00');
                  const isToday = dateStr === today;
                  const isPast = dateStr < today;
                  const isExpanded = expandedDates.includes(dateStr);

                  return (
                    <div 
                      key={dateStr} 
                      className={`group rounded-[28px] border transition-all duration-300 ${
                        isToday 
                          ? 'bg-white border-indigo-500 ring-2 ring-indigo-50 shadow-xl' 
                          : isPast
                            ? 'bg-slate-50/50 border-slate-100 opacity-80'
                            : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm'
                      }`}
                    >
                      {/* HEADER DO CARD (DATA E RESUMO) */}
                      <button 
                        onClick={() => toggleDate(dateStr)}
                        className="w-full flex items-center gap-4 p-4 text-left outline-none"
                      >
                        {/* BLOCO DE DATA */}
                        <div className={`flex flex-col items-center justify-center rounded-2xl p-2 min-w-[70px] h-fit border shrink-0 transition-colors ${
                          isToday ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                          <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${isToday ? 'text-indigo-100' : 'text-slate-400'}`}>
                            {eventDate.toLocaleDateString('pt-BR', { weekday: 'short' })}
                          </span>
                          <span className={`text-xl font-black leading-none mt-1 ${isToday ? 'text-white' : 'text-slate-600'}`}>
                            {eventDate.getDate()}
                          </span>
                        </div>

                        {/* INFO RESUMIDA */}
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2">
                             <h4 className={`text-base font-black uppercase tracking-tight truncate ${isPast ? 'text-slate-400' : 'text-slate-700'}`}>
                               {dayEvents.length === 1 ? dayEvents[0].theme : `${dayEvents.length} Lições Agendadas`}
                             </h4>
                             {isToday && (
                               <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[8px] font-black uppercase tracking-widest shrink-0">
                                 Hoje
                               </span>
                             )}
                           </div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                             {dayEvents.length === 1 
                               ? (classes.find(c => c.id === dayEvents[0].classId)?.name || 'Geral')
                               : `${dayEvents.map(e => classes.find(c => c.id === e.classId)?.name || 'Geral').join(', ')}`}
                           </p>
                        </div>

                        {/* ÍCONE DE EXPANSÃO */}
                        <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-indigo-50 text-indigo-600' : 'text-slate-300 group-hover:bg-slate-50'}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </button>

                      {/* CONTEÚDO EXPANSÍVEL (LISTA DE LIÇÕES) */}
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-2 duration-300 border-t border-slate-50">
                          <div className="space-y-6">
                            {dayEvents.map((event, idx) => {
                              const classInfo = classes.find(c => c.id === event.classId);
                              return (
                                <div key={event.id} className={`relative group/item ${idx !== dayEvents.length - 1 ? 'pb-6 border-b border-slate-100' : ''}`}>
                                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div className="space-y-2 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                          isPast ? 'bg-slate-200 text-slate-500' : (classInfo ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500')
                                        }`}>
                                          {classInfo?.name || 'Geral'}
                                        </span>
                                      </div>
                                      
                                      <h4 className={`text-lg font-black uppercase tracking-tight leading-tight transition-colors ${
                                        isPast ? 'text-slate-400' : 'text-slate-800'
                                      }`}>
                                        {event.theme}
                                      </h4>
                                      
                                      {event.description && (
                                        <p className="text-slate-400 text-xs font-medium italic border-l-2 border-slate-100 pl-3 py-0.5">
                                          {event.description}
                                        </p>
                                      )}
                                    </div>

                                    {/* AÇÕES INDIVIDUAIS */}
                                    <div className="flex gap-1.5 shrink-0">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                                        className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                        title="Editar"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                        </svg>
                                      </button>
                                      {isAdmin && (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
                                          className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                          title="Excluir"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-indigo-50 p-4 rounded-[24px] border border-indigo-100 text-center">
        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">
          Total de {events.length} lições agendadas no currículo.
        </p>
      </div>
    </div>
  );
};
