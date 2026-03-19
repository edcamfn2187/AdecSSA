import React, { useState, useEffect } from 'react';
import { AppView, AppModule, Class, Student, AttendanceRecord, Teacher, UserSession, CalendarEvent, ChurchSettings, TeacherAttendanceRecord } from './types';
import { ICONS } from './constants';
import { Dashboard as AdminDashboard } from './components/Dashboard_admin';
import { Dashboard as TeacherDashboard } from './components/Dashboard_prof';
import { AttendanceForm } from './components/AttendanceForm';
import { TeacherAttendanceForm } from './components/TeacherAttendanceForm';
import { TeacherAttendanceHistory } from './components/TeacherAttendanceHistory';
import { ClassForm } from './components/ClassForm';
import { TeacherForm } from './components/TeacherForm';
import { StudentForm } from './components/StudentForm';
import { ReportHistory } from './components/ReportHistory';
import { ClassReportView } from './components/ClassReportView';
import { LessonReportView } from './components/LessonReportView';
import { GeneralStudentReportView } from './components/GeneralStudentReportView';
import { TeacherAssiduidadeReportView } from './components/TeacherAssiduidadeReportView';
import { LessonCalendar } from './components/LessonCalendar';
import { CalendarForm } from './components/CalendarForm';
import { LoginForm } from './components/LoginForm';
import { UserManagement } from './components/UserManagement';
import { ProfilePage } from './components/ProfilePage';
import { ChurchSettingsForm } from './components/ChurchSettingsForm';
import { FinancialSettingsForm } from './components/FinancialSettingsForm';
import { StudentDetailModal } from './components/StudentDetailModal';
import { Portal } from './components/Portal';
import { MembersManagement } from './components/MembersManagement';
import { FinancialManagement } from './components/FinancialManagement';
import { RegionalManagement } from './components/RegionalManagement';
import { MissionsManagement } from './components/MissionsManagement';
import { TithesManagement } from './components/TithesManagement';
import { api } from './services/api';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [currentModule, setCurrentModule] = useState<AppModule>(AppModule.PORTAL);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teacherAttendanceRecords, setTeacherAttendanceRecords] = useState<TeacherAttendanceRecord[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [churchSettings, setChurchSettings] = useState<ChurchSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [studentFilter, setStudentFilter] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');

  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingTeacherAttendanceDate, setEditingTeacherAttendanceDate] = useState<string | undefined>(undefined);
  
  const [isClassFormOpen, setIsClassFormOpen] = useState(false);
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [isTeacherFormOpen, setIsTeacherFormOpen] = useState(false);
  const [isCalendarCenterOpen, setIsCalendarFormOpen] = useState(false);

  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deletingTeacherAttendanceId, setDeletingTeacherAttendanceId] = useState<string | null>(null);

  useEffect(() => {
    if (churchSettings?.logo_url) {
      const logoUrl = churchSettings.logo_url;

      // 1. Atualiza todos os Favicons (Android/Desktop)
      const icons: NodeListOf<HTMLLinkElement> = document.querySelectorAll("link[rel*='icon']");
      icons.forEach(icon => {
        icon.href = logoUrl;
      });

      // 2. Atualiza o Apple Touch Icon (iOS)
      const appleIcon: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (appleIcon) {
        appleIcon.href = logoUrl;
      } else {
        const newAppleIcon = document.createElement('link');
        newAppleIcon.rel = 'apple-touch-icon';
        newAppleIcon.href = logoUrl;
        document.head.appendChild(newAppleIcon);
      }
      
      // 3. Define a cor do tema para o navegador (Android Chrome)
      const themeColor: HTMLMetaElement | null = document.querySelector("meta[name='theme-color']");
      if (themeColor) themeColor.content = "#6e295e";
    }
    
    if (churchSettings?.name) {
      document.title = churchSettings.name;
    }
  }, [churchSettings]);

  useEffect(() => {
    const init = async () => {
      try {
        // Check health first
        const health = await fetch('/api/health').then(r => r.json()).catch(() => ({ database: 'error' }));
        if (health.database !== 'connected') {
          setDbError(health.database === 'disconnected' ? 'DATABASE_URL não configurada' : health.database);
        }

        await fetchChurchSettings();
        await checkUserSession(true); 
      } catch (e) {
        console.error("Initialization critical failure:", e);
        setLoading(false);
      }
    };
    init();

    const { data: { subscription } } = api.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkUserSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const formatError = (error: any) => {
    if (!error) return "Erro desconhecido";
    if (typeof error === 'string') return error;
    if (error.code === '42501') return "Permissão Negada. Apenas administradores podem realizar esta ação.";
    return error.message || "Ocorreu um erro no processamento.";
  };

  const fetchChurchSettings = async () => {
    try {
      const data = await api.get('church_settings');
      if (data && data.length > 0) setChurchSettings(data[0]);
    } catch (e) {
      console.warn("Could not fetch church settings");
    }
  };

  const checkUserSession = async (isInitial: boolean = false) => {
    if (isInitial) setLoading(true);
    setIsUnauthorized(false);
    try {
      const { data: { session: authSession }, error: authError } = await api.auth.getSession();
      
      if (authError) {
        if (authError.message.includes('Refresh Token')) {
          setSession(null);
          if (isInitial) setLoading(false);
          return;
        }
        throw authError;
      }

      if (authSession) {
        const profiles = await api.get('profiles');
        const profile = profiles.find((p: any) => p.id === authSession.user.id);

        if (!profile) {
          setIsUnauthorized(true);
          setSession(null);
        } else {
          let allowedModules = profile.allowed_modules || [AppModule.EBD];
          
          // Ensure ADMIN always has access to CONFIG
          if (profile.role === 'ADMIN' && !allowedModules.includes(AppModule.CONFIG)) {
            allowedModules = [...allowedModules, AppModule.CONFIG];
          }

          const newSession: UserSession = {
            id: authSession.user.id,
            email: authSession.user.email!,
            role: profile.role as 'ADMIN' | 'TEACHER',
            name: profile.full_name || 'Usuário',
            allowedModules: allowedModules
          };
          setSession(newSession);
          
          await fetchData();
        }
      } else {
        setSession(null);
      }
    } catch (err: any) {
      console.error("Auth check error:", err);
      setSession(null);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [
        clData,
        stData,
        tcData,
        reData,
        calData,
        tAttData
      ] = await Promise.all([
        api.get('classes'),
        api.get('students'),
        api.get('teachers'),
        api.get('attendance_records'),
        api.get('lesson_calendar'),
        api.get('teacher_attendance')
      ]);

      if (clData) setClasses(clData.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        teachers: Array.isArray(c.teachers) ? c.teachers : (c.teachers ? [c.teachers] : [])
      })));

      if (stData) setStudents(stData.map(s => ({
        id: s.id,
        name: s.name,
        classId: s.class_id,
        birthDate: s.birth_date,
        active: s.active
      })));
      if (tcData) setTeachers(tcData.map(t => ({
        id: t.id,
        name: t.name,
        email: t.email,
        birthDate: t.birth_date
      })));
      if (reData) setRecords(reData.map(r => ({
        id: r.id,
        date: r.date,
        classId: r.class_id,
        presentStudentIds: r.present_student_ids || [],
        bibleCount: r.bible_count || 0,
        magazineCount: r.magazine_count || 0,
        visitorCount: r.visitor_count || 0,
        offeringAmount: r.offering_amount || 0,
        lessonTheme: r.lesson_theme || ''
      })));
      if (calData) setCalendarEvents(calData.map(e => ({
        id: e.id,
        date: e.date,
        theme: e.theme,
        description: e.description,
        classId: e.class_id
      })));
      if (tAttData) setTeacherAttendanceRecords(tAttData.map(r => ({
        id: r.id,
        date: r.date,
        presentTeacherIds: r.present_teacher_ids || [],
        observations: r.observations || ''
      })));
    } catch (err: any) {
      console.error("Erro ao sincronizar dados:", err);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await api.auth.signOut();
    setSession(null);
    setCurrentModule(AppModule.PORTAL);
    setLoading(false);
    navigateTo(AppView.DASHBOARD);
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      await api.delete('teachers', id);
      await fetchData();
      showNotification('Professor removido!');
    } catch (e) { showNotification(formatError(e), 'error'); }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await api.delete('attendance_records', id);
      await fetchData();
      showNotification('Lançamento excluído!');
    } catch (e) { showNotification(formatError(e), 'error'); }
  };

  const handleDeleteTeacherAttendance = async (id: string) => {
    try {
      await api.delete('teacher_attendance', id);
      await fetchData();
      showNotification('Registro de chamada de professores excluído!');
    } catch (e) { showNotification(formatError(e), 'error'); }
  };

  const handleDeleteCalendarEvent = async (id: string) => {
    try {
      await api.delete('lesson_calendar', id);
      await fetchData();
      showNotification('Evento removido!');
    } catch (e) { showNotification(formatError(e), 'error'); }
  };

  const handleDeleteClass = async (id: string) => {
    try {
      await api.delete('classes', id);
      await fetchData();
      showNotification('Classe removida!');
    } catch (e) { showNotification(formatError(e), 'error'); }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await api.delete('students', id);
      await fetchData();
      showNotification('Aluno removido!');
    } catch (e) { showNotification(formatError(e), 'error'); }
  };

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
    setEditingClass(null);
    setEditingStudent(null);
    setEditingTeacher(null);
    setEditingEvent(null);
    setSelectedStudentForDetail(null);
    if (view !== AppView.TEACHER_ATTENDANCE) {
      setEditingTeacherAttendanceDate(undefined);
    }
    setIsClassFormOpen(false);
    setIsStudentFormOpen(false);
    setIsTeacherFormOpen(false);
    setIsCalendarFormOpen(false);
    setDeletingTeacherId(null);
    setDeletingStudentId(null);
    setDeletingRecordId(null);
    setDeletingClassId(null);
    setDeletingEventId(null);
    setDeletingTeacherAttendanceId(null);
    if (view !== AppView.STUDENTS) {
        setStudentFilter(null);
        setStudentSearch('');
    }
    if (view !== AppView.TEACHERS) {
        setTeacherSearch('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 border-4 border-[#6e295e] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-8">Iniciando sistema...</p>
        
        {dbError && (
          <div className="max-w-sm w-full p-6 bg-white/5 border border-white/10 rounded-3xl text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h3 className="text-white font-black text-xs uppercase tracking-widest mb-2">Erro de Banco de Dados</h3>
            <p className="text-slate-400 text-sm font-medium mb-4">Não foi possível conectar ao PostgreSQL.</p>
            <div className="bg-black/40 p-3 rounded-xl font-mono text-[10px] text-amber-400/80 break-all mb-4">
              {dbError}
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed">
              Verifique a variável <span className="text-white">DATABASE_URL</span> nos Secrets do AI Studio (⚙️ Configurações).
            </p>
          </div>
        )}
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 text-center">
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Acesso Não Autorizado</h1>
          <p className="text-slate-500 mt-4">Você não possui um perfil de acesso configurado.</p>
          <button onClick={handleLogout} className="mt-8 w-full py-4 bg-slate-900 text-white font-black rounded-2xl"> VOLTAR PARA LOGIN </button>
        </div>
      </div>
    );
  }

  if (!session) return <LoginForm initialSettings={churchSettings} onLoginSuccess={() => checkUserSession(true)} />;

  const filteredClasses = session.role === 'ADMIN' 
    ? classes 
    : classes.filter(c => c.teachers?.includes(session.name || ''));

  const teacherClassIds = filteredClasses.map(c => c.id);

  const studentsListFiltered = session.role === 'ADMIN'
    ? students
    : students.filter(s => teacherClassIds.includes(s.classId));

  const filteredRecords = session.role === 'ADMIN'
    ? records
    : records.filter(r => teacherClassIds.includes(r.classId));

  const filteredCalendarEvents = session.role === 'ADMIN'
    ? calendarEvents
    : calendarEvents.filter(e => !e.classId || teacherClassIds.includes(e.classId));

  const viewDisplayNames: Record<AppView, string> = {
    [AppView.PORTAL]: 'Portal',
    [AppView.MEMBERS_DASHBOARD]: 'Secretaria',
    [AppView.FINANCIAL_DASHBOARD]: 'Tesouraria',
    [AppView.TITHES]: 'Lançamentos',
    [AppView.REGIONAIS]: 'Gestão de Regionais',
    [AppView.MISSOES]: 'Gestão de Missões',
    [AppView.DASHBOARD]: 'Início',
    [AppView.CALENDAR]: 'Calendário',
    [AppView.REGISTRATIONS]: 'Cadastros',
    [AppView.STUDENTS]: 'Alunos',
    [AppView.CLASSES]: 'Classes',
    [AppView.TEACHERS]: 'Professores',
    [AppView.USERS]: 'Acessos',
    [AppView.ATTENDANCE]: 'Chamada',
    [AppView.TEACHER_ATTENDANCE]: 'Chamada Prof.',
    [AppView.TEACHER_ATTENDANCE_HISTORY]: 'Histórico Chamada Prof.',
    [AppView.REPORTS]: 'Relatórios',
    [AppView.CLASS_REPORTS]: 'Relatórios',
    [AppView.LESSON_REPORTS]: 'Frequência Lições',
    [AppView.GENERAL_STUDENT_REPORT]: 'Assiduidade Alunos',
    [AppView.TEACHER_ASSIDUITY_REPORT]: 'Assiduidade Prof.',
    [AppView.PROFILE]: 'Meu Perfil',
    [AppView.SETTINGS]: 'Configurações',
    [AppView.AI_INSIGHTS]: 'IA Insights'
  };

  const getNavItems = () => {
    if (currentModule === AppModule.MEMBERS) {
      return [
        { view: AppView.MEMBERS_DASHBOARD, label: 'Membros', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg> },
        { view: AppView.PROFILE, label: 'Perfil', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
        ...(session && session.role === 'ADMIN' ? [{ view: AppView.SETTINGS, label: 'Config.', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> }] : [])
      ];
    }
    
    if (currentModule === AppModule.FINANCIAL) {
      return [
        { view: AppView.FINANCIAL_DASHBOARD, label: 'Tesouraria', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> },
        { view: AppView.TITHES, label: 'Lançamentos', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> },
        { view: AppView.REGIONAIS, label: 'Regionais', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg> },
        { view: AppView.MISSOES, label: 'Missões', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> },
        { view: AppView.PROFILE, label: 'Perfil', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
        ...(session && session.role === 'ADMIN' ? [{ view: AppView.SETTINGS, label: 'Config.', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> }] : [])
      ];
    }

    if (currentModule === AppModule.CONFIG) {
      return [
        { view: AppView.USERS, label: 'Acessos', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg> },
        { view: AppView.SETTINGS, label: 'Igreja', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg> },
        { view: AppView.PROFILE, label: 'Perfil', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> }
      ];
    }

    return [
      { view: AppView.DASHBOARD, label: 'Início', icon: <ICONS.Dashboard /> },
      { view: AppView.CALENDAR, label: 'Calendário', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> },
      { view: AppView.ATTENDANCE, label: 'Chamada', icon: <ICONS.Attendance /> },
      ...(session && session.role === 'ADMIN' ? [{ view: AppView.TEACHER_ATTENDANCE, label: 'Chamada Prof.', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg> }] : []),
      { view: AppView.REPORTS, label: 'Relatórios', icon: <ICONS.Classes /> },
      { view: AppView.REGISTRATIONS, label: 'Cadastros', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> },
      { view: AppView.PROFILE, label: 'Perfil', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
      ...(session && session.role === 'ADMIN' ? [{ view: AppView.SETTINGS, label: 'Config.', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> }] : [])
    ];
  };

  const navItems = getNavItems();

  const isCurrentGroup = (view: AppView) => {
    if (view === AppView.REGISTRATIONS) return [AppView.REGISTRATIONS, AppView.STUDENTS, AppView.CLASSES, AppView.TEACHERS, AppView.USERS].includes(currentView);
    if (view === AppView.REPORTS) return [AppView.REPORTS, AppView.CLASS_REPORTS, AppView.LESSON_REPORTS, AppView.GENERAL_STUDENT_REPORT, AppView.TEACHER_ASSIDUITY_REPORT, AppView.TEACHER_ATTENDANCE_HISTORY].includes(currentView);
    return currentView === view;
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        if (session.role === 'TEACHER') {
          return <TeacherDashboard records={filteredRecords} classes={filteredClasses} students={studentsListFiltered} churchSettings={churchSettings} isTeacherView={true} />;
        }
        return <AdminDashboard records={records} classes={classes} students={students} churchSettings={churchSettings} />;
      
      case AppView.ATTENDANCE:
        return (
          <AttendanceForm 
            classes={filteredClasses} 
            students={studentsListFiltered} 
            calendarEvents={filteredCalendarEvents}
            onSave={async (r) => {
              try {
                const payload: any = {
                  date: r.date,
                  class_id: r.classId,
                  present_student_ids: r.presentStudentIds,
                  bible_count: r.bibleCount,
                  magazine_count: r.magazineCount,
                  visitor_count: r.visitorCount,
                  offering_amount: r.offeringAmount,
                  lesson_theme: r.lessonTheme || ''
                };
                if (r.id) payload.id = r.id;
                await api.upsert('attendance_records', payload);
                await fetchData();
                setEditingRecord(null);
                setCurrentView(AppView.REPORTS);
                showNotification('Chamada salva!');
              } catch (e) { showNotification(formatError(e), 'error'); }
            }} 
            editRecord={editingRecord} 
            onCancel={() => {
              if (editingRecord) {
                setEditingRecord(null);
                navigateTo(AppView.REPORTS);
              } else {
                navigateTo(AppView.DASHBOARD);
              }
            }} 
          />
        );
      
      case AppView.TEACHER_ATTENDANCE:
        if (session.role !== 'ADMIN') return <AdminDashboard records={records} classes={classes} students={students} churchSettings={churchSettings} />;
        return (
          <TeacherAttendanceForm 
            teachers={teachers} 
            initialDate={editingTeacherAttendanceDate}
            onSaveSuccess={() => { 
              fetchData(); 
              showNotification('Chamada dos professores salva!', 'success');
              setEditingTeacherAttendanceDate(undefined);
              navigateTo(AppView.DASHBOARD); 
            }}
          />
        );
      
      case AppView.CALENDAR:
        return isCalendarCenterOpen ? (
          <CalendarForm 
            classes={classes} 
            editEvent={editingEvent} 
            onSave={async (ev) => {
              try {
                const payload: any = { date: ev.date, theme: ev.theme, description: ev.description, class_id: ev.classId };
                if (ev.id) payload.id = ev.id;
                await api.upsert('lesson_calendar', payload);
                await fetchData();
                setIsCalendarFormOpen(false);
                setEditingEvent(null);
                showNotification('Aula agendada!');
              } catch (e) { showNotification(formatError(e), 'error'); }
            }} 
            onCancel={() => { setIsCalendarFormOpen(false); setEditingEvent(null); }} 
          />
        ) : (
          <LessonCalendar 
            events={filteredCalendarEvents} 
            classes={classes} 
            isAdmin={session.role === 'ADMIN'}
            onAdd={(date) => { 
                setEditingEvent(date ? { id: '', date, theme: '', classId: '', description: '' } : null);
                setIsCalendarFormOpen(true); 
            }}
            onEdit={(e) => { setEditingEvent(e); setIsCalendarFormOpen(true); }}
            onDelete={(id) => setDeletingEventId(id)}
          />
        );

      case AppView.STUDENTS:
      case AppView.CLASSES:
      case AppView.TEACHERS:
      case AppView.REGISTRATIONS:
        const activeRegTab = currentView === AppView.REGISTRATIONS ? AppView.STUDENTS : currentView;
        return (
          <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit overflow-x-auto max-w-full">
              <button onClick={() => navigateTo(AppView.STUDENTS)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeRegTab === AppView.STUDENTS ? 'bg-white text-[#6e295e] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Alunos</button>
              <button onClick={() => navigateTo(AppView.CLASSES)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeRegTab === AppView.CLASSES ? 'bg-white text-[#6e295e] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Classes</button>
              {session.role === 'ADMIN' && (
                <>
                  <button onClick={() => navigateTo(AppView.TEACHERS)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeRegTab === AppView.TEACHERS ? 'bg-white text-[#6e295e] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Professores</button>
                </>
              )}
            </div>

            {activeRegTab === AppView.STUDENTS && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                  <input type="text" placeholder="Pesquisar aluno por nome..." className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#6e295e] font-medium" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                  <select value={studentFilter || ''} onChange={e => setStudentFilter(e.target.value || null)} className="flex-1 md:flex-none md:w-64 p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#6e295e] font-bold text-slate-600">
                    <option value="">Todas as Classes</option>
                    {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {session.role === 'ADMIN' && <button onClick={() => { setEditingStudent(null); setIsStudentFormOpen(true); }} className="bg-[#6e295e] text-white px-6 py-3 rounded-2xl font-black text-xs shrink-0"> + NOVO ALUNO </button>}
                </div>
                {isStudentFormOpen ? (
                   <StudentForm classes={filteredClasses} onSave={async (d) => { try { const payload: any = { name: d.name, class_id: d.classId, birth_date: d.birthDate, active: d.active }; if (d.id) payload.id = d.id; await api.upsert('students', payload); await fetchData(); setIsStudentFormOpen(false); setEditingStudent(null); showNotification('Aluno salvo!'); } catch (e) { showNotification(formatError(e), 'error'); } }} onCancel={() => { setIsStudentFormOpen(false); setEditingStudent(null); }} editStudent={editingStudent} />
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                     <table className="w-full text-left">
                       <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         <tr>
                            <th className="px-6 py-4">Nome</th>
                            <th className="px-6 py-4">Classe</th>
                            <th className="px-6 py-4 text-center">Frequência</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {studentsListFiltered.filter(s => { const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()); const matchesClass = studentFilter ? s.classId === studentFilter : true; return matchesSearch && matchesClass; }).map(s => {
                            const studentClassRecords = records.filter(r => r.classId === s.classId);
                            const presences = studentClassRecords.filter(r => r.presentStudentIds.includes(s.id)).length;
                            const frequency = studentClassRecords.length > 0 ? Math.round((presences / studentClassRecords.length) * 100) : 0;
                            const classInfo = classes.find(c => c.id === s.classId);

                            return (
                              <tr key={s.id} className="hover:bg-slate-50 transition-all">
                                <td className="px-6 py-4">
                                  <button onClick={() => setSelectedStudentForDetail(s)} className="font-bold text-slate-700 hover:text-indigo-600 hover:underline text-left">
                                    {s.name}
                                  </button>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-tighter">{classInfo?.name || 'Sem Classe'}</td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                     <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${frequency >= 70 ? 'bg-emerald-500' : frequency >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{width: `${frequency}%`}}></div>
                                     </div>
                                     <span className="text-[10px] font-black text-slate-500">{frequency}%</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-3">
                                    <button onClick={() => setSelectedStudentForDetail(s)} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Ver Histórico">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                                    </button>
                                    {session.role === 'ADMIN' && (<><button onClick={() => { setEditingStudent(s); setIsStudentFormOpen(true); }} className="text-[#6e295e] font-bold text-xs hover:underline">Editar</button><button onClick={() => setDeletingStudentId(s.id)} className="text-red-500 font-bold text-xs hover:underline">Excluir</button></>)}
                                  </div>
                                </td>
                              </tr>
                            );
                         })}
                       </tbody>
                     </table>
                  </div>
                )}
              </div>
            )}

            {activeRegTab === AppView.CLASSES && (
              <div className="space-y-6">
                {isClassFormOpen ? (
                  <ClassForm teachers={teachers} onSave={async (d) => { try { await api.upsert('classes', d); await fetchData(); setIsClassFormOpen(false); setEditingClass(null); showNotification('Classe salva!'); } catch(e) { showNotification(formatError(e), 'error'); } }} onCancel={() => { setIsClassFormOpen(false); setEditingClass(null); }} editClass={editingClass} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="col-span-full mb-2 flex justify-end">
                       {session.role === 'ADMIN' && <button onClick={() => { setEditingClass(null); setIsClassFormOpen(true); }} className="bg-[#6e295e] text-white px-6 py-3 rounded-2xl font-black text-xs"> + NOVA CLASSE </button>}
                    </div>
                    {filteredClasses.map(c => (
                      <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                        <h3 className="text-xl font-black text-slate-800 mt-2 tracking-tight uppercase">{c.name}</h3>
                        {c.description && <p className="text-sm text-slate-500 font-medium mt-1 mb-3 line-clamp-2">{c.description}</p>}
                        <div className="mt-auto pt-4 border-t border-slate-50">
                          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">{c.teachers?.length > 1 ? 'Professores' : 'Professor'}:</p>
                          <p className="text-slate-600 text-sm font-bold">{c.teachers?.join(', ') || 'Nenhum atribuído'}</p>
                          <div className="flex gap-2 mt-6">
                            <button onClick={() => { setStudentFilter(c.id); navigateTo(AppView.STUDENTS); }} className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition-colors">ALUNOS</button>
                            {session.role === 'ADMIN' && (<><button onClick={() => { setEditingClass(c); setIsClassFormOpen(true); }} className="px-4 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors rounded-2xl text-xs font-black">EDITAR</button><button onClick={() => setDeletingClassId(c.id)} className="px-4 py-3 bg-red-50 text-red-500 hover:bg-red-100 transition-colors rounded-2xl text-xs font-black">EXCLUIR</button></>)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeRegTab === AppView.TEACHERS && session.role === 'ADMIN' && (
              <div className="space-y-6">
                {isTeacherFormOpen ? (
                  <TeacherForm onSave={async (t) => {
                    try {
                      const payload: any = { name: t.name, email: t.email, birth_date: t.birthDate };
                      if (t.id) payload.id = t.id;
                      await api.upsert('teachers', payload);
                      await fetchData();
                      setIsTeacherFormOpen(false);
                      setEditingTeacher(null);
                      showNotification('Professor salvo!');
                    } catch (e) { showNotification(formatError(e), 'error'); }
                  }} onCancel={() => { setIsTeacherFormOpen(false); setEditingTeacher(null); }} editTeacher={editingTeacher} />
                ) : (
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                       <div><h2 className="text-2xl font-black text-slate-800">Professores</h2><p className="text-sm text-slate-500">Gestão de líderes e educadores.</p></div>
                       <div className="flex flex-col md:flex-row w-full md:w-auto gap-4">
                         <input type="text" placeholder="Buscar professor..." className="p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#6e295e] font-medium text-sm md:w-64" value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} />
                         <button onClick={() => { setEditingTeacher(null); setIsTeacherFormOpen(true); }} className="bg-[#6e295e] text-white px-6 py-3 rounded-2xl font-black text-xs whitespace-nowrap"> + NOVO PROFESSOR </button>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {teachers.filter(t => t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || t.email?.toLowerCase().includes(teacherSearch.toLowerCase())).map(t => (
                         <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:bg-purple-50 transition-colors">
                            <div><p className="font-bold text-slate-800 uppercase text-xs">{t.name}</p><p className="text-[10px] font-bold text-slate-400">{t.email || 'Sem e-mail informado'}</p></div>
                            <div className="flex gap-2"><button onClick={() => { setEditingTeacher(t); setIsTeacherFormOpen(true); }} className="p-2 text-[#6e295e] hover:bg-white rounded-lg transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button><button onClick={() => setDeletingTeacherId(t.id)} className="p-2 text-red-500 hover:bg-white rounded-lg transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        );

      case AppView.USERS:
        return (
          <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit overflow-x-auto max-w-full">
              <button onClick={() => navigateTo(AppView.USERS)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${currentView === AppView.USERS ? 'bg-white text-[#6e295e] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Controle de Acessos</button>
              <button onClick={() => navigateTo(AppView.SETTINGS)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${currentView === AppView.SETTINGS ? 'bg-white text-[#6e295e] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Dados da Igreja</button>
            </div>
            <UserManagement />
          </div>
        );

      case AppView.REPORTS:
      case AppView.CLASS_REPORTS:
      case AppView.LESSON_REPORTS:
      case AppView.GENERAL_STUDENT_REPORT:
      case AppView.TEACHER_ASSIDUITY_REPORT:
      case AppView.TEACHER_ATTENDANCE_HISTORY:
        const activeReportTab = currentView === AppView.REPORTS ? 'history' : currentView;
        return (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl w-fit overflow-x-auto max-w-full">
              <button onClick={() => navigateTo(AppView.REPORTS)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeReportTab === 'history' ? 'bg-white text-[#6e295e] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Histórico</button>
              <button onClick={() => navigateTo(AppView.CLASS_REPORTS)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeReportTab === AppView.CLASS_REPORTS ? 'bg-white text-[#6e295e] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Frequência Classe</button>
              <button onClick={() => navigateTo(AppView.LESSON_REPORTS)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeReportTab === AppView.LESSON_REPORTS ? 'bg-white text-[#6e295e] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Frequência Lições</button>
              <button onClick={() => navigateTo(AppView.GENERAL_STUDENT_REPORT)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeReportTab === AppView.GENERAL_STUDENT_REPORT ? 'bg-white text-[#6e295e] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Assiduidade Alunos</button>
              {session.role === 'ADMIN' && (
                <>
                  <button onClick={() => navigateTo(AppView.TEACHER_ASSIDUITY_REPORT)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeReportTab === AppView.TEACHER_ASSIDUITY_REPORT ? 'bg-white text-[#6e295e] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Assiduidade Prof.</button>
                  <button onClick={() => navigateTo(AppView.TEACHER_ATTENDANCE_HISTORY)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeReportTab === AppView.TEACHER_ATTENDANCE_HISTORY ? 'bg-white text-[#6e295e] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Histórico Prof.</button>
                </>
              )}
            </div>
            {activeReportTab === 'history' && <ReportHistory records={filteredRecords} classes={filteredClasses} isAdmin={session.role === 'ADMIN'} onEdit={(r) => { setEditingRecord(r); setCurrentView(AppView.ATTENDANCE); }} onDelete={(id) => setDeletingRecordId(id)} />}
            {activeReportTab === AppView.CLASS_REPORTS && <ClassReportView records={filteredRecords} classes={filteredClasses} students={studentsListFiltered} churchSettings={churchSettings} />}
            {activeReportTab === AppView.LESSON_REPORTS && <LessonReportView records={filteredRecords} classes={filteredClasses} students={studentsListFiltered} churchSettings={churchSettings} />}
            {activeReportTab === AppView.GENERAL_STUDENT_REPORT && <GeneralStudentReportView records={filteredRecords} classes={filteredClasses} students={studentsListFiltered} churchSettings={churchSettings} />}
            {activeReportTab === AppView.TEACHER_ASSIDUITY_REPORT && session.role === 'ADMIN' && <TeacherAssiduidadeReportView teachers={teachers} attendanceRecords={teacherAttendanceRecords} churchSettings={churchSettings} />}
            {activeReportTab === AppView.TEACHER_ATTENDANCE_HISTORY && session.role === 'ADMIN' && (
              <TeacherAttendanceHistory 
                records={teacherAttendanceRecords} 
                onEdit={(date) => { setEditingTeacherAttendanceDate(date); setCurrentView(AppView.TEACHER_ATTENDANCE); }} 
                onDelete={(id) => setDeletingTeacherAttendanceId(id)} 
              />
            )}
          </div>
        );

      case AppView.MEMBERS_DASHBOARD:
        return <MembersManagement />;
        
      case AppView.FINANCIAL_DASHBOARD:
        return <FinancialManagement />;

      case AppView.REGIONAIS:
        return <RegionalManagement />;

      case AppView.MISSOES:
        return <MissionsManagement />;

      case AppView.TITHES:
        return <TithesManagement />;

      case AppView.PROFILE:
        return <ProfilePage session={session} />;
      
      case AppView.SETTINGS:
        if (currentModule === AppModule.FINANCIAL) {
          return <FinancialSettingsForm onSave={() => fetchChurchSettings()} />;
        }
        if (currentModule === AppModule.CONFIG) {
          return (
            <div className="space-y-6">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit overflow-x-auto max-w-full">
                <button onClick={() => navigateTo(AppView.USERS)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${currentView === AppView.USERS ? 'bg-white text-[#6e295e] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Controle de Acessos</button>
                <button onClick={() => navigateTo(AppView.SETTINGS)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${currentView === AppView.SETTINGS ? 'bg-white text-[#6e295e] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Dados da Igreja</button>
              </div>
              <ChurchSettingsForm onSave={() => fetchChurchSettings()} />
            </div>
          );
        }
        return <ChurchSettingsForm onSave={() => fetchChurchSettings()} />;

      default:
        return <AdminDashboard records={records} classes={classes} students={students} churchSettings={churchSettings} />;
    }
  };

  if (currentModule === AppModule.PORTAL) {
    return (
      <Portal 
        churchSettings={churchSettings} 
        allowedModules={session.allowedModules || [AppModule.EBD]}
        onSelectModule={(module) => {
          setCurrentModule(module);
          if (module === AppModule.MEMBERS) setCurrentView(AppView.MEMBERS_DASHBOARD);
          else if (module === AppModule.FINANCIAL) setCurrentView(AppView.FINANCIAL_DASHBOARD);
          else if (module === AppModule.CONFIG) setCurrentView(AppView.USERS);
          else setCurrentView(AppView.DASHBOARD);
        }} 
      />
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row bg-slate-50 font-['Inter'] relative overflow-hidden">
      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[250] animate-in slide-in-from-top duration-300 print:hidden">
          <div className={`px-8 py-4 rounded-full shadow-2xl font-black text-xs uppercase tracking-widest ${notification.type === 'success' ? 'bg-[#6e295e] text-white' : 'bg-red-600 text-white'}`}>{notification.message}</div>
        </div>
      )}

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-slate-900 text-slate-100 flex flex-col z-[210] lg:z-[60] transition-transform duration-500 ease-in-out print:hidden ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 flex items-center justify-between lg:justify-start gap-4 text-white">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg border border-white/5 overflow-hidden">
              {churchSettings?.logo_url ? <img src={churchSettings.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <ICONS.Bible />}
            </div>
            <span className="text-xl font-black tracking-tighter block leading-none truncate max-w-[140px]">{churchSettings?.name || 'Adec S. S. Anta'}</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <button 
              key={item.view} 
              onClick={() => navigateTo(item.view)} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${isCurrentGroup(item.view) ? 'bg-[#6e295e] text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-6 border-t border-white/5 space-y-2">
          <button onClick={() => setCurrentModule(AppModule.PORTAL)} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm hover:bg-white/10 transition-all text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            Voltar ao Portal
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm hover:bg-red-500/10 transition-all text-slate-500 hover:text-red-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Sair do App
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
          <header className="flex-none sticky top-0 lg:static z-[100] flex flex-row items-center justify-between gap-4 p-4 lg:p-12 bg-white/95 lg:bg-transparent border-b border-slate-200 lg:border-none shadow-sm lg:shadow-none backdrop-blur-md lg:backdrop-blur-none print:hidden">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="lg:hidden w-11 h-11 bg-purple-50 text-[#6e295e] rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-sm border border-purple-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
              <div className="flex flex-col">
                <h1 className="text-lg lg:text-3xl xl:text-4xl font-black text-slate-900 uppercase leading-tight tracking-tight truncate max-w-[200px] md:max-w-none">
                  {viewDisplayNames[currentView]}
                </h1>
                <p className="hidden md:block text-slate-500 mt-1 text-sm font-medium">
                  {currentModule === AppModule.MEMBERS && 'Gestão de Membros e Congregações'}
                  {currentModule === AppModule.FINANCIAL && 'Gestão Financeira e Tesouraria'}
                  {currentModule === AppModule.EBD && (session.role === 'ADMIN' ? 'Gestão Administrativa EBD' : `Painel do Professor: ${session.name}`)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <div className="text-right hidden md:block">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{session.role}</p>
                  <p className="text-xs font-bold text-slate-800">{session.name}</p>
               </div>
               <div className="w-10 h-10 bg-[#6e295e] text-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden shrink-0">
                 {churchSettings?.logo_url ? <img src={churchSettings.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <ICONS.Bible />}
               </div>
            </div>
          </header>

          <div className="flex-1 p-4 lg:p-12 pt-4 lg:pt-0 pb-12 print:p-0 print:overflow-visible">
            {renderContent()}
          </div>
        </div>
      </main>

      {selectedStudentForDetail && (
        <StudentDetailModal 
          student={selectedStudentForDetail}
          records={records}
          className={classes.find(c => c.id === selectedStudentForDetail.classId)?.name || 'Sem Classe'}
          onClose={() => setSelectedStudentForDetail(null)}
        />
      )}

      {deletingTeacherId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Remover Professor</h3>
            <p className="text-slate-500 mb-8 font-medium text-sm">Esta ação removerá o cadastro do professor. Deseja continuar?</p>
            <div className="flex gap-4">
              <button onClick={() => setDeletingTeacherId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase">Cancelar</button>
              <button onClick={() => { handleDeleteTeacher(deletingTeacherId); setDeletingTeacherId(null); }} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {deletingRecordId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Excluir Lançamento</h3>
            <p className="text-slate-500 mb-8 font-medium text-sm">Deseja apagar permanentemente este relatório?</p>
            <div className="flex gap-4">
              <button onClick={() => setDeletingRecordId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase">Cancelar</button>
              <button onClick={() => { handleDeleteRecord(deletingRecordId); setDeletingRecordId(null); }} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {deletingTeacherAttendanceId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Excluir Chamada de Prof.</h3>
            <p className="text-slate-500 mb-8 font-medium text-sm">Deseja apagar permanentemente este registro de frequência ministerial?</p>
            <div className="flex gap-4">
              <button onClick={() => setDeletingTeacherAttendanceId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase">Cancelar</button>
              <button onClick={() => { handleDeleteTeacherAttendance(deletingTeacherAttendanceId); setDeletingTeacherAttendanceId(null); }} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {deletingEventId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Remover do Calendário</h3>
            <p className="text-slate-500 mb-8 font-medium text-sm">Deseja cancelar o agendamento desta aula?</p>
            <div className="flex gap-4">
              <button onClick={() => setDeletingEventId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase">Voltar</button>
              <button onClick={() => { handleDeleteCalendarEvent(deletingEventId); setDeletingEventId(null); }} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase">Remover</button>
            </div>
          </div>
        </div>
      )}

      {deletingClassId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Remover Classe</h3>
            <p className="text-slate-500 mb-8 font-medium text-sm">A exclusão da classe removerá o vínculo com alunos e registros.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeletingClassId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase">Cancelar</button>
              <button onClick={() => { handleDeleteClass(deletingClassId); setDeletingClassId(null); }} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {deletingStudentId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-4">Remover Aluno</h3>
            <p className="text-slate-500 mb-8 font-medium text-sm">Esta ação excluirá o cadastro permanentemente.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeletingStudentId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase">Cancelar</button>
              <button onClick={() => { handleDeleteStudent(deletingStudentId); setDeletingStudentId(null); }} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;