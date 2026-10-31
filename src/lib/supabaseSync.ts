import { getSupabase } from './supabase';
import {
  UserProfile,
  Student,
  Teacher,
  Package,
  MonthlySchedule,
  TherapySession,
  Payment,
  StudentLeave,
  TeacherLeave,
  SaldoJamHistory,
} from '../types';

// ==============================================================================
// STATUS NOTIFIER UNTUK SINKRONISASI OTOMATIS
// ==============================================================================

export type SyncState = 'idle' | 'syncing' | 'saved' | 'error' | 'unconfigured';

export interface SyncStatusInfo {
  status: SyncState;
  lastSavedAt: Date | null;
  message: string;
  error?: string | null;
}

let currentSyncStatus: SyncStatusInfo = {
  status: 'idle',
  lastSavedAt: null,
  message: 'Siap',
};

const syncListeners = new Set<(info: SyncStatusInfo) => void>();

export function getSyncStatus(): SyncStatusInfo {
  const supabase = getSupabase();
  if (!supabase && currentSyncStatus.status === 'idle') {
    return {
      status: 'unconfigured',
      lastSavedAt: null,
      message: 'Supabase belum terhubung (Klik untuk konfigurasi)',
    };
  }
  return currentSyncStatus;
}

export function setSyncStatus(
  status: SyncState,
  message: string,
  error?: string | null
) {
  currentSyncStatus = {
    status,
    lastSavedAt: status === 'saved' ? new Date() : currentSyncStatus.lastSavedAt,
    message,
    error: error ?? null,
  };
  syncListeners.forEach((listener) => {
    try {
      listener(currentSyncStatus);
    } catch (e) {
      console.warn('Sync listener error:', e);
    }
  });
}

export function subscribeSyncStatus(listener: (info: SyncStatusInfo) => void): () => void {
  syncListeners.add(listener);
  listener(getSyncStatus());
  return () => {
    syncListeners.delete(listener);
  };
}

// Helper validasi UUID v4
export function isValidUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

// Generate UUID v4 valid untuk PostgreSQL UUID column
export function ensureUuid(id?: string | null): string {
  if (id && isValidUuid(id)) return id;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback generator
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ==============================================================================
// 1. SINKRONISASI PROFILES (AKUN PENGGUNA)
// ==============================================================================

export async function syncProfileToSupabase(
  user: UserProfile & { password?: string }
): Promise<{ success: boolean; error?: string; data?: any }> {
  const supabase = getSupabase();
  if (!supabase) {
    setSyncStatus('unconfigured', 'Supabase belum terkonfigurasi');
    return { success: false, error: 'Supabase belum terkonfigurasi' };
  }

  setSyncStatus('syncing', `Menyimpan akun ${user.username} ke Supabase...`);

  try {
    const uuidId = ensureUuid(user.id);
    const payload = {
      id: uuidId,
      username: user.username.trim().toLowerCase(),
      full_name: user.fullName.trim(),
      role: user.role,
      position: user.position || (user.role === 'wali' ? 'Wali Murid' : 'Staf'),
      status: user.status || 'aktif',
      phone: user.phone || null,
      email: user.email || `${user.username.trim().toLowerCase()}@littlestar.id`,
      password: user.password || '123',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'username' })
      .select()
      .single();

    if (error) {
      console.error('Supabase profile upsert error:', error);
      setSyncStatus('error', `Gagal simpan akun: ${error.message}`, error.message);
      return { success: false, error: error.message };
    }

    setSyncStatus('saved', `Akun ${user.username} otomatis tersimpan ke Supabase`);
    return { success: true, data };
  } catch (err: any) {
    console.error('Gagal sinkron akun ke Supabase:', err);
    const msg = err.message || String(err);
    setSyncStatus('error', `Gagal simpan akun: ${msg}`, msg);
    return { success: false, error: msg };
  }
}

