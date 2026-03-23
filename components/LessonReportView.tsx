
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, Class, Student, ChurchSettings } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LessonReportViewProps {
  records: AttendanceRecord[];
  classes: Class[];
  students: Student[];
  churchSettings: ChurchSettings | null;
}

export const LessonReportView: React.FC<LessonReportViewProps> = ({ records, classes, students, churchSettings }) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');

  const classRecords = useMemo(() => {
    return records
      .filter(r => r.classId === selectedClassId)
      .sort((a, b) => new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime());
  }, [selectedClassId, records]);

  useMemo(() => {
    if (classRecords.length > 0 && !classRecords.find(r => r.id === selectedRecordId)) {
      setSelectedRecordId(classRecords[0].id);
    }
  }, [classRecords, selectedClassId]);

  const selectedRecord = useMemo(() => classRecords.find(r => r.id === selectedRecordId), [selectedRecordId, classRecords]);
  const classStudents = useMemo(() => students.filter(s => s.classId === selectedClassId), [selectedClassId, students]);

  const handleExportPDF = () => {
    if (!selectedRecord) return;
    const classInfo = classes.find(c => c.id === selectedClassId);
    if (!classInfo) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    
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
    doc.text(`DETALHAMENTO DE LIÇÃO - ${classInfo.name.toUpperCase()}`, textStartX, 23);
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(`DATA DA LIÇÃO: ${new Date(selectedRecord.date + 'T00:00:00').toLocaleDateString('pt-BR')} | TEMA: ${selectedRecord.lessonTheme.toUpperCase()}`, 14, 32);

    autoTable(doc, {
      startY: 38,
      head: [['Métrica', 'Valor']],
      body: [
        ['Assistência Total', (selectedRecord.presentStudentIds.length + selectedRecord.visitorCount).toString()],
        ['Alunos Presentes', selectedRecord.presentStudentIds.length.toString()],
        ['Visitantes', selectedRecord.visitorCount.toString()],
        ['Alunos Faltantes', (classStudents.length - selectedRecord.presentStudentIds.length).toString()],
        ['Oferta da Classe', selectedRecord.offeringAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ['Bíblias', selectedRecord.bibleCount.toString()],
        ['Revistas', selectedRecord.magazineCount.toString()]
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontSize: 10 },
      styles: { fontSize: 9 }
    });

    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.setFont('helvetica', 'bold');
    doc.text('CHAMADA NOMINAL', 14, (doc as any).lastAutoTable.finalY + 12);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 16,
      head: [['Nome do Aluno', 'Status']],
      body: classStudents.map(s => [
        s.name,
        selectedRecord.presentStudentIds.includes(s.id) ? 'PRESENTE' : 'FALTANTE'
      ]),
      columnStyles: {
        1: { fontStyle: 'bold', halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.column.index === 1 && data.cell.text[0] === 'FALTANTE') {
          data.cell.styles.textColor = [239, 68, 68];
        } else if (data.column.index === 1 && data.cell.text[0] === 'PRESENTE') {
          data.cell.styles.textColor = [16, 185, 129];
        }
      }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(churchSettings?.footer_text || 'EBD PRO', 105, 288, { align: 'center' });
    }

    doc.save(`licao_${selectedRecord.date}.pdf`);
  };

  const lessonStats = useMemo(() => {
    if (!selectedRecord) return null;
    return [
      { label: 'Assistência Total', value: selectedRecord.presentStudentIds.length + selectedRecord.visitorCount, color: 'bg-indigo-600 shadow-indigo-100' },
      { label: 'Presenças', value: selectedRecord.presentStudentIds.length, color: 'bg-blue-600 shadow-blue-100' },
      { label: 'Faltas', value: Math.max(0, classStudents.length - selectedRecord.presentStudentIds.length), color: 'bg-red-50 shadow-red-100 text-red-600' },
      { label: 'Oferta', value: selectedRecord.offeringAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: 'bg-emerald-600 shadow-emerald-100' },
      { label: 'Bíblias', value: selectedRecord.bibleCount, color: 'bg-amber-500 shadow-amber-100' },
      { label: 'Revistas', value: selectedRecord.magazineCount, color: 'bg-emerald-500 shadow-emerald-100' },
    ];
  }, [selectedRecord, classStudents]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center gap-6">
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1. Selecione a Classe</label>
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700 transition-all cursor-pointer"
            >
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">2. Selecione a Lição</label>
            <select 
              value={selectedRecordId}
              onChange={(e) => setSelectedRecordId(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700 transition-all cursor-pointer"
            >
              {classRecords.length > 0 ? (
                classRecords.map(r => (
                  <option key={r.id} value={r.id}>
                    {new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')} - {r.lessonTheme}
                  </option>
                ))
              ) : (
                <option value="">Nenhuma lição registrada</option>
              )}
            </select>
          </div>
        </div>

        <button 
          onClick={handleExportPDF}
          disabled={!selectedRecord}
          className="w-full lg:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          PDF DA LIÇÃO
        </button>
      </div>

      {selectedRecord && lessonStats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {lessonStats.map((stat, i) => (
              <div key={i} className={`${stat.color} p-6 rounded-[32px] text-white shadow-lg transition-transform hover:scale-[1.02]`}>
                <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">{stat.label}</p>
                <h4 className={`font-black mt-1 leading-tight ${stat.label === 'Oferta' ? 'text-lg md:text-xl' : 'text-2xl md:text-3xl'} truncate`}>
                  {stat.value}
                </h4>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-tight">{selectedRecord.lessonTheme}</h3>
                <p className="text-slate-500 font-medium">Chamada de {new Date(selectedRecord.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                    <th className="px-8 py-5">Aluno</th>
                    <th className="px-8 py-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map(student => {
                    const isPresent = selectedRecord.presentStudentIds.includes(student.id);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5">
                          <span className="font-bold text-slate-800">{student.name}</span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            isPresent ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'
                          }`}>
                            {isPresent ? 'Presente' : 'Faltante'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-slate-200 text-center">
          <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">Nenhum dado selecionado</h3>
        </div>
      )}
    </div>
  );
};
