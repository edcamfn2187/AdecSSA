
import React, { useMemo, useState } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Line, LineChart, LabelList
} from 'recharts';
import { AttendanceRecord, Class, Student, ChurchSettings } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardProps {
  records: AttendanceRecord[];
  classes: Class[];
  students: Student[];
  churchSettings: ChurchSettings | null;
  isTeacherView?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ records, classes, students, churchSettings, isTeacherView }) => {
  const [selectedDate, setSelectedDate] = useState<string>('all');

  const isSingleClass = classes.length === 1;
  const targetClass = isSingleClass ? classes[0] : null;

  const availableDates = useMemo(() => {
    const dates = records.map(r => r.date);
    // Fix: Cast a and b to string to resolve 'unknown' type error for localeCompare
    return Array.from(new Set(dates)).sort((a, b) => (b as string).localeCompare(a as string));
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (selectedDate === 'all') return records;
    return records.filter(r => r.date === selectedDate);
  }, [selectedDate, records]);

  const activeStudentsInView = useMemo(() => students.filter(s => s.active), [students]);
  
  const statsValues = useMemo(() => {
    const presence = filteredRecords.reduce((acc, r) => acc + (r.presentStudentIds?.length || 0), 0);
    const bibles = filteredRecords.reduce((acc, r) => acc + (Number(r.bibleCount) || 0), 0);
    const magazines = filteredRecords.reduce((acc, r) => acc + (Number(r.magazineCount) || 0), 0);
    const visitors = filteredRecords.reduce((acc, r) => acc + (Number(r.visitorCount) || 0), 0);
    const offering = filteredRecords.reduce((acc, r) => acc + (Number(r.offeringAmount) || 0), 0);
    
    // Cálculo rigoroso de faltas para o professor
    let totalAbsent = 0;
    if (selectedDate === 'all') {
      totalAbsent = classes.reduce((classAcc, c) => {
        const classRecs = filteredRecords.filter(r => r.classId === c.id);
        const studentsInClassCount = activeStudentsInView.filter(s => s.classId === c.id).length;
        const classPresence = classRecs.reduce((pAcc, r) => pAcc + (r.presentStudentIds?.length || 0), 0);
        // Faltas = (Aulas dadas * Alunos na classe) - Presenças confirmadas
        return classAcc + Math.max(0, (classRecs.length * studentsInClassCount) - classPresence);
      }, 0);
    } else {
      totalAbsent = classes.reduce((classAcc, c) => {
        const classRecord = filteredRecords.find(r => r.classId === c.id);
        const studentsInClassCount = activeStudentsInView.filter(s => s.classId === c.id).length;
        const classPresence = classRecord?.presentStudentIds?.length || 0;
        return classAcc + Math.max(0, studentsInClassCount - classPresence);
      }, 0);
    }
    
    return {
      presence,
      visitors,
      assistance: presence + visitors,
      offering,
      bibles,
      magazines,
      absent: totalAbsent
    };
  }, [filteredRecords, activeStudentsInView, selectedDate, classes]);

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const className = isSingleClass ? targetClass?.name : 'MINHAS CLASSES';

    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text(churchSettings?.name.toUpperCase() || 'EBD PRO', 14, 22);
    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text(`RELATÓRIO DA CLASSE: ${className || ''}`, 14, 32);
    
    doc.setDrawColor(220);
    doc.line(14, 38, 196, 38);

    doc.setFontSize(10);
    const periodText = selectedDate === 'all' ? 'Histórico Consolidado' : `Aula do dia: ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
    doc.text(`${periodText} | Emitido em ${dateStr}`, 14, 48);

    autoTable(doc, {
      startY: 55,
      head: [['Indicador', 'Valor']],
      body: [
        ['Alunos Matriculados', activeStudentsInView.length.toString()],
        ['Presenças (Alunos)', statsValues.presence.toString()],
        ['Faltas Acumuladas', statsValues.absent.toString()],
        ['Visitantes', statsValues.visitors.toString()],
        ['Assistência Total', statsValues.assistance.toString()],
        ['Ofertas Coletadas', statsValues.offering.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Bíblias Registradas', statsValues.bibles.toString()],
        ['Revistas Registradas', statsValues.magazines.toString()]
      ],
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`relatorio_professor_${dateStr.replace(/\//g, '-')}.pdf`);
  };

  const stats = [
    { label: 'Matriculados', value: activeStudentsInView.length, color: 'bg-slate-900 text-white shadow-slate-200' },
    { label: 'Presenças', value: statsValues.presence, color: 'bg-blue-600 text-white shadow-blue-100' },
    { label: 'Visitantes', value: statsValues.visitors, color: 'bg-pink-500 text-white shadow-pink-100' },
    { label: 'Assistência', value: statsValues.assistance, color: 'bg-[#6e295e] text-white shadow-purple-200' },
    { label: 'Faltas', value: statsValues.absent, color: 'bg-red-50 text-red-600 border-red-100 font-black' },
    { label: 'Bíblias', value: statsValues.bibles, color: 'bg-amber-500 text-white shadow-amber-100' },
    { label: 'Revistas', value: statsValues.magazines, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    { label: 'Ofertas', value: statsValues.offering.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: 'bg-emerald-600 text-white shadow-emerald-100' },
  ];

  const timelineData = useMemo(() => {
    return records
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-12)
      .map(r => ({
        date: new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        assistência: r.presentStudentIds.length + (r.visitorCount || 0),
        capacidade: activeStudentsInView.length
      }));
  }, [records, activeStudentsInView]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden">
        <div className="flex-1 w-full md:w-auto">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Filtrar por Aula</label>
          <div className="relative w-full md:w-80">
            <select 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 appearance-none cursor-pointer pr-12 transition-all shadow-sm"
            >
              <option value="all">📊 Histórico Completo</option>
              {availableDates.map(date => (
                <option key={date} value={date}>
                  📅 {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <button 
          onClick={handleGeneratePDF}
          className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          PDF DA CLASSE
        </button>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <span className="px-4 py-1 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">Resumo de Atividade</span>
          <h2 className="text-4xl font-black text-slate-900 mt-2 tracking-tighter uppercase leading-none">
            {isSingleClass ? targetClass?.name : 'Minhas Classes'}
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            {selectedDate === 'all' 
              ? 'Métricas consolidadas de frequência e engajamento.' 
              : `Resultados da lição ministrada em ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
            }
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className={`p-5 rounded-[28px] border shadow-sm transition-all hover:scale-[1.03] flex flex-col justify-between min-h-[120px] ${stat.color}`}>
            <p className="text-[10px] font-black uppercase tracking-wider opacity-70 mb-1 leading-tight">{stat.label}</p>
            <p className="text-lg md:text-xl font-black truncate leading-none">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm h-full flex flex-col">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Engajamento nas Lições</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assistência</span>
              </div>
            </div>
          </div>
          {/* Altura reduzida para otimizar espaço vertical */}
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                <Line 
                  type="monotone" 
                  dataKey="assistência" 
                  stroke="#6366f1" 
                  strokeWidth={5} 
                  dot={{ r: 6, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }}
                  animationDuration={1500}
                >
                  <LabelList dataKey="assistência" position="top" offset={15} style={{ fontSize: '11px', fontWeight: '900', fill: '#6366f1' }} />
                </Line>
                <Line type="step" dataKey="capacidade" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-6">Alunos da Classe</h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 max-h-[440px]">
            {activeStudentsInView.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-indigo-50 transition-all group">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 text-sm">{s.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {classes.find(c => c.id === s.classId)?.name || 'EBD'}
                  </span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
              </div>
            ))}
            {activeStudentsInView.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                <p className="text-xs font-bold uppercase italic">Nenhum aluno ativo</p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total: {activeStudentsInView.length} alunos</p>
          </div>
        </div>
      </div>
    </div>
  );
};
