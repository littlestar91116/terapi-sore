export type UserRole = 'admin' | 'kepala' | 'guru' | 'wali';

export type AccountStatus = 'aktif' | 'dibekukan' | 'nonaktif' | 'cuti';

export type SalarySystem = 'per_jam' | 'bulanan';

export type AttendanceStatus = 'Belum' | 'Hadir' | 'Izin' | 'Alpa' | 'Libur dari sekolah';

export type LeaveStatus = 'menunggu' | 'disetujui' | 'ditolak';

export type PaymentStatus = 'belum_lunas' | 'lunas';

export type PaymentMethod = 'Tunai' | 'Non-tunai';

export type DayOfWeek = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';

export type AppModule = 
  | 'siswa'
  | 'guru'
  | 'paket'
  | 'jadwal'
  | 'absensi'
  | 'izin_siswa'
  | 'izin_guru'
  | 'saldo_jam'
  | 'pembayaran'
  | 'gaji'
  | 'hak_akses';

export interface UserProfile {
  id: string;
  username: string; // Kredensial utama login akun (tanpa email)
  email?: string; // Opsional
  fullName: string;
  role: UserRole;
  status: AccountStatus;
  phone?: string;
  position?: string; // Jabatan (e.g. "Terapis Wicara", "Kepala Terapi", "Wali Murid")
  teacherId?: string; // Jika akun ini terikat ke data guru
  studentIds?: string[]; // Jika akun wali, list ID siswa anaknya
  password?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  position?: string;
  status: AccountStatus;
  phone?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Package {
  id: string;
  name: string;
  durationHours: 1 | 2;
  frequencyPerWeek: number; // 1 - 5
  priceMonthly: number;
  description?: string;
  isActive: boolean;
}

export interface Teacher {
  id: string;
  userId?: string;
  name: string;
  phone: string;
  address: string;
  joinDate: string;
  status: AccountStatus;
  salarySystem: SalarySystem;
  hourlyRate: number; // default 20.000
  monthlySalary: number; // e.g. 3.000.000
  position?: string; // Pilihan jabatan (e.g. Guru Terapis, Terapis Wicara, Terapis Okupasi, Kepala Terapi, Admin)
  role?: UserRole; // Peran hak akses akun ('guru' | 'kepala' | 'admin')
}

export interface Student {
  id: string;
  name: string;
  birthDate: string;
  parentName: string;
  parentPhone: string;
  parentUserId?: string;
  address: string;
  packageId: string;
  teacherId: string;
  accountStatus: AccountStatus;
  saldoJam: number;
  createdAt: string;
}

export interface ScheduleDaySlot {
  day: DayOfWeek;
  startTime: string; // e.g. "13:00", "14:00", "15:00"
  duration: number; // 1 atau 2 jam
}

export interface MonthlySchedule {
  id: string;
  studentId: string;
  teacherId: string;
  packageId: string;
  monthYear: string; // e.g. "2026-11"
  daysConfig: ScheduleDaySlot[];
  isActive: boolean;
  createdAt: string;
}

export interface TherapySession {
  id: string;
  scheduleId: string;
  studentId: string;
  teacherId: string;
  sessionDate: string; // YYYY-MM-DD
  dayName: DayOfWeek;
  startTime: string; // e.g. "13:00"
  endTime: string; // e.g. "14:00" atau "15:00"
  durationHours: number;
  attendanceStatus: AttendanceStatus;
  attendanceNotes?: string;
  markedAt?: string;
  markedBy?: string;
}

export interface StudentLeave {
  id: string;
  sessionId: string;
  studentId: string;
  requestDate: string;
  sessionDate: string;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface TeacherLeave {
  id: string;
  teacherId: string;
  leaveDate: string;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface SaldoJamHistory {
  id: string;
  studentId: string;
  type: 'penambahan' | 'pemakaian';
  amountHours: number;
  description: string;
  sessionId?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  monthYear: string; // "2026-11"
  amount: number;
  status: PaymentStatus;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  receiptNumber?: string;
  notes?: string;
  markedBy?: string;
  createdAt: string;
}

export interface Payroll {
  id: string;
  teacherId: string;
  monthYear: string; // "2026-11"
  salarySystem: SalarySystem;
  baseSalary: number;
  totalHoursTaught: number;
  hourlyRate: number;
  bonusFullAttendance: number;
  deductionLeave: number;
  totalLeaveDays: number;
  totalAmount: number;
  status: 'draft' | 'dibayar';
  paymentDate?: string;
}

export interface FinancialSettings {
  defaultHourlyRate: number; // e.g. 20000
  fullAttendanceBonus: number; // e.g. 50000
  dailyLeaveDeduction: number; // e.g. 75000
}

export interface RolePermission {
  id: string;
  role: UserRole;
  module: AppModule;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}
