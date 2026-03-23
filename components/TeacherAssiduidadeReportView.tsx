
import React, { useState, useMemo } from 'react';
import { Teacher, TeacherAttendanceRecord, ChurchSettings } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TeacherAssiduidadeReportViewProps {
  teachers: Teacher[];
  attendanceRecords: TeacherAttendanceRecord[];
  churchSettings: ChurchSettings | null;
}

export const TeacherAssiduidadeReportView: React.FC<TeacherAssiduidadeReportViewProps> = ({ 
  teachers, 
  attendanceRecords, 
  churchSettings 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const reportData = useMemo(() => {
    const totalAttendanceTaken = attendanceRecords.length;

    return teachers.map(teacher => {
      const presences = attendanceRecords.filter(r => 
        r.presentTeacherIds.includes(teacher.id)
      ).length;
      
      const absences = totalAttendanceTaken - presences;
      const percentage = totalAttendanceTaken > 0 
        ? Math.round((presences / totalAttendanceTaken) * 100) 
        : 0;

      return {
        id: teacher.id,
        name: teacher.name,
        presences,
        absences,
        totalAttendanceTaken,
        percentage
      };
    })
    .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.presences - a.presences || a.name.localeCompare(b.name));
  }, [teachers, attendanceRecords, searchTerm]);

  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const now = new Date();
    
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
    doc.text(`RELATÓRIO DE ASSIDUIDADE DOS PROFESSORES`, textStartX, 23);
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: Total Acumulado | Emitido em: ${now.toLocaleDateString('pt-BR')}`, 14, 32);

    autoTable(doc, {
      startY: 38,
      head: [['Rank', 'Professor(a)', 'Presenças', 'Faltas', 'Total Chamadas', '%']],
      body: reportData.map((d, idx) => [
        `${idx + 1}º`,
        d.name,
        d.presences.toString(),
        d.absences.toString(),
        d.totalAttendanceTaken.toString(),
        `${d.percentage}%`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        2: { halign: 'center', fontStyle: 'bold' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center', fontStyle: 'bold' }
      }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(churchSettings?.footer_text || 'EBD PRO - Sistema de Gestão', 105, 288, { align: 'center' });
    }

    doc.save(`assiduidade_professores_${now.getTime()}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <input 
            type="text" 
            placeholder="Pesquisar professor por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium transition-all"
          />
          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        <button 
          onClick={handleExportPDF}
          className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          EXPORTAR PDF
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 w-24">Ranking</th>
                <th className="px-8 py-5">Líder / Professor</th>
                <th className="px-6 py-5 text-center">Presenças</th>
                <th className="px-6 py-5 text-center">Faltas</th>
                <th className="px-6 py-5 text-center">% Assiduidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reportData.map((data, index) => (
                <tr key={data.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-[10px] ${
                      index === 0 ? 'bg-amber-400 text-white' : 
                      index === 1 ? 'bg-slate-300 text-slate-700' : 
                      index === 2 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {index + 1}º
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="font-bold text-slate-800 block text-sm uppercase tracking-tight">{data.name}</span>
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Educador EBD</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-black text-xs shadow-sm">
                        {data.presences}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center font-black text-red-400">{data.absences}</td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden md:block">
                          <div 
                            className={`h-full rounded-full ${data.percentage > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                            style={{ width: `${data.percentage}%` }}
                          ></div>
                       </div>
                       <span className="font-black text-slate-700 text-xs">{data.percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">
                    Nenhum professor registrado na base de dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100">
             <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Total de Chamadas</h5>
             <p className="text-3xl font-black text-indigo-900">{attendanceRecords.length}</p>
             <p className="text-xs font-medium text-indigo-400 mt-1">Registros realizados na gestão de professores.</p>
          </div>
          <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100">
             <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2">Média de Assiduidade</h5>
             <p className="text-3xl font-black text-emerald-900">
               {reportData.length > 0 ? (reportData.reduce((acc, curr) => acc + curr.percentage, 0) / reportData.length).toFixed(1) : 0}%
             </p>
             <p className="text-xs font-medium text-emerald-400 mt-1">Nível de engajamento da liderança atual.</p>
          </div>
      </div>
    </div>
  );
};
