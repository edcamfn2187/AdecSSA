
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, Class, Student, ChurchSettings } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface GeneralStudentReportViewProps {
  records: AttendanceRecord[];
  classes: Class[];
  students: Student[];
  churchSettings: ChurchSettings | null;
}

export const GeneralStudentReportView: React.FC<GeneralStudentReportViewProps> = ({ 
  records, 
  classes, 
  students, 
  churchSettings 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  const reportData = useMemo(() => {
    return students.map(student => {
      const studentClassRecords = records.filter(r => r.classId === student.classId);
      const totalLessons = studentClassRecords.length;
      const presences = studentClassRecords.filter(r => r.presentStudentIds.includes(student.id)).length;
      const absences = totalLessons - presences;
      
      const className = classes.find(c => c.id === student.classId)?.name || 'Sem Classe';

      return {
        id: student.id,
        name: student.name,
        className,
        classId: student.classId,
        presences,
        absences,
        totalLessons,
        active: student.active
      };
    })
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = selectedClassId === 'all' || item.classId === selectedClassId;
      return matchesSearch && matchesClass;
    })
    .sort((a, b) => b.presences - a.presences || a.name.localeCompare(b.name));
  }, [students, records, classes, searchTerm, selectedClassId]);

  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const now = new Date();
    
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
    doc.text(`RELATÓRIO GERAL DE ASSIDUIDADE`, textStartX, 23);
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Emitido em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 14, 32);

    autoTable(doc, {
      startY: 38,
      head: [['Rank', 'Aluno', 'Classe', 'Pres.', 'Faltas', 'Total']],
      body: reportData.map((d, idx) => [
        `${idx + 1}º`,
        d.name,
        d.className,
        d.presences.toString(),
        d.absences.toString(),
        d.totalLessons.toString()
      ]),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        3: { halign: 'center', fontStyle: 'bold' },
        4: { halign: 'center' },
        5: { halign: 'center' }
      }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(churchSettings?.footer_text || 'EBD PRO', 105, 288, { align: 'center' });
    }

    doc.save(`assiduidade_geral_${now.getTime()}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Pesquisar aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium transition-all"
            />
            <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <select 
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full md:w-64 p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-600 transition-all cursor-pointer"
          >
            <option value="all">Todas as Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button 
          onClick={handleExportPDF}
          className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          GERAR PDF
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 w-24">Ranking</th>
                <th className="px-8 py-5">Aluno</th>
                <th className="px-8 py-5">Classe</th>
                <th className="px-6 py-5 text-center">Presenças</th>
                <th className="px-6 py-5 text-center">Faltas</th>
                <th className="px-8 py-5 text-center">Total Aulas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reportData.map((data, index) => (
                <tr key={data.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-[10px] ${
                      index === 0 ? 'bg-amber-100 text-amber-600' : 
                      index === 1 ? 'bg-slate-100 text-slate-500' : 
                      index === 2 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'
                    }`}>
                      {index + 1}º
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="font-bold text-slate-800 block">{data.name}</span>
                    {!data.active && <span className="text-[8px] font-black text-red-400 uppercase">Inativo</span>}
                  </td>
                  <td className="px-8 py-5 text-xs font-black text-slate-400 uppercase">{data.className}</td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-black text-xs shadow-sm">
                        {data.presences}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center font-black text-red-400">{data.absences}</td>
                  <td className="px-8 py-5 text-center font-black text-slate-400">{data.totalLessons}</td>
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
