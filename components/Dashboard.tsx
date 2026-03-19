
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { AttendanceRecord, Class, Student } from '../types';

interface DashboardProps {
  records: AttendanceRecord[];
  classes: Class[];
  students: Student[];
}

export const Dashboard: React.FC<DashboardProps> = ({ records, classes, students }) => {
  const totalMagazines = records.reduce((acc, r) => acc + (r.magazineCount || 0), 0);
  const totalBibles = records.reduce((acc, r) => acc + (r.bibleCount || 0), 0);
  const totalPresence = records.reduce((acc, r) => acc + r.presentStudentIds.length, 0);
  const totalVisitors = records.reduce((acc, r) => acc + r.visitorCount, 0);
  
  // Calcular aniversariantes da semana
  const getBirthdaysThisWeek = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return students.filter(student => {
      if (!student.birthDate) return false;
      const bdate = new Date(student.birthDate);
      const bdayThisYear = new Date(today.getFullYear(), bdate.getUTCMonth(), bdate.getUTCDate());
      return bdayThisYear >= startOfWeek && bdayThisYear <= endOfWeek;
    }).sort((a, b) => {
      const dateA = new Date(a.birthDate);
      const dateB = new Date(b.birthDate);
      return dateA.getUTCDate() - dateB.getUTCDate();
    });
  };

  const weeklyBirthdays = getBirthdaysThisWeek();

  // Calcular total faltante geral
  const totalAbsent = records.reduce((acc, r) => {
    const studentsInClass = students.filter(s => s.classId === r.classId).length;
    const absentInThisClass = Math.max(0, studentsInClass - r.presentStudentIds.length);
    return acc + absentInThisClass;
  }, 0);

  // Dados para os gráficos
  const chartData = classes.map(c => {
    const classRecords = records.filter(r => r.classId === c.id);
    const studentsInClassCount = students.filter(s => s.classId === c.id).length;
    
    const presence = classRecords.reduce((acc, r) => acc + r.presentStudentIds.length, 0);
    const magazines = classRecords.reduce((acc, r) => acc + (r.magazineCount || 0), 0);
    const bibles = classRecords.reduce((acc, r) => acc + (r.bibleCount || 0), 0);
    const visitors = classRecords.reduce((acc, r) => acc + (r.visitorCount || 0), 0);
    const absent = classRecords.reduce((acc, r) => {
        return acc + Math.max(0, studentsInClassCount - r.presentStudentIds.length);
    }, 0);

    return {
      name: c.name,
      presence,
      magazines,
      bibles,
      visitors,
      absent
    };
  });

  const stats = [
    { label: 'Total de Revistas', value: totalMagazines, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { label: 'Total de Presença', value: totalPresence, color: 'bg-blue-50 text-blue-700 border-blue-100' },
    { label: 'Total Faltante', value: totalAbsent, color: 'bg-red-50 text-red-700 border-red-100' },
    { label: 'Total Visitantes', value: totalVisitors, color: 'bg-purple-50 text-purple-700 border-purple-100' },
    { label: 'Bíblias Trazidas', value: totalBibles, color: 'bg-amber-50 text-amber-700 border-amber-100' },
    { label: 'Total de Classes', value: classes.length, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  ];

  const ChartCard = ({ title, dataKey, color, data }: { title: string, dataKey: string, color: string, data: any[] }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
      <h3 className="text-lg font-bold mb-4 text-slate-700 flex items-center justify-between">
        {title}
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
      </h3>
      <div className="h-64 mt-auto">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
            <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
            <Tooltip 
              cursor={{fill: '#f8fafc'}}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${dataKey}-${index}`} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Alerta de Aniversariantes da Semana */}
      {weeklyBirthdays.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-[32px] p-6 md:p-8 animate-in slide-in-from-top duration-500">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-3xl shrink-0">
              🎂
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-black text-slate-800">Aniversariantes da Semana</h3>
              <p className="text-slate-500 font-medium">Não esqueça de parabenizar nossos alunos especiais!</p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-end gap-3 max-w-xl">
              {weeklyBirthdays.map(student => (
                <div key={student.id} className="bg-white px-4 py-2 rounded-xl shadow-sm border border-indigo-50 flex items-center gap-3">
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-700 leading-tight">{student.name}</p>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">
                      {new Date(student.birthDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • {classes.find(c => c.id === student.classId)?.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid de Cards de Sumário */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`p-4 md:p-5 rounded-2xl shadow-sm border ${stat.color} transition-all hover:shadow-md`}>
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{stat.label}</p>
            <p className="text-xl md:text-2xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Grid de Gráficos Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard 
            title="Presença por Classe" 
            dataKey="presence" 
            color="#3b82f6" 
            data={chartData} 
        />
        <ChartCard 
            title="Revistas por Classe" 
            dataKey="magazines" 
            color="#10b981" 
            data={chartData} 
        />
      </div>

      {/* Grid de Gráficos Secundários */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ChartCard 
            title="Faltantes por Classe" 
            dataKey="absent" 
            color="#ef4444" 
            data={chartData} 
        />
        <ChartCard 
            title="Visitantes por Classe" 
            dataKey="visitors" 
            color="#8b5cf6" 
            data={chartData} 
        />
        <ChartCard 
            title="Bíblias por Classe" 
            dataKey="bibles" 
            color="#f59e0b" 
            data={chartData} 
        />
      </div>
    </div>
  );
};