export async function deleteProfileFromSupabase(username: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  setSyncStatus('syncing', `Menghapus akun ${username} dari Supabase...`);
  try {
    const { error } = await supabase.from('profiles').delete().eq('username', username.toLowerCase());
    if (error) {
      console.error('Supabase profile delete error:', error);
      setSyncStatus('error', `Gagal hapus akun: ${error.message}`, error.message);
      return false;
    }
    setSyncStatus('saved', `Akun ${username} terhapus dari Supabase`);
    return true;
  } catch (err) {
    console.error('Gagal hapus profil dari Supabase:', err);
    setSyncStatus('error', 'Gagal hapus akun di Supabase');
    return false;
  }
}

export async function fetchProfilesFromSupabase(): Promise<(UserProfile & { password?: string })[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error || !data) return null;

    return data.map((d: any) => ({
      id: d.id,
      username: d.username,
      fullName: d.full_name,
      role: d.role,
      position: d.position,
      status: d.status,
      phone: d.phone,
      email: d.email,
      password: d.password || '123',
    }));
  } catch (err) {
    console.warn('Gagal memuat profil dari Supabase:', err);
    return null;
  }
}

// ==============================================================================
// 2. SINKRONISASI SISWA (STUDENTS)
// ==============================================================================

export async function syncStudentToSupabase(student: Student): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase belum terkonfigurasi' };

  setSyncStatus('syncing', `Menyimpan data siswa ${student.name} ke Supabase...`);
  try {
    const payload = {
      id: student.id,
      name: student.name,
      birth_date: student.birthDate || null,
      parent_name: student.parentName,
      parent_phone: student.parentPhone,
      parent_user_id: isValidUuid(student.parentUserId) ? student.parentUserId : null,
      address: student.address || null,
      package_id: student.packageId,
      teacher_id: student.teacherId,
      account_status: student.accountStatus || 'aktif',
      saldo_jam: Number(student.saldoJam) || 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('students').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Supabase student upsert error:', error);
      setSyncStatus('error', `Gagal simpan siswa: ${error.message}`, error.message);
      return { success: false, error: error.message };
    }
    setSyncStatus('saved', `Data siswa ${student.name} otomatis tersimpan ke Supabase`);
    return { success: true };
  } catch (err: any) {
    console.error('Gagal sinkron siswa ke Supabase:', err);
    const msg = err.message || String(err);
    setSyncStatus('error', `Gagal simpan siswa: ${msg}`, msg);
    return { success: false, error: msg };
  }
}

export async function deleteStudentFromSupabase(studentId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  setSyncStatus('syncing', `Menghapus siswa dari Supabase...`);
  try {
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    if (!error) {
      setSyncStatus('saved', 'Data siswa terhapus dari Supabase');
      return true;
    }
    setSyncStatus('error', `Gagal hapus siswa: ${error.message}`, error.message);
    return false;
  } catch {
    setSyncStatus('error', 'Gagal hapus siswa');
    return false;
  }
}

export async function fetchStudentsFromSupabase(): Promise<Student[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('students').select('*');
    if (error || !data || data.length === 0) return null;
    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      birthDate: d.birth_date,
      parentName: d.parent_name,
      parentPhone: d.parent_phone,
      parentUserId: d.parent_user_id,
      address: d.address,
      packageId: d.package_id,
      teacherId: d.teacher_id,
      accountStatus: d.account_status,
      saldoJam: Number(d.saldo_jam) || 0,
      createdAt: d.created_at,
    }));
  } catch {
    return null;
  }
}

// ==============================================================================
// 3. SINKRONISASI GURU (TEACHERS)
// ==============================================================================

