
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, Class, Student, ChurchSettings } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClassReportViewProps {
  records: AttendanceRecord[];
  classes: Class[];
  students: Student[];
  churchSettings: ChurchSettings | null;
}

export const ClassReportView: React.FC<ClassReportViewProps> = ({ records, classes, students, churchSettings }) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'lessons' | 'students'>('lessons');

  const classInfo = useMemo(() => classes.find(c => c.id === selectedClassId), [selectedClassId, classes]);
  
  const classRecords = useMemo(() => {
    return records
      .filter(r => r.classId === selectedClassId)
      .sort((a, b) => new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime());
  }, [selectedClassId, records]);

  const classStudents = useMemo(() => {
    return students.filter(s => s.classId === selectedClassId);
  }, [selectedClassId, students]);

  const studentPerformance = useMemo(() => {
    const totalLessons = classRecords.length;
    return classStudents.map(student => {
      const presences = classRecords.filter(r => r.presentStudentIds.includes(student.id)).length;
      const absences = totalLessons - presences;

      return {
        ...student,
        presences,
        absences,
        totalLessons
      };
    }).sort((a, b) => b.presences - a.presences);
  }, [classStudents, classRecords]);

  const stats = useMemo(() => {
    if (classRecords.length === 0) return { avgPresence: 0, totalOfferings: 0, avgBibles: 0, avgMagazines: 0, totalVisitors: 0, totalAssistance: 0, totalPresences: 0 };
    
    const totalP = classRecords.reduce((acc, r) => acc + r.presentStudentIds.length, 0);
    const totalO = classRecords.reduce((acc, r) => acc + r.offeringAmount, 0);
    const totalB = classRecords.reduce((acc, r) => acc + r.bibleCount, 0);
    const totalM = classRecords.reduce((acc, r) => acc + r.magazineCount, 0);
    const totalV = classRecords.reduce((acc, r) => acc + r.visitorCount, 0);

    return {
      avgPresence: (totalP / classRecords.length).toFixed(1),
      totalOfferings: totalO,
      avgBibles: (totalB / classRecords.length).toFixed(1),
      avgMagazines: (totalM / classRecords.length).toFixed(1),
      totalVisitors: totalV,
      totalPresences: totalP,
      totalAssistance: totalP + totalV
    };
  }, [classRecords]);

  const handleExportPDF = () => {
    if (!classInfo) return;

    const doc = new jsPDF('p', 'mm', 'a4'); 
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    const currentYear = now.getFullYear();

    // Cabeçalho com Logo à Esquerda
    let textStartX = 14;
    if (churchSettings?.logo_url) {
      try {
        doc.addImage(churchSettings.logo_url, 'PNG', 14, 10, 15, 15);
        textStartX = 32;
      } catch (e) {}
    }

    doc.setFontSize(16);
    doc.setTextColor(79, 70, 229);
    doc.setFont('helvetica', 'bold');
    doc.text(churchSettings?.name.toUpperCase() || 'EBD MANAGER PRO', textStartX, 17);
    
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`RELATÓRIO DE CLASSE: ${classInfo.name.toUpperCase()}`, textStartX, 23);
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(`${currentQuarter}º Trimestre / ${currentYear} | Emitido em ${dateStr}`, 14, 32);
    
    doc.setDrawColor(230);
    doc.line(14, 34, 196, 34);

    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO DE PERFORMANCE', 14, 42);

    autoTable(doc, {
      startY: 46,
      head: [['Métrica', 'Resultado']],
      body: [
        ['Assistência Total (Pres.+Vis.)', stats.totalAssistance.toString()],
        ['Média de Presença (Alunos)', `${stats.avgPresence} alunos/aula`],
        ['Total de Ofertas', stats.totalOfferings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Visitantes Totais', stats.totalVisitors.toString()],
        ['Bíblias Registradas', classRecords.reduce((acc, r) => acc + r.bibleCount, 0).toString()],
        ['Matriculados', classStudents.length.toString()]
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
      styles: { fontSize: 8 },
      margin: { right: 80 }
    });

    doc.setFontSize(11);
    doc.text('ASSIDUIDADE DOS ALUNOS', 14, (doc as any).lastAutoTable.finalY + 12);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 16,
      head: [['Nome do Aluno', 'Presenças', 'Faltas', 'Aulas']],
      body: studentPerformance.map(s => [
        s.name,
        s.presences.toString(),
        s.absences.toString(),
        s.totalLessons.toString()
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
      styles: { fontSize: 8 },
      columnStyles: {
        1: { halign: 'center', fontStyle: 'bold' },
        2: { halign: 'center' },
        3: { halign: 'center' }
      }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(churchSettings?.footer_text || 'EBD Manager Pro', 105, 288, { align: 'center' });
      doc.text(`Página ${i} de ${pageCount}`, 105, 292, { align: 'center' });
    }

    doc.save(`relatorio_classe_${classInfo.name.toLowerCase().replace(/\s/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="w-full lg:w-auto">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Classe em Análise</label>
          <select 
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full lg:w-80 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 transition-all cursor-pointer"
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <button 
          onClick={handleExportPDF}
          disabled={classRecords.length === 0}
          className="w-full lg:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          BAIXAR PDF
        </button>
      </div>

      {classRecords.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-slate-800 p-6 rounded-[32px] text-white shadow-lg shadow-slate-100">
              <p className="text-[10px] font-black uppercase opacity-60 tracking-widest leading-none">Total Assistência</p>
              <h4 className="text-3xl font-black mt-2 leading-tight">{stats.totalAssistance}</h4>
            </div>
            <div className="bg-blue-600 p-6 rounded-[32px] text-white shadow-lg shadow-blue-100">
              <p className="text-[10px] font-black uppercase opacity-60 tracking-widest leading-none">Média Presença</p>
              <h4 className="text-3xl font-black mt-2 leading-tight">{stats.avgPresence}</h4>
            </div>
            <div className="bg-emerald-600 p-6 rounded-[32px] text-white shadow-lg shadow-emerald-100">
              <p className="text-[10px] font-black uppercase opacity-60 tracking-widest leading-none">Total Ofertas</p>
              <h4 className="text-2xl font-black mt-2 leading-tight">{stats.totalOfferings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h4>
            </div>
            <div className="bg-amber-500 p-6 rounded-[32px] text-white shadow-lg shadow-amber-100">
              <p className="text-[10px] font-black uppercase opacity-60 tracking-widest leading-none">Aulas Dadas</p>
              <h4 className="text-3xl font-black mt-2 leading-tight">{classRecords.length}</h4>
            </div>
            <div className="bg-purple-600 p-6 rounded-[32px] text-white shadow-lg shadow-purple-100">
              <p className="text-[10px] font-black uppercase opacity-60 tracking-widest leading-none">Visitantes</p>
              <h4 className="text-3xl font-black mt-2 leading-tight">{stats.totalVisitors}</h4>
            </div>
            <div className="bg-indigo-600 p-6 rounded-[32px] text-white shadow-lg shadow-indigo-100">
              <p className="text-[10px] font-black uppercase opacity-60 tracking-widest leading-none">Matriculados</p>
              <h4 className="text-3xl font-black mt-2 leading-tight">{classStudents.length}</h4>
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
            <button onClick={() => setActiveTab('lessons')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'lessons' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Histórico de Lições</button>
            <button onClick={() => setActiveTab('students')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'students' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Assiduidade Alunos</button>
          </div>

          <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            {activeTab === 'lessons' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                      <th className="px-8 py-5">Data</th>
                      <th className="px-8 py-5">Lição Ministrada</th>
                      <th className="px-4 py-5 text-center">Asst.</th>
                      <th className="px-6 py-5 text-center">Presenças</th>
                      <th className="px-6 py-5 text-center">Faltas</th>
                      <th className="px-6 py-5 text-center">Ofertas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classRecords.map(record => (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5 font-black text-slate-800 text-xs">{new Date(record.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="px-8 py-5 font-bold text-indigo-600 uppercase text-[10px] tracking-tight leading-tight">{record.lessonTheme}</td>
                        <td className="px-4 py-5 text-center font-black text-slate-900 bg-slate-100/50">{record.presentStudentIds.length + record.visitorCount}</td>
                        <td className="px-6 py-5 text-center font-black text-blue-600">{record.presentStudentIds.length}</td>
                        <td className="px-6 py-5 text-center font-black text-red-400">{Math.max(0, classStudents.length - record.presentStudentIds.length)}</td>
                        <td className="px-6 py-5 text-center font-bold text-emerald-600 text-xs">{record.offeringAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                      <th className="px-8 py-5">Nome do Aluno</th>
                      <th className="px-8 py-5 text-center">Presenças</th>
                      <th className="px-8 py-5 text-center">Faltas</th>
                      <th className="px-8 py-5 text-center">Total de Aulas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentPerformance.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5">
                          <span className="font-bold text-slate-800 block">{student.name}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase">{student.active ? 'Matriculado' : 'Inativo'}</span>
                        </td>
                        <td className="px-8 py-5 text-center font-black text-indigo-600 bg-indigo-50/30">{student.presences}</td>
                        <td className="px-8 py-5 text-center font-black text-red-400">{student.absences}</td>
                        <td className="px-8 py-5 text-center font-black text-slate-400">{student.totalLessons}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-slate-200 text-center">
          <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">Sem dados disponíveis</h3>
        </div>
      )}
    </div>
  );
};
