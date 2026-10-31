import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Packages CRUD
  const updatePackage = (pkg: Package) => {
    setPackages((prev) => prev.map((p) => (p.id === pkg.id ? pkg : p)));
  };

  const addPackage = (pkg: Package) => {
    setPackages((prev) => [...prev, pkg]);
  };

  // Teachers CRUD
  const addTeacher = (teacher: Teacher) => {
    setTeachers((prev) => [...prev, teacher]);
  };

  const updateTeacher = (teacher: Teacher) => {
    setTeachers((prev) => prev.map((t) => (t.id === teacher.id ? teacher : t)));
  };

  const deleteTeacher = (id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
  };

  // Students CRUD & Freeze
  const addStudent = (student: Student) => {
    setStudents((prev) => [...prev, student]);
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
    }
  };

  const updateStudent = (student: Student) => {
    setStudents((prev) => prev.map((s) => (s.id === student.id ? student : s)));
  };

  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setSessions((prev) => prev.filter((s) => s.studentId !== id));
    setSchedules((prev) => prev.filter((s) => s.studentId !== id));
    setPayments((prev) => prev.filter((p) => p.studentId !== id));
  };

  const toggleStudentFreeze = (id: string, freeze: boolean) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, accountStatus: freeze ? 'dibekukan' : 'aktif' } : s))
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

    // Cek bentrok dengan sesi yang sudah ada pada guru yang sama
    for (const session of generated) {
      const clash = checkScheduleClash(sessions, {
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

    setSchedules((prev) => [...prev, newSchedule]);
    setSessions((prev) => [...prev, ...newSessionsWithIds]);

    return { success: true };
  };

  const deleteSchedule = (scheduleId: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    setSessions((prev) => prev.filter((s) => s.scheduleId !== scheduleId));
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

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              attendanceStatus: status,
              attendanceNotes: notes !== undefined ? notes : s.attendanceNotes,
              markedAt: new Date().toISOString(),
              markedBy: markedBy || s.markedBy,
            }
          : s
      )
    );

    // Aturan Saldo Jam: Jika sesi dibatalkan karena sekolah meliburkan, jam tersebut otomatis masuk menjadi saldo jam siswa
    if (status === 'Libur dari sekolah' && previousStatus !== 'Libur dari sekolah') {
      const hoursToAdd = targetSession.durationHours;
      setStudents((prev) =>
        prev.map((st) =>
          st.id === targetSession.studentId ? { ...st, saldoJam: st.saldoJam + hoursToAdd } : st
        )
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

    setStudentLeaves((prev) =>
      prev.map((l) =>
        l.id === leaveId
          ? {
              ...l,
              status,
              reviewedBy: reviewerName,
              reviewedAt: new Date().toISOString(),
              rejectionReason,
            }
          : l
      )
    );

    // Jika disetujui, ubah status absensi sesi terkait menjadi 'Izin'
    if (status === 'disetujui') {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetLeave.sessionId
            ? {
                ...s,
                attendanceStatus: 'Izin',
                attendanceNotes: `Izin disetujui: ${targetLeave.reason}`,
                markedAt: new Date().toISOString(),
                markedBy: reviewerName,
              }
            : s
        )
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
  };

  const reviewTeacherLeave = (
    leaveId: string,
    status: 'disetujui' | 'ditolak',
    reviewerName: string
  ) => {
    setTeacherLeaves((prev) =>
      prev.map((l) =>
        l.id === leaveId
          ? {
              ...l,
              status,
              reviewedBy: reviewerName,
              reviewedAt: new Date().toISOString(),
            }
          : l
      )
    );
  };

  // Batch input hari libur sekolah (Pilih tanggal, sistem otomatis menambah saldo ke semua siswa yang terjadwal)
  const batchInputSchoolHoliday = (holidayDate: string, description: string): number => {
    const matchingSessions = sessions.filter(
      (s) => s.sessionDate === holidayDate && s.attendanceStatus !== 'Libur dari sekolah'
    );

    if (matchingSessions.length === 0) return 0;

    // Update semua sesi tersebut menjadi Libur dari sekolah
    setSessions((prev) =>
      prev.map((s) =>
        s.sessionDate === holidayDate
          ? {
              ...s,
              attendanceStatus: 'Libur dari sekolah',
              attendanceNotes: description || 'Diliburkan sekolah',
              markedAt: new Date().toISOString(),
            }
          : s
      )
    );

    // Tambahkan saldo jam ke masing-masing siswa
    const newHistories: SaldoJamHistory[] = [];
    setStudents((prev) =>
      prev.map((student) => {
        const studentSessionsOnDate = matchingSessions.filter((s) => s.studentId === student.id);
        const hoursToAdd = studentSessionsOnDate.reduce((sum, s) => sum + s.durationHours, 0);

        if (hoursToAdd > 0) {
          newHistories.push({
            id: `SLD-${Date.now().toString(36).toUpperCase()}-${student.id}`,
            studentId: student.id,
            type: 'penambahan',
            amountHours: hoursToAdd,
            description: `${description || 'Sekolah meliburkan'} pada tanggal ${holidayDate}`,
            createdAt: new Date().toISOString(),
          });
          return { ...student, saldoJam: student.saldoJam + hoursToAdd };
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
      prev.map((s) => (s.id === studentId ? { ...s, saldoJam: s.saldoJam - hours } : s))
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

          return {
            ...p,
            status,
            paymentDate: isNowLunas ? new Date().toISOString().split('T')[0] : undefined,
            paymentMethod: isNowLunas ? method : undefined,
            receiptNumber,
            markedBy: isNowLunas ? markedBy : undefined,
            notes: notes !== undefined ? notes : p.notes,
          };
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
          newPayments.push({
            id: `INV-${Date.now().toString(36).toUpperCase()}-${student.id}`,
            studentId: student.id,
            monthYear,
            amount: pkg.priceMonthly,
            status: 'belum_lunas',
            createdAt: new Date().toISOString(),
          });
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

  /**
   * Aturan perhitungan gaji guru:
   * - Sistem per jam: total jam terapi yang benar-benar diajar (status = 'Hadir') × tarif per jam
   * - Sistem bulanan: nominal gaji tetap per guru
   * - Bonus otomatis Rp 50.000 jika guru hadir penuh sebulan tanpa izin sama sekali
   * - Potongan: jika guru izin > 1 kali dalam sebulan, gaji dipotong sebesar (jumlah hari izin * nominal potongan harian)
   */
  const calculatePayrollForMonth = (monthYear: string) => {
    const calculatedPayrolls: Payroll[] = teachers.map((teacher) => {
      // Sesi terapi yang benar-benar diajar (status = 'Hadir') di bulan ini
      const taughtSessions = sessions.filter(
        (s) =>
          s.teacherId === teacher.id &&
          s.sessionDate.startsWith(monthYear) &&
          s.attendanceStatus === 'Hadir'
      );

      const totalHoursTaught = taughtSessions.reduce((sum, s) => sum + s.durationHours, 0);

      // Hitung izin guru yang disetujui di bulan ini
      const approvedLeaves = teacherLeaves.filter(
        (l) =>
          l.teacherId === teacher.id &&
          l.leaveDate.startsWith(monthYear) &&
          l.status === 'disetujui'
      );
      const totalLeaveDays = approvedLeaves.length;

      // Bonus kehadiran penuh (jika tanpa izin sama sekali = 0 izin)
      const bonusFullAttendance = totalLeaveDays === 0 ? financialSettings.fullAttendanceBonus : 0;

      // Potongan: jika izin lebih dari 1 kali (>= 2 kali)
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
      // Gantikan payroll untuk bulan ini atau tambahkan
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