export async function syncTeacherToSupabase(teacher: Teacher): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase belum terkonfigurasi' };

  setSyncStatus('syncing', `Menyimpan data guru ${teacher.name} ke Supabase...`);
  try {
    const payload = {
      id: teacher.id,
      user_id: isValidUuid(teacher.userId) ? teacher.userId : null,
      name: teacher.name,
      position: teacher.position || 'Guru Terapis',
      role: teacher.role || 'guru',
      phone: teacher.phone || null,
      address: teacher.address || null,
      join_date: teacher.joinDate || new Date().toISOString().split('T')[0],
      status: teacher.status || 'aktif',
      salary_system: teacher.salarySystem || 'per_jam',
      hourly_rate: Number(teacher.hourlyRate) || 20000,
      monthly_salary: Number(teacher.monthlySalary) || 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('teachers').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Supabase teacher upsert error:', error);
      setSyncStatus('error', `Gagal simpan guru: ${error.message}`, error.message);
      return { success: false, error: error.message };
    }
    setSyncStatus('saved', `Data guru ${teacher.name} otomatis tersimpan ke Supabase`);
    return { success: true };
  } catch (err: any) {
    console.error('Gagal sinkron guru ke Supabase:', err);
    const msg = err.message || String(err);
    setSyncStatus('error', `Gagal simpan guru: ${msg}`, msg);
    return { success: false, error: msg };
  }
}

export async function deleteTeacherFromSupabase(teacherId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  setSyncStatus('syncing', `Menghapus guru dari Supabase...`);
  try {
    const { error } = await supabase.from('teachers').delete().eq('id', teacherId);
    if (!error) {
      setSyncStatus('saved', 'Data guru terhapus dari Supabase');
      return true;
    }
    setSyncStatus('error', `Gagal hapus guru: ${error.message}`);
    return false;
  } catch {
    setSyncStatus('error', 'Gagal hapus guru');
    return false;
  }
}

export async function fetchTeachersFromSupabase(): Promise<Teacher[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('teachers').select('*');
    if (error || !data || data.length === 0) return null;
    return data.map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      name: d.name,
      position: d.position,
      role: d.role,
      phone: d.phone,
      address: d.address,
      joinDate: d.join_date,
      status: d.status,
      salarySystem: d.salary_system,
      hourlyRate: Number(d.hourly_rate),
      monthlySalary: Number(d.monthly_salary),
    }));
  } catch {
    return null;
  }
}

// ==============================================================================
// 4. SINKRONISASI PAKET TERAPI (PACKAGES)
// ==============================================================================

export async function syncPackageToSupabase(pkg: Package): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  setSyncStatus('syncing', `Menyimpan paket ${pkg.name}...`);
  try {
    const { error } = await supabase.from('packages').upsert(
      {
        id: pkg.id,
        name: pkg.name,
        duration_hours: pkg.durationHours,
        frequency_per_week: pkg.frequencyPerWeek,
        price_monthly: pkg.priceMonthly,
        description: pkg.description || '',
        is_active: pkg.isActive !== false,
      },
      { onConflict: 'id' }
    );
    if (!error) {
      setSyncStatus('saved', `Paket ${pkg.name} tersimpan ke Supabase`);
      return true;
    }
    setSyncStatus('error', `Gagal simpan paket: ${error.message}`);
    return false;
  } catch {
    setSyncStatus('error', 'Gagal simpan paket');
    return false;
  }
}

export async function fetchPackagesFromSupabase(): Promise<Package[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('packages').select('*');
    if (error || !data || data.length === 0) return null;
    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      durationHours: Number(d.duration_hours) as 1 | 2,
      frequencyPerWeek: Number(d.frequency_per_week),
      priceMonthly: Number(d.price_monthly),
      description: d.description || '',
      isActive: d.is_active !== false,
    }));
  } catch {
    return null;
  }
}

// ==============================================================================
// 5. SINKRONISASI JADWAL & SESI
// ==============================================================================

export async function syncScheduleToSupabase(schedule: MonthlySchedule): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  setSyncStatus('syncing', 'Menyimpan jadwal ke Supabase...');
  try {
    const payload = {
      id: schedule.id,
      student_id: schedule.studentId,
      teacher_id: schedule.teacherId,
      package_id: schedule.packageId,
      month_year: schedule.monthYear,
      days_config: schedule.daysConfig,
      is_active: schedule.isActive !== false,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('monthly_schedules').upsert(payload, { onConflict: 'id' });
    if (!error) {
      setSyncStatus('saved', 'Jadwal bulanan tersimpan ke Supabase');
      return true;
    }
    setSyncStatus('error', `Gagal simpan jadwal: ${error.message}`);
    return false;
  } catch {
    setSyncStatus('error', 'Gagal simpan jadwal');
    return false;
  }
}

