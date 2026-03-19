
export enum AppModule {
  PORTAL = 'PORTAL',
  MEMBERS = 'MEMBERS',
  FINANCIAL = 'FINANCIAL',
  EBD = 'EBD',
  REGIONAIS = 'REGIONAIS',
  MISSIONS = 'MISSIONS',
  CONFIG = 'CONFIG'
}

export enum AppView {
  PORTAL = 'PORTAL',
  MEMBERS_DASHBOARD = 'MEMBERS_DASHBOARD',
  FINANCIAL_DASHBOARD = 'FINANCIAL_DASHBOARD',
  TITHES = 'TITHES',
  DASHBOARD = 'DASHBOARD',
  CLASSES = 'CLASSES',
  STUDENTS = 'STUDENTS',
  TEACHERS = 'TEACHERS',
  ATTENDANCE = 'ATTENDANCE',
  TEACHER_ATTENDANCE = 'TEACHER_ATTENDANCE',
  TEACHER_ATTENDANCE_HISTORY = 'TEACHER_ATTENDANCE_HISTORY',
  REPORTS = 'REPORTS',
  CLASS_REPORTS = 'CLASS_REPORTS',
  LESSON_REPORTS = 'LESSON_REPORTS',
  GENERAL_STUDENT_REPORT = 'GENERAL_STUDENT_REPORT',
  TEACHER_ASSIDUITY_REPORT = 'TEACHER_ASSIDUITY_REPORT',
  CALENDAR = 'CALENDAR',
  AI_INSIGHTS = 'AI_INSIGHTS',
  REGIONAIS = 'REGIONAIS',
  MISSOES = 'MISSOES',
  USERS = 'USERS',
  PROFILE = 'PROFILE',
  REGISTRATIONS = 'REGISTRATIONS',
  SETTINGS = 'SETTINGS'
}

export type UserRole = 'ADMIN' | 'TEACHER';

export interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
  joinDate?: string;
}

export interface TithePayer {
  id: string;
  name: string;
  category: 'PASTOR_OBREIRO' | 'COOPERADOR_MEMBRO';
}

export interface ContributionType {
  id: string;
  name: string;
}

export interface Tithe {
  id: string;
  payer_id: string;
  type_id?: string;
  amount: number;
  month: string;
  date: string;
  payer?: TithePayer;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  category: string;
}

export interface Regional {
  id: string;
  name: string;
}

export interface Mission {
  id: string;
  name: string;
}

export interface RegionalTransaction {
  id: string;
  regional_id: string;
  description: string;
  income_amount: number;
  expense_amount: number;
  date: string;
  reference_month: string;
}

export interface MissionTransaction {
  id: string;
  name: string;
  description: string;
  income_amount: number;
  expense_amount: number;
  date: string;
  reference_month: string;
}

export interface UserSession {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  teacherId?: string;
  assignedClassIds?: string[];
  allowedModules?: AppModule[];
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: UserRole;
  created_at: string;
  allowed_modules?: AppModule[];
}

export interface ChurchSettings {
  id: string;
  name: string;
  pastor?: string;
  secretary?: string;
  superintendent?: string;
  address?: string;
  footer_text?: string;
  logo_url?: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface Teacher {
  id: string;
  name: string;
  birthDate: string;
  email?: string;
}

export interface Class {
  id: string;
  name: string;
  description?: string;
  teachers: string[];
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  birthDate: string;
  active: boolean;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  classId: string;
  presentStudentIds: string[];
  bibleCount: number;
  magazineCount: number;
  visitorCount: number;
  offeringAmount: number;
  lessonTheme: string;
}

export interface TeacherAttendanceRecord {
  id: string;
  date: string;
  presentTeacherIds: string[];
  observations?: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  theme: string;
  classId?: string;
  description?: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  averageAttendance: number;
  totalMagazines: number;
}
