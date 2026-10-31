import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Package,
  Teacher,
  Student,
  MonthlySchedule,
  TherapySession,
  StudentLeave,
  TeacherLeave,
  SaldoJamHistory,
  Payment,
  Payroll,
  FinancialSettings,
  AttendanceStatus,
  LeaveStatus,
  PaymentMethod,
} from '../types';
import {
  SEED_PACKAGES,
  SEED_TEACHERS,
  SEED_STUDENTS,
  SEED_SCHEDULES,
  SEED_SESSIONS,
  SEED_STUDENT_LEAVES,
  SEED_TEACHER_LEAVES,
  SEED_SALDO_HISTORY,
  SEED_PAYMENTS,
  SEED_PAYROLLS,
  SEED_FINANCIAL_SETTINGS,
  CURRENT_MONTH,
} from '../data/seedData';
import { generateSessionsForMonth, checkScheduleClash } from '../lib/scheduleHelpers';
import {
  syncStudentToSupabase,
  deleteStudentFromSupabase,
  fetchStudentsFromSupabase,
  syncTeacherToSupabase,
  deleteTeacherFromSupabase,
  fetchTeachersFromSupabase,
  syncPackageToSupabase,
  fetchPackagesFromSupabase,
  syncScheduleToSupabase,
  deleteScheduleFromSupabase,
  fetchSchedulesFromSupabase,
  syncSessionToSupabase,
  fetchSessionsFromSupabase,
  syncPaymentToSupabase,
  fetchPaymentsFromSupabase,
  syncStudentLeaveToSupabase,
  fetchStudentLeavesFromSupabase,
  syncTeacherLeaveToSupabase,
  fetchTeacherLeavesFromSupabase,
  syncSaldoHistoryToSupabase,
  fetchSaldoHistoryFromSupabase,
  pushAllLocalDataToSupabase,
  subscribeSyncStatus,
  getSyncStatus,
  SyncStatusInfo,
} from '../lib/supabaseSync';
import { getSupabase } from '../lib/supabase';

interface DataContextType {
  // Master Packages
  packages: Package[];
  updatePackage: (pkg: Package) => void;
  addPackage: (pkg: Package) => void;

  // Teachers
  teachers: Teacher[];
  addTeacher: (teacher: Teacher) => void;
  updateTeacher: (teacher: Teacher) => void;
  deleteTeacher: (id: string) => void;

  // Students
  students: Student[];
  addStudent: (student: Student) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  toggleStudentFreeze: (id: string, freeze: boolean) => void;

  // Schedules & Sessions
  schedules: MonthlySchedule[];
  sessions: TherapySession[];
  createScheduleWithSessions: (scheduleData: Omit<MonthlySchedule, 'id' | 'createdAt'>) => {
    success: boolean;
    message?: string;
  };
  deleteSchedule: (scheduleId: string) => void;

  // Attendance
  markAttendance: (
    sessionId: string,
    status: AttendanceStatus,
    notes?: string,
    markedBy?: string
  ) => void;

  // Student Leaves (Khusus paket 2 jam)
  studentLeaves: StudentLeave[];
  requestStudentLeave: (
    studentId: string,
    sessionId: string,
    sessionDate: string,
    reason: string
  ) => { success: boolean; message: string };
  reviewStudentLeave: (
    leaveId: string,
    status: 'disetujui' | 'ditolak',
    reviewerName: string,
    rejectionReason?: string
  ) => void;

  // Teacher Leaves
  teacherLeaves: TeacherLeave[];
  requestTeacherLeave: (teacherId: string, leaveDate: string, reason: string) => void;
  reviewTeacherLeave: (
    leaveId: string,
    status: 'disetujui' | 'ditolak',
    reviewerName: string
  ) => void;

  // Saldo Jam
  saldoHistory: SaldoJamHistory[];
  batchInputSchoolHoliday: (holidayDate: string, description: string) => number;
  useStudentSaldoJam: (studentId: string, hours: number, description: string) => boolean;

