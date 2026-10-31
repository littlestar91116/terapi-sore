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
  Payroll,
  FinancialSettings,
  RolePermission,
} from '../types';

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
  if (!supabase) return { success: false, error: 'Supabase belum terkonfigurasi' };

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
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Gagal sinkron akun ke Supabase:', err);
    return { success: false, error: err.message || String(err) };
  }
}

export async function deleteProfileFromSupabase(username: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('profiles').delete().eq('username', username);
    if (error) {
      console.error('Supabase profile delete error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Gagal hapus profil dari Supabase:', err);
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
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Gagal sinkron siswa ke Supabase:', err);
    return { success: false, error: err.message || String(err) };
  }
}

export async function deleteStudentFromSupabase(studentId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    return !error;
  } catch {
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
      saldoJam: d.saldo_jam,
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
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Gagal sinkron guru ke Supabase:', err);
    return { success: false, error: err.message || String(err) };
  }
}

export async function deleteTeacherFromSupabase(teacherId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('teachers').delete().eq('id', teacherId);
    return !error;
  } catch {
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
// 4. SINKRONISASI JADWAL & SESI
// ==============================================================================

export async function syncScheduleToSupabase(schedule: MonthlySchedule): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
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
    return !error;
  } catch {
    return false;
  }
}

export async function syncSessionToSupabase(session: TherapySession): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
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
    return !error;
  } catch {
    return false;
  }
}

// ==============================================================================
// 5. SINKRONISASI PEMBAYARAN
// ==============================================================================

export async function syncPaymentToSupabase(payment: Payment): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
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
    return !error;
  } catch {
    return false;
  }
}

// ==============================================================================
// 6. SINKRONISASI IZIN SISWA & GURU
// ==============================================================================

export async function syncStudentLeaveToSupabase(leave: StudentLeave): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
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
    return !error;
  } catch {
    return false;
  }
}

export async function syncTeacherLeaveToSupabase(leave: TeacherLeave): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
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
    return !error;
  } catch {
    return false;
  }
}

// ==============================================================================
// 7. SINKRONISASI SALDO JAM
// ==============================================================================

export async function syncSaldoHistoryToSupabase(history: SaldoJamHistory): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
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
    return !error;
  } catch {
    return false;
  }
}

// ==============================================================================
// 8. SINKRONISASI MASSAL SEMUA DATA DARI FRONTEND KE SUPABASE
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
    return {
      success: false,
      totalSynced: 0,
      details: 'Kredensial Supabase belum diisi.',
      errors: ['Supabase client tidak tersedia'],
    };
  }

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
    if (!error) count++;
    else errors.push(`Paket ${pkg.id}: ${error.message}`);
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

  const success = errors.length === 0;
  const details = `Berhasil menyinkronkan ${count} record ke database Supabase.${
    errors.length > 0 ? ` (${errors.length} gagal)` : ''
  }`;

  return { success, totalSynced: count, details, errors };
}
