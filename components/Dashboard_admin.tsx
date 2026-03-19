
import React, { useMemo, useState } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, LabelList
} from 'recharts';
import { AttendanceRecord, Class, Student, ChurchSettings } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardProps {
  records: AttendanceRecord[];
  classes: Class[];
  students: Student[];
  churchSettings: ChurchSettings | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ records, classes, students, churchSettings }) => {
  const [selectedDate, setSelectedDate] = useState<string>('all');

  const activeStudents = useMemo(() => students.filter(s => s.active), [students]);
  const totalEnrolled = activeStudents.length;

  const availableDates = useMemo(() => {
    const dates = records.map(r => r.date);
    return Array.from(new Set(dates)).sort((a, b) => (b as string).localeCompare(a as string));
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (selectedDate === 'all') return records;
    return records.filter(r => r.date === selectedDate);
  }, [selectedDate, records]);

  const classData = useMemo(() => {
    const mappedClasses = classes.map(c => {
      const classRecords = filteredRecords.filter(r => r.classId === c.id);
      const studentsInClass = activeStudents.filter(s => s.classId === c.id);
      const studentsInClassCount = studentsInClass.length;
      const studentIdsInClass = new Set(studentsInClass.map(s => s.id));
      
      const presence = classRecords.reduce((acc, r) => {
        return acc + (r.presentStudentIds?.length || 0);
      }, 0);

      const visitors = classRecords.reduce((acc, r) => acc + (Number(r.visitorCount) || 0), 0);
      const bibles = classRecords.reduce((acc, r) => acc + (Number(r.bibleCount) || 0), 0);
      const magazines = classRecords.reduce((acc, r) => acc + (Number(r.magazineCount) || 0), 0);
      const offeringValue = classRecords.reduce((acc, r) => acc + (Number(r.offeringAmount) || 0), 0);
      
      let absent = 0;
      if (selectedDate === 'all') {
        absent = Math.max(0, (classRecords.length * studentsInClassCount) - presence);
      } else {
        absent = Math.max(0, studentsInClassCount - presence);
      }
      
      return {
        name: c.name,
        enrolled: studentsInClassCount,
        assistance: presence + visitors,
        presence,
        visitors,
        bibles,
        magazines,
        absent,
        offeringValue
      };
    });

    // Ordem personalizada requisitada pelo usuário + tolerância a erros de digitação comuns
    const targetOrder = [
      'joias de cristo',
      'pre adolecentes',
      'pre adolescentes',
      'juniores',
      'vencedores',
      'lirior dos vales',
      'lirios dos vales',
      'debora',
      'mensageiro'
    ];

    const getOrderIndex = (name: string) => {
      const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();
      const index = targetOrder.findIndex(t => {
        const normalizedTarget = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();
        return normalized.includes(normalizedTarget);
      });
      return index === -1 ? 999 : index; // 999 joga as classes que não estão na lista para o final
    };

    return mappedClasses.sort((a, b) => {
      const indexA = getOrderIndex(a.name);
      const indexB = getOrderIndex(b.name);
      
      // Se tiverem índices diferentes (estão na lista ordenada), ordena por ele
      if (indexA !== indexB) {
        return indexA - indexB;
      }
      // Se não, ordena por ordem alfabética entre si
      return a.name.localeCompare(b.name);
    });
  }, [classes, filteredRecords, activeStudents, selectedDate]);

  const stats = useMemo(() => {
    return {
      presence: classData.reduce((acc, c) => acc + c.presence, 0),
      visitors: classData.reduce((acc, c) => acc + c.visitors, 0),
      assistance: classData.reduce((acc, c) => acc + c.assistance, 0),
      offerings: classData.reduce((acc, c) => acc + c.offeringValue, 0),
      bibles: classData.reduce((acc, c) => acc + c.bibles, 0),
      magazines: classData.reduce((acc, c) => acc + c.magazines, 0),
      absent: classData.reduce((acc, c) => acc + c.absent, 0)
    };
  }, [classData]);

  const timelineData = useMemo(() => {
    const sortedRecords = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const groupedByDate: { [date: string]: { total: number } } = {};
    
    sortedRecords.forEach(r => {
      if (!groupedByDate[r.date]) groupedByDate[r.date] = { total: 0 };
      groupedByDate[r.date].total += (r.presentStudentIds?.length || 0) + (r.visitorCount || 0);
    });

    return Object.keys(groupedByDate).map(date => ({
      date: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      assistência: groupedByDate[date].total,
      capacidade: totalEnrolled
    })).slice(-12);
  }, [records, totalEnrolled]);

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    
    let textStartX = 14;
    if (churchSettings?.logo_url) {
      try {
        doc.addImage(churchSettings.logo_url, 'PNG', 14, 10, 15, 15);
        textStartX = 32;
      } catch (e) { console.warn("Erro logo PDF"); }
    }

    doc.setFontSize(16);
    doc.setTextColor(110, 41, 94);
    doc.setFont('helvetica', 'bold');
    doc.text(churchSettings?.name.toUpperCase() || 'EBD MANAGER PRO', textStartX, 17);
    
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`RELATÓRIO CONSOLIDADO DE GESTÃO`, textStartX, 23);
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    
    const periodLabel = selectedDate === 'all' 
      ? 'HISTÓRICO ACUMULADO GERAL' 
      : `DATA DA LIÇÃO: ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    
    doc.text(periodLabel, 14, 32);
    doc.line(14, 34, 196, 34);

    let currentY = 42;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO GERAL (CARDS)', 14, currentY);
    currentY += 6;

    const cardWidth = 43;
    const cardHeight = 16;
    const gapX = 3.3;
    const gapY = 5;
    const startX = 14;

    const cardsData = [
      { label: 'MATRICULADOS', value: totalEnrolled.toString() },
      { label: 'PRESENÇAS', value: stats.presence.toString() },
      { label: 'AUSENTES', value: stats.absent.toString() },
      { label: 'VISITANTES', value: stats.visitors.toString() },
      { label: 'ASSISTÊNCIA', value: stats.assistance.toString() },
      { label: 'BÍBLIAS', value: stats.bibles.toString() },
      { label: 'REVISTAS', value: stats.magazines.toString() },
      { label: 'OFERTAS', value: stats.offerings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
    ];

    cardsData.forEach((card, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = startX + (cardWidth + gapX) * col;
      const y = currentY + (cardHeight + gapY) * row;

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text(card.label, x + 3, y + 6);

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(card.value, x + 3, y + 13);
    });

    currentY += (cardHeight * 2) + gapY + 12;

    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(selectedDate === 'all' ? 'RESUMO CONSOLIDADO POR CLASSE' : 'DETALHAMENTO DA AULA', 14, currentY);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Classe', 'Matr.', 'Pres.', 'Ause.', 'Vis.', 'T. Asst.', 'Bíb.', 'Rev.', 'Oferta']],
      body: classData.map(c => [
        c.name, 
        c.enrolled, 
        c.presence,        
        c.absent,
        c.visitors,
        c.assistance,
        c.bibles, 
        c.magazines,
        c.offeringValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ]),
      headStyles: { fillColor: [110, 41, 94], fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        8: { halign: 'right' }
      }
    });

    doc.save(`consolidado_ebd_${selectedDate}.pdf`);
  };

  const metricCards = [
    { label: 'Matriculados', value: totalEnrolled, color: 'bg-slate-900 text-white' },
    { label: 'Presenças', value: stats.presence, color: 'bg-blue-600 text-white' },    
    { label: 'Ausentes', value: stats.absent, color: 'bg-red-50 text-red-600 border-red-100' },
    { label: 'Visitantes', value: stats.visitors, color: 'bg-pink-500 text-white' },
    { label: 'Total Assis.', value: stats.assistance, color: 'bg-[#6e295e] text-white' },
    { label: 'Bíblias', value: stats.bibles, color: 'bg-amber-500 text-white' },
    { label: 'Revistas', value: stats.magazines, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    { label: 'Ofertas', value: stats.offerings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: 'bg-emerald-600 text-white' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1 w-full md:w-auto">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Filtrar por Aula Específica</label>
          <div className="relative w-full md:w-80">
            <select 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#6e295e]/10 focus:border-[#6e295e] font-bold text-slate-700 appearance-none cursor-pointer pr-12 transition-all"
            >
              <option value="all">📊 Todas as Lições Registradas</option>
              {availableDates.map(date => (
                <option key={date} value={date}>
                  📅 {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
        

        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={handleGeneratePDF} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-xl hover:bg-slate-800 transition-all uppercase tracking-widest">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            PDF Consolidado
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        {metricCards.map((stat, i) => (
          <div key={i} className={`${stat.color} p-4 rounded-[24px] shadow-lg shadow-slate-200/50 flex flex-col justify-between min-h-[100px] transition-all hover:scale-[1.03] hover:shadow-xl`}>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 leading-tight">{stat.label}</p>
            <p className="text-lg md:text-xl font-black truncate">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
              {selectedDate === 'all' ? 'Resumo Consolidado por Classe' : `Detalhamento da Aula: ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}`}
            </h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/30">
                        <th className="px-8 py-5">Classe</th>
                        <th className="px-4 py-5 text-center">Matric.</th>
                        <th className="px-4 py-5 text-center">Present.</th>
                        <th className="px-4 py-5 text-center">Ausent.</th>
                        <th className="px-4 py-5 text-center">Visitas.</th>
                        <th className="px-4 py-5 text-center">Assist.</th>
                        <th className="px-4 py-5 text-center">Bíblias</th>
                        <th className="px-4 py-5 text-center">Revistas</th>
                        <th className="px-8 py-5 text-right">Ofertas</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {classData.map((data, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-8 py-5 font-black text-slate-800 uppercase tracking-tight text-sm">{data.name}</td>
                            <td className="px-4 py-5 text-center font-black text-[#6e295e] bg-purple-50/20">{data.enrolled}</td>
                            <td className="px-4 py-5 text-center font-black text-[#6e295e] bg-purple-50/20">{data.presence}</td>
                            <td className="px-4 py-5 text-center font-black text-[#6e295e] bg-purple-50/20">{data.absent}</td>
                            <td className="px-4 py-5 text-center font-black text-[#6e295e] bg-purple-50/20">{data.visitors}</td>
                            <td className="px-4 py-5 text-center font-black text-[#6e295e] bg-purple-50/20">{data.assistance}</td>
                            <td className="px-4 py-5 text-center font-black text-[#6e295e] bg-purple-50/20">{data.bibles}</td>
                            <td className="px-4 py-5 text-center font-black text-[#6e295e] bg-purple-50/20">{data.magazines}</td>
                            <td className="px-8 py-5 text-right font-black text-emerald-600">{data.offeringValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-[40px] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Histórico de Engajamento</h3>
            <p className="text-sm text-slate-400 font-medium">Frequência total vs. capacidade (Últimas 13 aulas).</p>
          </div>
          <div className="flex gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 px-3">
              <div className="w-3 h-3 rounded-full bg-[#6e295e]"></div>
              <span className="text-[10px] font-black text-slate-500 uppercase">Assistência</span>
            </div>
            <div className="flex items-center gap-2 px-3">
              <div className="w-3 h-0.5 bg-slate-300 border-t-2 border-dashed border-slate-400"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase">Matriculados</span>
            </div>
          </div>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
              <Tooltip 
                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}
              />
              <Line 
                type="monotone" 
                dataKey="assistência" 
                stroke="#6e295e" 
                strokeWidth={5} 
                dot={{ r: 6, fill: '#6e295e', strokeWidth: 3, stroke: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 0 }}
                animationDuration={2000}
              >
                <LabelList dataKey="assistência" position="top" offset={15} style={{ fontSize: '11px', fontWeight: '900', fill: '#6e295e' }} />
              </Line>
              <Line type="step" dataKey="capacidade" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="8 8" dot={false} name="Meta Matriculados" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