  // Payments
  payments: Payment[];
  markPaymentStatus: (
    paymentId: string,
    status: 'lunas' | 'belum_lunas',
    method?: PaymentMethod,
    markedBy?: string,
    notes?: string
  ) => void;
  generateMonthlyPayments: (monthYear: string) => void;

  // Financial Settings & Payroll
  financialSettings: FinancialSettings;
  updateFinancialSettings: (settings: FinancialSettings) => void;
  payrolls: Payroll[];
  calculatePayrollForMonth: (monthYear: string) => void;
  markPayrollPaid: (payrollId: string) => void;

  // Active filter month
  activeMonth: string;
  setActiveMonth: (month: string) => void;

  // Supabase Sync Action & Real-time Status
  syncStatus: SyncStatusInfo;
  syncAllToSupabase: (usersList: any[]) => Promise<{
    success: boolean;
    totalSynced: number;
    details: string;
    errors: string[];
  }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Local Storage Keys
const LS_PREFIX = 'terapi_data_';

function getInitialData<T>(key: string, seed: T): T {
  const saved = localStorage.getItem(LS_PREFIX + key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return seed;
    }
  }
  return seed;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMonth, setActiveMonth] = useState<string>(CURRENT_MONTH);
  const [syncStatus, setSyncStatusState] = useState<SyncStatusInfo>(() => getSyncStatus());

  const [packages, setPackages] = useState<Package[]>(() =>
    getInitialData('packages', SEED_PACKAGES)
  );
  const [teachers, setTeachers] = useState<Teacher[]>(() =>
    getInitialData('teachers', SEED_TEACHERS)
  );
  const [students, setStudents] = useState<Student[]>(() =>
    getInitialData('students', SEED_STUDENTS)
  );
  const [schedules, setSchedules] = useState<MonthlySchedule[]>(() =>
    getInitialData('schedules', SEED_SCHEDULES)
  );
  const [sessions, setSessions] = useState<TherapySession[]>(() =>
    getInitialData('sessions', SEED_SESSIONS)
  );
  const [studentLeaves, setStudentLeaves] = useState<StudentLeave[]>(() =>
    getInitialData('student_leaves', SEED_STUDENT_LEAVES)
  );
  const [teacherLeaves, setTeacherLeaves] = useState<TeacherLeave[]>(() =>
    getInitialData('teacher_leaves', SEED_TEACHER_LEAVES)
  );
  const [saldoHistory, setSaldoHistory] = useState<SaldoJamHistory[]>(() =>
    getInitialData('saldo_history', SEED_SALDO_HISTORY)
  );
  const [payments, setPayments] = useState<Payment[]>(() =>
    getInitialData('payments', SEED_PAYMENTS)
  );
  const [payrolls, setPayrolls] = useState<Payroll[]>(() =>
    getInitialData('payrolls', SEED_PAYROLLS)
  );
  const [financialSettings, setFinancialSettings] = useState<FinancialSettings>(() =>
    getInitialData('financial_settings', SEED_FINANCIAL_SETTINGS)
  );

  // Status sinkronisasi real-time
  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((info) => {
      setSyncStatusState(info);
    });
    return unsubscribe;
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(LS_PREFIX + 'packages', JSON.stringify(packages));
  }, [packages]);
  useEffect(() => {
    localStorage.setItem(LS_PREFIX + 'teachers', JSON.stringify(teachers));
  }, [teachers]);
  useEffect(() => {
    localStorage.setItem(LS_PREFIX + 'students', JSON.stringify(students));
  }, [students]);
  useEffect(() => {
    localStorage.setItem(LS_PREFIX + 'schedules', JSON.stringify(schedules));
  }, [schedules]);
  useEffect(() => {
    localStorage.setItem(LS_PREFIX + 'sessions', JSON.stringify(sessions));
  }, [sessions]);
  useEffect(() => {
    localStorage.setItem(LS_PREFIX + 'student_leaves', JSON.stringify(studentLeaves));
  }, [studentLeaves]);
  useEffect(() => {
    localStorage.setItem(LS_PREFIX + 'teacher_leaves', JSON.stringify(teacherLeaves));
  }, [teacherLeaves]);
  useEffect(() => {
    localStorage.setItem(LS_PREFIX + 'saldo_history', JSON.stringify(saldoHistory));
  }, [saldoHistory]);
  useEffect(() => {
    localStorage.setItem(LS_PREFIX + 'payments', JSON.stringify(payments));
  }, [payments]);
  useEffect(() => {
    localStorage.setItem(LS_PREFIX + 'payrolls', JSON.stringify(payrolls));
  }, [payrolls]);
  useEffect(() => {
    localStorage.setItem(LS_PREFIX + 'financial_settings', JSON.stringify(financialSettings));
  }, [financialSettings]);

  // Flag untuk mendeteksi apakah data awal dari Supabase sudah selesai dimuat
  const isInitialLoadDoneRef = useRef(false);

  // Muat data dari Supabase saat aplikasi dibuka jika Supabase terhubung
  useEffect(() => {
    async function loadRemoteData() {
      const client = getSupabase();
      if (!client) {
        isInitialLoadDoneRef.current = true;
        return;
      }

      try {
        const [
          remoteStudents,
          remoteTeachers,
          remotePackages,
          remoteSchedules,
          remoteSessions,
          remotePayments,
          remoteStudentLeaves,
          remoteTeacherLeaves,
          remoteSaldoHistory,
        ] = await Promise.all([
          fetchStudentsFromSupabase(),
          fetchTeachersFromSupabase(),
          fetchPackagesFromSupabase(),
          fetchSchedulesFromSupabase(),
          fetchSessionsFromSupabase(),
          fetchPaymentsFromSupabase(),
          fetchStudentLeavesFromSupabase(),
          fetchTeacherLeavesFromSupabase(),
          fetchSaldoHistoryFromSupabase(),
        ]);

        if (remoteStudents && remoteStudents.length > 0) {
          setStudents((prev) => {
            const merged = [...prev];
            for (const r of remoteStudents) {
              const idx = merged.findIndex((m) => m.id === r.id);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...r };
              else merged.push(r);
            }
            return merged;
          });
        }

        if (remoteTeachers && remoteTeachers.length > 0) {
          setTeachers((prev) => {
            const merged = [...prev];
            for (const r of remoteTeachers) {
              const idx = merged.findIndex((m) => m.id === r.id);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...r };
              else merged.push(r);
            }
            return merged;
          });
        }

        if (remotePackages && remotePackages.length > 0) {
          setPackages((prev) => {
            const merged = [...prev];
            for (const r of remotePackages) {
              const idx = merged.findIndex((m) => m.id === r.id);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...r };
              else merged.push(r);
            }
            return merged;
          });
        }

        if (remoteSchedules && remoteSchedules.length > 0) {
          setSchedules((prev) => {
            const merged = [...prev];
            for (const r of remoteSchedules) {
              const idx = merged.findIndex((m) => m.id === r.id);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...r };
              else merged.push(r);
            }
            return merged;
          });
        }

        if (remoteSessions && remoteSessions.length > 0) {
          setSessions((prev) => {
            const merged = [...prev];
            for (const r of remoteSessions) {
              const idx = merged.findIndex((m) => m.id === r.id);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...r };
              else merged.push(r);
            }
            return merged;
          });
        }

        if (remotePayments && remotePayments.length > 0) {
          setPayments((prev) => {
            const merged = [...prev];
            for (const r of remotePayments) {
              const idx = merged.findIndex((m) => m.id === r.id);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...r };
              else merged.push(r);
            }
            return merged;
          });
        }

        if (remoteStudentLeaves && remoteStudentLeaves.length > 0) {
          setStudentLeaves((prev) => {
            const merged = [...prev];
            for (const r of remoteStudentLeaves) {
              const idx = merged.findIndex((m) => m.id === r.id);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...r };
              else merged.push(r);
            }
            return merged;
          });
        }

        if (remoteTeacherLeaves && remoteTeacherLeaves.length > 0) {
          setTeacherLeaves((prev) => {
            const merged = [...prev];
            for (const r of remoteTeacherLeaves) {
              const idx = merged.findIndex((m) => m.id === r.id);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...r };
              else merged.push(r);
            }
            return merged;
          });
        }

        if (remoteSaldoHistory && remoteSaldoHistory.length > 0) {
          setSaldoHistory((prev) => {
            const merged = [...prev];
            for (const r of remoteSaldoHistory) {
              const idx = merged.findIndex((m) => m.id === r.id);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...r };
              else merged.push(r);
            }
            return merged;
          });
        }
      } catch (e) {
        console.warn('Gagal sinkron awal dari Supabase:', e);
      } finally {
        isInitialLoadDoneRef.current = true;
      }
    }

    loadRemoteData();
  }, []);

  // Packages CRUD
  const updatePackage = (pkg: Package) => {
    setPackages((prev) => prev.map((p) => (p.id === pkg.id ? pkg : p)));
    syncPackageToSupabase(pkg);
  };

  const addPackage = (pkg: Package) => {
    setPackages((prev) => [...prev, pkg]);
    syncPackageToSupabase(pkg);
  };

  // Teachers CRUD
  const addTeacher = (teacher: Teacher) => {
    setTeachers((prev) => [...prev, teacher]);
    syncTeacherToSupabase(teacher);
  };

  const updateTeacher = (teacher: Teacher) => {
    setTeachers((prev) => prev.map((t) => (t.id === teacher.id ? teacher : t)));
    syncTeacherToSupabase(teacher);
  };

  const deleteTeacher = (id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    deleteTeacherFromSupabase(id);
  };

  // Students CRUD & Freeze
  const addStudent = (student: Student) => {
    setStudents((prev) => [...prev, student]);
    syncStudentToSupabase(student);

    // Buat juga billing bulan ini otomatis jika belum ada
    const targetPkg = packages.find((p) => p.id === student.packageId);
    if (targetPkg) {
      const newPayment: Payment = {
        id: `INV-${Date.now().toString(36).toUpperCase()}`,
        studentId: student.id,
        monthYear: activeMonth,
        amount: targetPkg.priceMonthly,
        status: 'belum_lunas',
        createdAt: new Date().toISOString(),
      };
      setPayments((prev) => [...prev, newPayment]);
      syncPaymentToSupabase(newPayment);
    }
  };

  const updateStudent = (student: Student) => {
    setStudents((prev) => prev.map((s) => (s.id === student.id ? student : s)));
    syncStudentToSupabase(student);
  };

  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setSessions((prev) => prev.filter((s) => s.studentId !== id));
    setSchedules((prev) => prev.filter((s) => s.studentId !== id));
    setPayments((prev) => prev.filter((p) => p.studentId !== id));
    deleteStudentFromSupabase(id);
  };

  const toggleStudentFreeze = (id: string, freeze: boolean) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const newStatus = freeze ? 'dibekukan' : 'aktif';
          const updated: Student = { ...s, accountStatus: newStatus };
          syncStudentToSupabase(updated);
          return updated;
        }
        return s;
      })
    );
  };

  // Schedules & Sessions generator
  const createScheduleWithSessions = (
    scheduleData: Omit<MonthlySchedule, 'id' | 'createdAt'>
  ): { success: boolean; message?: string } => {
    const pkg = packages.find((p) => p.id === scheduleData.packageId);
    if (!pkg) {
      return { success: false, message: 'Paket terapi tidak ditemukan.' };
    }

    // Validasi kuota hari harus sama persis dengan frekuensi paket
    if (scheduleData.daysConfig.length !== pkg.frequencyPerWeek) {
      return {
        success: false,
        message: `Paket ini membutuhkan tepat ${pkg.frequencyPerWeek} hari per minggu. Anda memilih ${scheduleData.daysConfig.length} hari.`,
      };
    }

    const scheduleId = `JDW-${Date.now().toString(36).toUpperCase()}`;
    const newSchedule: MonthlySchedule = {
      ...scheduleData,
      id: scheduleId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    // Generate semua tanggal sesi dalam sebulan
    const generated = generateSessionsForMonth({
      scheduleId,
      studentId: scheduleData.studentId,
      teacherId: scheduleData.teacherId,
      monthYear: scheduleData.monthYear,
      daysConfig: scheduleData.daysConfig,
    });

    // Filter keluar sesi lama milik siswa ini di bulan ini agar tidak bentrok dengan diri sendiri saat edit
    const otherSessions = sessions.filter(
      (s) => !(s.studentId === scheduleData.studentId && s.sessionDate.startsWith(scheduleData.monthYear))
    );

    // Cek bentrok dengan sesi yang sudah ada pada guru yang sama
    for (const session of generated) {
      const clash = checkScheduleClash(otherSessions, {
        teacherId: session.teacherId,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
      });

      if (clash) {
        return {
          success: false,
          message: `Bentrok jadwal! Guru sudah memiliki sesi lain pada tanggal ${session.sessionDate} pukul ${session.startTime} - ${session.endTime}. Silakan pilih jam atau hari lain.`,
        };
      }
    }

    // Berhasil, simpan jadwal & sesi
    const newSessionsWithIds: TherapySession[] = generated.map((s, index) => ({
      ...s,
      id: `SES-${Date.now().toString(36).toUpperCase()}-${index + 1}`,
    }));

    setSchedules((prev) => [
      ...prev.filter(
        (sc) => !(sc.studentId === scheduleData.studentId && sc.monthYear === scheduleData.monthYear)
      ),
      newSchedule,
    ]);
    setSessions((prev) => [
      ...otherSessions,
      ...newSessionsWithIds,
    ]);

    // Kirim langsung otomatis ke Supabase
    syncScheduleToSupabase(newSchedule);
    newSessionsWithIds.forEach((s) => syncSessionToSupabase(s));

    return { success: true };
  };

  const deleteSchedule = (scheduleId: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    setSessions((prev) => prev.filter((s) => s.scheduleId !== scheduleId));
    deleteScheduleFromSupabase(scheduleId);
  };

  // Mark Attendance + Otomatis Saldo Jam jika "Libur dari sekolah"
  const markAttendance = (
    sessionId: string,
    status: AttendanceStatus,
    notes?: string,
    markedBy?: string
  ) => {
    const targetSession = sessions.find((s) => s.id === sessionId);
    if (!targetSession) return;

    const previousStatus = targetSession.attendanceStatus;
    const updatedSession: TherapySession = {
      ...targetSession,
      attendanceStatus: status,
      attendanceNotes: notes !== undefined ? notes : targetSession.attendanceNotes,
      markedAt: new Date().toISOString(),
      markedBy: markedBy || targetSession.markedBy,
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? updatedSession : s))
    );
    // Kirim absensi ke Supabase
    syncSessionToSupabase(updatedSession);

    // Aturan Saldo Jam: Jika sesi dibatalkan karena sekolah meliburkan, jam tersebut otomatis masuk menjadi saldo jam siswa
    if (status === 'Libur dari sekolah' && previousStatus !== 'Libur dari sekolah') {
      const hoursToAdd = targetSession.durationHours;
      setStudents((prev) =>
        prev.map((st) => {
          if (st.id === targetSession.studentId) {
            const updatedSt = { ...st, saldoJam: st.saldoJam + hoursToAdd };
            syncStudentToSupabase(updatedSt);
            return updatedSt;
          }
          return st;
        })
      );

      const historyItem: SaldoJamHistory = {
        id: `SLD-${Date.now().toString(36).toUpperCase()}`,
        studentId: targetSession.studentId,
        type: 'penambahan',
        amountHours: hoursToAdd,
        description: `Sesi diliburkan sekolah pada ${targetSession.sessionDate} (${targetSession.startTime} - ${targetSession.endTime})`,
        sessionId: targetSession.id,
        createdAt: new Date().toISOString(),
      };
      setSaldoHistory((prev) => [historyItem, ...prev]);
      syncSaldoHistoryToSupabase(historyItem);
    }
  };

  // Student Leaves: Khusus Paket 2 Jam
  const requestStudentLeave = (
    studentId: string,
    sessionId: string,
    sessionDate: string,
    reason: string
  ): { success: boolean; message: string } => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return { success: false, message: 'Data siswa tidak ditemukan.' };

    const pkg = packages.find((p) => p.id === student.packageId);
    if (!pkg || pkg.durationHours !== 2) {
      return {
        success: false,
        message: 'Pengajuan izin hanya diizinkan untuk siswa dengan paket 2 jam.',
      };
    }

    if (student.accountStatus === 'dibekukan') {
      return {
        success: false,
        message: 'Akun dibekukan. Harap selesaikan pembayaran sebelum mengajukan izin.',
      };
    }

    const newLeave: StudentLeave = {
      id: `IZS-${Date.now().toString(36).toUpperCase()}`,
      sessionId,
      studentId,
      requestDate: new Date().toISOString().split('T')[0],
      sessionDate,
      reason,
      status: 'menunggu',
    };

    setStudentLeaves((prev) => [newLeave, ...prev]);
    syncStudentLeaveToSupabase(newLeave);
    return { success: true, message: 'Permohonan izin berhasil diajukan.' };
  };

  const reviewStudentLeave = (
    leaveId: string,
    status: 'disetujui' | 'ditolak',
    reviewerName: string,
    rejectionReason?: string
  ) => {
    const targetLeave = studentLeaves.find((l) => l.id === leaveId);
    if (!targetLeave) return;

    const updatedLeave: StudentLeave = {
      ...targetLeave,
      status,
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
      rejectionReason,
    };

    setStudentLeaves((prev) =>
      prev.map((l) => (l.id === leaveId ? updatedLeave : l))
    );
    syncStudentLeaveToSupabase(updatedLeave);

    // Jika disetujui, ubah status absensi sesi terkait menjadi 'Izin'
    if (status === 'disetujui') {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === targetLeave.sessionId) {
            const updatedSes: TherapySession = {
              ...s,
              attendanceStatus: 'Izin',
              attendanceNotes: `Izin disetujui: ${targetLeave.reason}`,
              markedAt: new Date().toISOString(),
              markedBy: reviewerName,
            };
            syncSessionToSupabase(updatedSes);
            return updatedSes;
          }
          return s;
        })
      );
    }
  };

  // Teacher Leaves
  const requestTeacherLeave = (teacherId: string, leaveDate: string, reason: string) => {
    const newLeave: TeacherLeave = {
      id: `IZG-${Date.now().toString(36).toUpperCase()}`,
      teacherId,
      leaveDate,
      reason,
      status: 'menunggu',
    };
    setTeacherLeaves((prev) => [newLeave, ...prev]);
    syncTeacherLeaveToSupabase(newLeave);
  };

  const reviewTeacherLeave = (
    leaveId: string,
    status: 'disetujui' | 'ditolak',
    reviewerName: string
  ) => {
    setTeacherLeaves((prev) =>
      prev.map((l) => {
        if (l.id === leaveId) {
          const updated: TeacherLeave = {
            ...l,
            status,
            reviewedBy: reviewerName,
            reviewedAt: new Date().toISOString(),
          };
          syncTeacherLeaveToSupabase(updated);
          return updated;
        }
        return l;
      })
    );
  };

  // Batch input hari libur sekolah
  const batchInputSchoolHoliday = (holidayDate: string, description: string): number => {
    const matchingSessions = sessions.filter(
      (s) => s.sessionDate === holidayDate && s.attendanceStatus !== 'Libur dari sekolah'
    );

    if (matchingSessions.length === 0) return 0;

    // Update semua sesi tersebut menjadi Libur dari sekolah
    setSessions((prev) =>
      prev.map((s) => {
        if (s.sessionDate === holidayDate) {
          const updated: TherapySession = {
            ...s,
            attendanceStatus: 'Libur dari sekolah',
            attendanceNotes: description || 'Diliburkan sekolah',
            markedAt: new Date().toISOString(),
          };
          syncSessionToSupabase(updated);
          return updated;
        }
        return s;
      })
    );

    // Tambahkan saldo jam ke masing-masing siswa
    const newHistories: SaldoJamHistory[] = [];
    setStudents((prev) =>
      prev.map((student) => {
        const studentSessionsOnDate = matchingSessions.filter((s) => s.studentId === student.id);
        const hoursToAdd = studentSessionsOnDate.reduce((sum, s) => sum + s.durationHours, 0);

        if (hoursToAdd > 0) {
          const historyItem: SaldoJamHistory = {
            id: `SLD-${Date.now().toString(36).toUpperCase()}-${student.id}`,
            studentId: student.id,
            type: 'penambahan',
            amountHours: hoursToAdd,
            description: `${description || 'Sekolah meliburkan'} pada tanggal ${holidayDate}`,
            createdAt: new Date().toISOString(),
          };
          newHistories.push(historyItem);
          syncSaldoHistoryToSupabase(historyItem);

          const updatedStudent = { ...student, saldoJam: student.saldoJam + hoursToAdd };
          syncStudentToSupabase(updatedStudent);
          return updatedStudent;
        }
        return student;
      })
    );

    setSaldoHistory((prev) => [...newHistories, ...prev]);
    return matchingSessions.length;
  };

  // Pemakaian Saldo Jam (Sesi Pengganti)
  const useStudentSaldoJam = (studentId: string, hours: number, description: string): boolean => {
    const target = students.find((s) => s.id === studentId);
    if (!target || target.saldoJam < hours) return false;

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          const updated = { ...s, saldoJam: s.saldoJam - hours };
          syncStudentToSupabase(updated);
          return updated;
        }
        return s;
      })
    );

    const history: SaldoJamHistory = {
      id: `SLD-${Date.now().toString(36).toUpperCase()}`,
      studentId,
      type: 'pemakaian',
      amountHours: hours,
      description: description || 'Pemakaian saldo jam untuk sesi terapi pengganti',
      createdAt: new Date().toISOString(),
    };
    setSaldoHistory((prev) => [history, ...prev]);
    syncSaldoHistoryToSupabase(history);
    return true;
  };

  // Payments
  const markPaymentStatus = (
    paymentId: string,
    status: 'lunas' | 'belum_lunas',
    method: PaymentMethod = 'Tunai',
    markedBy = 'Admin',
    notes?: string
  ) => {
    setPayments((prev) =>
      prev.map((p) => {
        if (p.id === paymentId) {
          const isNowLunas = status === 'lunas';
          const receiptNumber = isNowLunas
            ? p.receiptNumber ||
              `KWT/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(
                1000 + Math.random() * 9000
              )}`
            : undefined;

          const updated: Payment = {
            ...p,
            status,
            paymentDate: isNowLunas ? new Date().toISOString().split('T')[0] : undefined,
            paymentMethod: isNowLunas ? method : undefined,
            receiptNumber,
            markedBy: isNowLunas ? markedBy : undefined,
            notes: notes !== undefined ? notes : p.notes,
          };
          syncPaymentToSupabase(updated);
          return updated;
        }
        return p;
      })
    );
  };

  const generateMonthlyPayments = (monthYear: string) => {
    const existingStudentPayments = new Set(
      payments.filter((p) => p.monthYear === monthYear).map((p) => p.studentId)
    );

    const newPayments: Payment[] = [];
    students.forEach((student) => {
      if (!existingStudentPayments.has(student.id)) {
        const pkg = packages.find((p) => p.id === student.packageId);
        if (pkg) {
          const item: Payment = {
            id: `INV-${Date.now().toString(36).toUpperCase()}-${student.id}`,
            studentId: student.id,
            monthYear,
            amount: pkg.priceMonthly,
            status: 'belum_lunas',
            createdAt: new Date().toISOString(),
          };
          newPayments.push(item);
          syncPaymentToSupabase(item);
        }
      }
    });

    if (newPayments.length > 0) {
      setPayments((prev) => [...prev, ...newPayments]);
    }
  };

  // Financial Settings & Payroll Calculation
  const updateFinancialSettings = (settings: FinancialSettings) => {
    setFinancialSettings(settings);
  };

  const calculatePayrollForMonth = (monthYear: string) => {
    const calculatedPayrolls: Payroll[] = teachers.map((teacher) => {
      const taughtSessions = sessions.filter(
        (s) =>
          s.teacherId === teacher.id &&
          s.sessionDate.startsWith(monthYear) &&
          s.attendanceStatus === 'Hadir'
      );

      const totalHoursTaught = taughtSessions.reduce((sum, s) => sum + s.durationHours, 0);

      const approvedLeaves = teacherLeaves.filter(
        (l) =>
          l.teacherId === teacher.id &&
          l.leaveDate.startsWith(monthYear) &&
          l.status === 'disetujui'
      );
      const totalLeaveDays = approvedLeaves.length;

      const bonusFullAttendance = totalLeaveDays === 0 ? financialSettings.fullAttendanceBonus : 0;
      const deductionLeave =
        totalLeaveDays > 1 ? totalLeaveDays * financialSettings.dailyLeaveDeduction : 0;

      let baseSalary = 0;
      let totalAmount = 0;

      if (teacher.salarySystem === 'per_jam') {
        const rate = teacher.hourlyRate || financialSettings.defaultHourlyRate;
        baseSalary = totalHoursTaught * rate;
        totalAmount = Math.max(0, baseSalary + bonusFullAttendance - deductionLeave);
      } else {
        baseSalary = teacher.monthlySalary || 0;
        totalAmount = Math.max(0, baseSalary + bonusFullAttendance - deductionLeave);
      }

      return {
        id: `SLP-${monthYear}-${teacher.id}`,
        teacherId: teacher.id,
        monthYear,
        salarySystem: teacher.salarySystem,
        baseSalary,
        totalHoursTaught,
        hourlyRate: teacher.hourlyRate || financialSettings.defaultHourlyRate,
        bonusFullAttendance,
        deductionLeave,
        totalLeaveDays,
        totalAmount,
        status: 'draft',
      };
    });

    setPayrolls((prev) => {
      const otherMonths = prev.filter((p) => p.monthYear !== monthYear);
      return [...otherMonths, ...calculatedPayrolls];
    });
  };

  const markPayrollPaid = (payrollId: string) => {
    setPayrolls((prev) =>
      prev.map((p) =>
        p.id === payrollId
          ? { ...p, status: 'dibayar', paymentDate: new Date().toISOString().split('T')[0] }
          : p
      )
    );
  };

  const syncAllToSupabase = async (usersList: any[]) => {
    return pushAllLocalDataToSupabase({
      users: usersList,
      packages,
      teachers,
      students,
      schedules,
      sessions,
      payments,
      studentLeaves,
      teacherLeaves,
      saldoHistory,
    });
  };

  return (
    <DataContext.Provider
      value={{
        packages,
        updatePackage,
        addPackage,
        teachers,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        students,
        addStudent,
        updateStudent,
        deleteStudent,
        toggleStudentFreeze,
        schedules,
        sessions,
        createScheduleWithSessions,
        deleteSchedule,
        markAttendance,
        studentLeaves,
        requestStudentLeave,
        reviewStudentLeave,
        teacherLeaves,
        requestTeacherLeave,
        reviewTeacherLeave,
        saldoHistory,
        batchInputSchoolHoliday,
        useStudentSaldoJam,
        payments,
        markPaymentStatus,
        generateMonthlyPayments,
        financialSettings,
        updateFinancialSettings,
        payrolls,
        calculatePayrollForMonth,
        markPayrollPaid,
        activeMonth,
        setActiveMonth,
        syncStatus,
        syncAllToSupabase,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