export async function deleteScheduleFromSupabase(scheduleId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  setSyncStatus('syncing', 'Menghapus jadwal dari Supabase...');
  try {
    const { error } = await supabase.from('monthly_schedules').delete().eq('id', scheduleId);
    if (!error) {
      setSyncStatus('saved', 'Jadwal terhapus dari Supabase');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function fetchSchedulesFromSupabase(): Promise<MonthlySchedule[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('monthly_schedules').select('*');
    if (error || !data || data.length === 0) return null;
    return data.map((d: any) => ({
      id: d.id,
      studentId: d.student_id,
      teacherId: d.teacher_id,
      packageId: d.package_id,
      monthYear: d.month_year,
      daysConfig: d.days_config,
      isActive: d.is_active,
      createdAt: d.created_at,
    }));
  } catch {
    return null;
  }
}

export async function syncSessionToSupabase(session: TherapySession): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  setSyncStatus('syncing', `Menyimpan sesi ${session.sessionDate} ke Supabase...`);
  try {
    const payload = {
      id: session.id,
      schedule_id: session.scheduleId,
      student_id: session.studentId,
      teacher_id: session.teacherId,
      session_date: session.sessionDate,
      day_name: session.dayName,
      start_time: session.startTime,
      end_time: session.endTime,
      duration_hours: session.durationHours,
      attendance_status: session.attendanceStatus,
      attendance_notes: session.attendanceNotes || null,
      marked_at: session.markedAt || null,
      marked_by: session.markedBy || null,
    };
    const { error } = await supabase.from('therapy_sessions').upsert(payload, { onConflict: 'id' });
    if (!error) {
      setSyncStatus('saved', `Sesi ${session.sessionDate} otomatis tersimpan ke Supabase`);
      return true;
    }
    setSyncStatus('error', `Gagal simpan sesi: ${error.message}`);
    return false;
  } catch {
    setSyncStatus('error', 'Gagal simpan sesi');
    return false;
  }
}

export async function fetchSessionsFromSupabase(): Promise<TherapySession[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('therapy_sessions').select('*');
    if (error || !data || data.length === 0) return null;
    return data.map((d: any) => ({
      id: d.id,
      scheduleId: d.schedule_id,
      studentId: d.student_id,
      teacherId: d.teacher_id,
      sessionDate: d.session_date,
      dayName: d.day_name,
      startTime: d.start_time,
      endTime: d.end_time,
      durationHours: Number(d.duration_hours) as 1 | 2,
      attendanceStatus: d.attendance_status,
      attendanceNotes: d.attendance_notes,
      markedAt: d.marked_at,
      markedBy: d.marked_by,
    }));
  } catch {
    return null;
  }
}

// ==============================================================================
// 6. SINKRONISASI PEMBAYARAN
// ==============================================================================

export async function syncPaymentToSupabase(payment: Payment): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  setSyncStatus('syncing', `Menyimpan pembayaran ${payment.id} ke Supabase...`);
  try {
    const payload = {
      id: payment.id,
      student_id: payment.studentId,
      month_year: payment.monthYear,
      amount: payment.amount,
      status: payment.status,
      payment_date: payment.paymentDate || null,
      payment_method: payment.paymentMethod || null,
      receipt_number: payment.receiptNumber || null,
      notes: payment.notes || null,
      marked_by: payment.markedBy || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('payments').upsert(payload, { onConflict: 'id' });
    if (!error) {
      setSyncStatus('saved', `Pembayaran ${payment.id} otomatis tersimpan ke Supabase`);
      return true;
    }
    setSyncStatus('error', `Gagal simpan pembayaran: ${error.message}`);
    return false;
  } catch {
    setSyncStatus('error', 'Gagal simpan pembayaran');
    return false;
  }
}

export async function fetchPaymentsFromSupabase(): Promise<Payment[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('payments').select('*');
    if (error || !data || data.length === 0) return null;
    return data.map((d: any) => ({
      id: d.id,
      studentId: d.student_id,
      monthYear: d.month_year,
      amount: Number(d.amount),
      status: d.status,
      paymentDate: d.payment_date,
      paymentMethod: d.payment_method,
      receiptNumber: d.receipt_number,
      notes: d.notes,
      markedBy: d.marked_by,
      createdAt: d.created_at,
    }));
  } catch {
    return null;
  }
}

// ==============================================================================
// 7. SINKRONISASI IZIN SISWA & GURU
// ==============================================================================

export async function syncStudentLeaveToSupabase(leave: StudentLeave): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  setSyncStatus('syncing', 'Menyimpan izin siswa ke Supabase...');
  try {
    const payload = {
      id: leave.id,
      session_id: leave.sessionId,
      student_id: leave.studentId,
      request_date: leave.requestDate,
      session_date: leave.sessionDate,
      reason: leave.reason,
      status: leave.status,
      reviewed_by: leave.reviewedBy || null,
      reviewed_at: leave.reviewedAt || null,
      rejection_reason: leave.rejectionReason || null,
    };
    const { error } = await supabase.from('student_leaves').upsert(payload, { onConflict: 'id' });
    if (!error) {
      setSyncStatus('saved', 'Permohonan izin siswa tersimpan ke Supabase');
      return true;
    }
    setSyncStatus('error', `Gagal simpan izin: ${error.message}`);
    return false;
  } catch {
    setSyncStatus('error', 'Gagal simpan izin');
    return false;
  }
}

export async function fetchStudentLeavesFromSupabase(): Promise<StudentLeave[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('student_leaves').select('*');
    if (error || !data || data.length === 0) return null;
    return data.map((d: any) => ({
      id: d.id,
      sessionId: d.session_id,
      studentId: d.student_id,
      requestDate: d.request_date,
      sessionDate: d.session_date,
      reason: d.reason,
      status: d.status,
      reviewedBy: d.reviewed_by,
      reviewedAt: d.reviewed_at,
      rejectionReason: d.rejection_reason,
    }));
  } catch {
    return null;
  }
}

export async function syncTeacherLeaveToSupabase(leave: TeacherLeave): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  setSyncStatus('syncing', 'Menyimpan izin guru ke Supabase...');
  try {
    const payload = {
      id: leave.id,
      teacher_id: leave.teacherId,
      leave_date: leave.leaveDate,
      reason: leave.reason,
      status: leave.status,
      reviewed_by: leave.reviewedBy || null,
      reviewed_at: leave.reviewedAt || null,
    };
    const { error } = await supabase.from('teacher_leaves').upsert(payload, { onConflict: 'id' });
    if (!error) {
      setSyncStatus('saved', 'Izin guru tersimpan ke Supabase');
      return true;
    }
    setSyncStatus('error', `Gagal simpan izin guru: ${error.message}`);
    return false;
  } catch {
    setSyncStatus('error', 'Gagal simpan izin guru');
    return false;
  }
}

export async function fetchTeacherLeavesFromSupabase(): Promise<TeacherLeave[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('teacher_leaves').select('*');
    if (error || !data || data.length === 0) return null;
    return data.map((d: any) => ({
      id: d.id,
      teacherId: d.teacher_id,
      leaveDate: d.leave_date,
      reason: d.reason,
      status: d.status,
      reviewedBy: d.reviewed_by,
      reviewedAt: d.reviewed_at,
    }));
  } catch {
    return null;
  }
}

// ==============================================================================
// 8. SINKRONISASI SALDO JAM
// ==============================================================================

export async function syncSaldoHistoryToSupabase(history: SaldoJamHistory): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  setSyncStatus('syncing', 'Menyimpan histori saldo jam ke Supabase...');
  try {
    const payload = {
      id: history.id,
      student_id: history.studentId,
      type: history.type,
      amount_hours: history.amountHours,
      description: history.description,
      session_id: history.sessionId || null,
    };
    const { error } = await supabase.from('saldo_jam_history').upsert(payload, { onConflict: 'id' });
    if (!error) {
      setSyncStatus('saved', 'Histori saldo jam tersimpan ke Supabase');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function fetchSaldoHistoryFromSupabase(): Promise<SaldoJamHistory[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('saldo_jam_history').select('*');
    if (error || !data || data.length === 0) return null;
    return data.map((d: any) => ({
      id: d.id,
      studentId: d.student_id,
      type: d.type,
      amountHours: Number(d.amount_hours),
      description: d.description,
      sessionId: d.session_id,
      createdAt: d.created_at,
    }));
  } catch {
    return null;
  }
}

// ==============================================================================
// 9. SINKRONISASI MASSAL SEMUA DATA DARI FRONTEND KE SUPABASE
// ==============================================================================

export async function pushAllLocalDataToSupabase(data: {
  users: (UserProfile & { password?: string })[];
  packages: Package[];
  teachers: Teacher[];
  students: Student[];
  schedules: MonthlySchedule[];
  sessions: TherapySession[];
  payments: Payment[];
  studentLeaves?: StudentLeave[];
  teacherLeaves?: TeacherLeave[];
  saldoHistory?: SaldoJamHistory[];
}): Promise<{
  success: boolean;
  totalSynced: number;
  details: string;
  errors: string[];
}> {
  const supabase = getSupabase();
  if (!supabase) {
    setSyncStatus('unconfigured', 'Supabase belum terkonfigurasi');
    return {
      success: false,
      totalSynced: 0,
      details: 'Kredensial Supabase belum diisi.',
      errors: ['Supabase client tidak tersedia'],
    };
  }

  setSyncStatus('syncing', 'Menyinkronkan seluruh data ke Supabase...');

  const errors: string[] = [];
  let count = 0;

  // 1. Sync Profiles
  for (const user of data.users) {
    const res = await syncProfileToSupabase(user);
    if (res.success) {
      count++;
    } else if (res.error) {
      errors.push(`Akun ${user.username}: ${res.error}`);
    }
  }

  // 2. Sync Packages
  for (const pkg of data.packages) {
    const ok = await syncPackageToSupabase(pkg);
    if (ok) count++;
    else errors.push(`Paket ${pkg.id}`);
  }

  // 3. Sync Teachers
  for (const teacher of data.teachers) {
    const res = await syncTeacherToSupabase(teacher);
    if (res.success) count++;
    else if (res.error) errors.push(`Guru ${teacher.name}: ${res.error}`);
  }

  // 4. Sync Students
  for (const student of data.students) {
    const res = await syncStudentToSupabase(student);
    if (res.success) count++;
    else if (res.error) errors.push(`Siswa ${student.name}: ${res.error}`);
  }

  // 5. Sync Schedules & Sessions
  for (const schedule of data.schedules) {
    const ok = await syncScheduleToSupabase(schedule);
    if (ok) count++;
  }
  for (const session of data.sessions) {
    const ok = await syncSessionToSupabase(session);
    if (ok) count++;
  }

  // 6. Sync Payments
  for (const payment of data.payments) {
    const ok = await syncPaymentToSupabase(payment);
    if (ok) count++;
  }

  // 7. Sync Student Leaves
  if (data.studentLeaves) {
    for (const leave of data.studentLeaves) {
      const ok = await syncStudentLeaveToSupabase(leave);
      if (ok) count++;
    }
  }

  // 8. Sync Teacher Leaves
  if (data.teacherLeaves) {
    for (const leave of data.teacherLeaves) {
      const ok = await syncTeacherLeaveToSupabase(leave);
      if (ok) count++;
    }
  }

  // 9. Sync Saldo History
  if (data.saldoHistory) {
    for (const history of data.saldoHistory) {
      const ok = await syncSaldoHistoryToSupabase(history);
      if (ok) count++;
    }
  }

  const success = errors.length === 0;
  const details = `Berhasil menyinkronkan ${count} record ke database Supabase.${
    errors.length > 0 ? ` (${errors.length} gagal)` : ''
  }`;

  if (success) {
    setSyncStatus('saved', `Seluruh data (${count} item) berhasil tersinkron ke Supabase`);
  } else {
    setSyncStatus('error', `Sinkronisasi selesai dengan ${errors.length} kendala`, errors.join(', '));
  }

  return { success, totalSynced: count, details, errors };
}
