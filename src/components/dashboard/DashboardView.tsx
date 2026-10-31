import React, { useState } from 'react';
import {
  Users,
  GraduationCap,
  CreditCard,
  AlertTriangle,
  Clock,
  CalendarCheck,
  CheckCircle,
  FileCheck2,
  Calendar,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { formatRupiah } from '../../lib/numberToIndonesianWords';
import { Badge } from '../common/Badge';
import { NavTabId } from '../layout/Sidebar';
import { KwitansiModal } from '../kwitansi/KwitansiModal';
import { Payment, Student } from '../../types';

interface DashboardViewProps {
  onNavigateTab: (tab: NavTabId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const { currentRole, currentUser } = useAuth();
  const {
    students,
    teachers,
    packages,
    sessions,
    payments,
    studentLeaves,
    teacherLeaves,
    activeMonth,
    markAttendance,
    toggleStudentFreeze,
  } = useData();

  // State untuk modal kwitansi
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Data ringkasan umum
  const activeStudents = students.filter((s) => s.accountStatus === 'aktif');
  const frozenStudents = students.filter((s) => s.accountStatus === 'dibekukan');
  const monthPayments = payments.filter((p) => p.monthYear === activeMonth);
  const paidPayments = monthPayments.filter((p) => p.status === 'lunas');
  const unpaidPayments = monthPayments.filter((p) => p.status === 'belum_lunas');
  const totalPaid = paidPayments.reduce((acc, p) => acc + p.amount, 0);
  const totalUnpaid = unpaidPayments.reduce((acc, p) => acc + p.amount, 0);

  const pendingStudentLeaves = studentLeaves.filter((l) => l.status === 'menunggu');
  const pendingTeacherLeaves = teacherLeaves.filter((l) => l.status === 'menunggu');

  // Tanggal hari ini
  const todayStr = '2026-11-02'; // Tanggal konteks aktif sistem
  const todaySessions = sessions.filter((s) => s.sessionDate === todayStr);

  // ==========================================
  // VIEW: GURU
  // ==========================================
  if (currentRole === 'guru') {
    const myTeacher = teachers.find((t) => t.id === currentUser?.teacherId || t.name === currentUser?.fullName) || teachers[0];
    const mySessionsToday = sessions.filter(
      (s) => s.teacherId === myTeacher?.id && s.sessionDate === todayStr
    );
    const myMonthSessions = sessions.filter(
      (s) => s.teacherId === myTeacher?.id && s.sessionDate.startsWith(activeMonth)
    );
    const myTaughtHours = myMonthSessions
      .filter((s) => s.attendanceStatus === 'Hadir')
      .reduce((sum, s) => sum + s.durationHours, 0);

    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 rounded-3xl p-6 text-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-block px-2.5 py-1 bg-white/20 rounded-lg text-2xs font-semibold uppercase tracking-wider mb-2 backdrop-blur-xs">
                Portal Guru Terapis
              </span>
              <h2 className="text-xl sm:text-2xl font-bold">
                Selamat Bertugas, {myTeacher?.name}!
              </h2>
              <p className="text-emerald-100 text-xs sm:text-sm mt-1">
                Sistem Penggajian: <strong className="text-white capitalize">{myTeacher?.salarySystem.replace('_', ' ')}</strong>{' '}
                {myTeacher?.salarySystem === 'per_jam'
                  ? `(${formatRupiah(myTeacher.hourlyRate)}/jam)`
                  : `(Tetap ${formatRupiah(myTeacher.monthlySalary)}/bln)`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('izin')}
                className="px-4 py-2 bg-white text-emerald-800 rounded-xl text-xs font-semibold shadow-xs hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                Ajukan Izin Guru
              </button>
              <button
                onClick={() => onNavigateTab('gaji')}
                className="px-4 py-2 bg-emerald-600/80 text-white border border-white/30 rounded-xl text-xs font-semibold hover:bg-emerald-600 transition-colors cursor-pointer"
              >
                Slip Gaji Saya
              </button>
            </div>
          </div>
        </div>

        {/* Ringkasan Jam Mengajar Guru */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Sesi Mengajar Hari Ini</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{mySessionsToday.length} Sesi</div>
            <p className="text-2xs text-slate-400 mt-0.5">Tanggal {todayStr}</p>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Total Jam Diajar Bulan Ini</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{myTaughtHours} Jam</div>
            <p className="text-2xs text-slate-400 mt-0.5">Hanya sesi dengan status 'Hadir'</p>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Estimasi Hak Gaji</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {myTeacher?.salarySystem === 'per_jam'
                ? formatRupiah(myTaughtHours * (myTeacher?.hourlyRate || 20000))
                : formatRupiah(myTeacher?.monthlySalary || 0)}
            </div>
            <p className="text-2xs text-slate-400 mt-0.5">Sebelum bonus kehadiran / potongan</p>
          </div>
        </div>

        {/* Jadwal & Tombol Cepat Absensi Hari Ini */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Jadwal Mengajar Anda Hari Ini</h3>
              <p className="text-xs text-slate-500">
                Isi absensi kehadiran siswa langsung setelah sesi terapi selesai
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('absensi')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1"
            >
              Buka Rekap Absensi <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {mySessionsToday.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Tidak ada sesi mengajar yang terjadwal untuk hari ini.
            </div>
          ) : (
            <div className="space-y-3">
              {mySessionsToday.map((session) => {
                const student = students.find((s) => s.id === session.studentId);
                const pkg = packages.find((p) => p.id === student?.packageId);

                return (
                  <div
                    key={session.id}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex flex-col items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                        <span className="text-3xs font-bold mt-0.5">{session.durationHours} Jam</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{student?.name}</h4>
                          <Badge
                            variant={
                              session.attendanceStatus === 'Hadir'
                                ? 'green'
                                : session.attendanceStatus === 'Izin'
                                ? 'blue'
                                : session.attendanceStatus === 'Alpa'
                                ? 'red'
                                : session.attendanceStatus === 'Libur dari sekolah'
                                ? 'purple'
                                : 'yellow'
                            }
                          >
                            {session.attendanceStatus}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {session.startTime} - {session.endTime} WIB • {pkg?.name}
                        </p>
                      </div>
                    </div>

                    {/* Tombol Cepat Absensi */}
                    <div className="flex flex-wrap items-center gap-1.5 self-end md:self-auto">
                      <button
                        onClick={() => markAttendance(session.id, 'Hadir', '', myTeacher?.name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          session.attendanceStatus === 'Hadir'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        Hadir
                      </button>
                      <button
                        onClick={() => markAttendance(session.id, 'Izin', '', myTeacher?.name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          session.attendanceStatus === 'Izin'
                            ? 'bg-sky-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-sky-50 hover:text-sky-700'
                        }`}
                      >
                        Izin
                      </button>
                      <button
                        onClick={() => markAttendance(session.id, 'Alpa', '', myTeacher?.name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          session.attendanceStatus === 'Alpa'
                            ? 'bg-rose-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                      >
                        Alpa
                      </button>
                      <button
                        onClick={() =>
                          markAttendance(session.id, 'Libur dari sekolah', 'Sekolah meliburkan', myTeacher?.name)
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          session.attendanceStatus === 'Libur dari sekolah'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                        }`}
                      >
                        Libur Sekolah
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: WALI MURID
  // ==========================================
  if (currentRole === 'wali') {
    const myStudents = students.filter(
      (s) =>
        s.parentUserId === currentUser?.id ||
        currentUser?.studentIds?.includes(s.id) ||
        s.parentName === currentUser?.fullName
    );

    const firstStudent = myStudents[0] || students[0];
    const studentPkg = packages.find((p) => p.id === firstStudent?.packageId);
    const studentTeacher = teachers.find((t) => t.id === firstStudent?.teacherId);

    const myUpcomingSessions = sessions
      .filter((s) => s.studentId === firstStudent?.id && s.sessionDate >= todayStr)
      .slice(0, 4);

    const myPayment = payments.find(
      (p) => p.studentId === firstStudent?.id && p.monthYear === activeMonth
    );

    const is2HourPackage = studentPkg?.durationHours === 2;
    const hasHolidayCompensation = (firstStudent?.saldoJam || 0) > 0;

    return (
      <div className="space-y-6">
        {/* Banner Wali */}
        <div className="bg-gradient-to-r from-teal-700 to-emerald-700 rounded-3xl p-6 text-white shadow-xs">
          <span className="inline-block px-2.5 py-1 bg-white/20 rounded-lg text-2xs font-semibold uppercase tracking-wider mb-2 backdrop-blur-xs">
            Portal Wali Murid
          </span>
          <h2 className="text-xl sm:text-2xl font-bold">
            Selamat Datang, {currentUser?.fullName}!
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            Memantau perkembangan terapi ananda{' '}
            <strong className="text-white underline">{firstStudent?.name}</strong>.
          </p>
        </div>

        {/* Kartu Status Utama Anak */}
        <div
          className={`grid grid-cols-1 ${
            hasHolidayCompensation ? 'md:grid-cols-3' : 'md:grid-cols-2'
          } gap-4`}
        >
          {/* Paket & Guru */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
              Paket Terapi Aktif
            </span>
            <div className="text-base font-bold text-slate-900">{studentPkg?.name}</div>
            <p className="text-xs text-slate-600">
              Guru Terapis: <strong>{studentTeacher?.name}</strong>
            </p>
            <div className="pt-2">
              <Badge variant={is2HourPackage ? 'green' : 'yellow'}>
                {is2HourPackage
                  ? 'Paket 2 Jam (Berhak Izin)'
                  : 'Paket 1 Jam (Tidak Ada Fasilitas Izin)'}
              </Badge>
            </div>
          </div>

          {/* Saldo Jam Kompensasi (HANYA MUNCUL JIKA ADA SESI DILIBURKAN OLEH SEKOLAH) */}
          {hasHolidayCompensation && (
            <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold uppercase tracking-wider text-emerald-800">
                  Kompensasi Libur Sekolah
                </span>
                <span className="text-3xs px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900 font-bold">
                  Tampilan Info
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-700">
                  {firstStudent?.saldoJam}
                </span>
                <span className="text-sm font-semibold text-emerald-800">Jam Pengganti</span>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Kompensasi otomatis karena sekolah pernah meliburkan sesi terapi ananda.
              </p>
              <button
                onClick={() => onNavigateTab('saldo_jam')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 pt-1 cursor-pointer"
              >
                Lihat Rincian Libur Sekolah <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Status Pembayaran SPP */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
              Status SPP Bulan {activeMonth}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant={myPayment?.status === 'lunas' ? 'green' : 'red'} size="md">
                {myPayment?.status === 'lunas' ? 'Sudah Lunas' : 'Belum Lunas'}
              </Badge>
              <span className="text-xs font-bold text-slate-800">
                {formatRupiah(myPayment?.amount || studentPkg?.priceMonthly || 0)}
              </span>
            </div>
            <p className="text-2xs text-slate-500">
              {myPayment?.status === 'lunas'
                ? `Dibayar ${myPayment.paymentDate} (${myPayment.paymentMethod})`
                : 'Harap selesaikan pembayaran untuk menghindari pembekuan akun'}
            </p>
            {myPayment?.status === 'lunas' ? (
              <button
                onClick={() => {
                  setSelectedPayment(myPayment);
                  setSelectedStudent(firstStudent);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                Cetak Kwitansi Resmi
              </button>
            ) : (
              <button
                onClick={() => onNavigateTab('pembayaran')}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 pt-1"
              >
                Informasi Rekening Pembayaran <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Jadwal Terapi Terdekat */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Sesi Terapi Mendatang</h3>
              <p className="text-xs text-slate-500">
                Jadwal sesi ananda {firstStudent?.name} untuk beberapa hari ke depan
              </p>
            </div>
            {is2HourPackage ? (
              <button
                onClick={() => onNavigateTab('izin')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Ajukan Izin Sesi
              </button>
            ) : (
              <span className="text-xs text-slate-400 italic">
                *Pengajuan izin hanya untuk paket 2 jam
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {myUpcomingSessions.map((session) => (
              <div
                key={session.id}
                className="p-4 rounded-2xl border border-slate-200/70 bg-slate-50/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">{session.dayName}</span>
                  <Badge
                    variant={
                      session.attendanceStatus === 'Hadir'
                        ? 'green'
                        : session.attendanceStatus === 'Izin'
                        ? 'blue'
                        : session.attendanceStatus === 'Libur dari sekolah'
                        ? 'purple'
                        : 'gray'
                    }
                  >
                    {session.attendanceStatus}
                  </Badge>
                </div>
                <div className="text-sm font-bold text-slate-900">{session.sessionDate}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {session.startTime} - {session.endTime} ({session.durationHours} Jam)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Kwitansi */}
        <KwitansiModal
          isOpen={Boolean(selectedPayment)}
          onClose={() => setSelectedPayment(null)}
          payment={selectedPayment}
          student={selectedStudent}
          pkg={studentPkg || null}
        />
      </div>
    );
  }

  // ==========================================
  // VIEW: ADMIN & KEPALA
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Dasbor Manajemen Terapi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ringkasan data siswa, keuangan SPP, jadwal sesi, dan status operasional lembaga.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('saldo_jam')}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            Input Libur Sekolah (Massal)
          </button>
          <button
            onClick={() => onNavigateTab('jadwal')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Kelola Jadwal Bulanan
          </button>
        </div>
      </div>

      {/* 5 Kartu Statistik Utama */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Siswa Aktif */}
        <div
          onClick={() => onNavigateTab('siswa')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Siswa Aktif</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{activeStudents.length}</div>
          <p className="text-2xs text-emerald-600 font-semibold mt-1">
            {students.length} total terdaftar
          </p>
        </div>

        {/* Guru Terapis */}
        <div
          onClick={() => onNavigateTab('guru')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-sky-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Guru Terapis</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{teachers.length}</div>
          <p className="text-2xs text-sky-600 font-semibold mt-1">Aktif mengajar</p>
        </div>

        {/* SPP Lunas Bulan Ini */}
        <div
          onClick={() => onNavigateTab('pembayaran')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">SPP Terbayar</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-600">
            {formatRupiah(totalPaid)}
          </div>
          <p className="text-2xs text-slate-500 mt-1">
            {paidPayments.length} dari {monthPayments.length} siswa lunas
          </p>
        </div>

        {/* Siswa Belum Bayar */}
        <div
          onClick={() => onNavigateTab('pembayaran')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-rose-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Belum Bayar</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600">
            {formatRupiah(totalUnpaid)}
          </div>
          <p className="text-2xs text-rose-600 font-semibold mt-1">
            {unpaidPayments.length} siswa nunggak
          </p>
        </div>

        {/* Siswa Dibekukan & Izin Pending */}
        <div
          onClick={() => onNavigateTab('siswa')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-amber-300 transition-colors cursor-pointer col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Akun Dibekukan</span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{frozenStudents.length}</div>
          <p className="text-2xs text-amber-700 font-semibold mt-1">
            {pendingStudentLeaves.length + pendingTeacherLeaves.length} izin pending
          </p>
        </div>
      </div>

      {/* Grid: Siswa Belum Bayar (Dengan Tombol Bekukan Akun) & Jadwal Hari Ini */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Daftar Siswa Belum Bayar & Tindakan Bekukan */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Peringatan Tagihan SPP ({unpaidPayments.length} Siswa)
              </h3>
              <p className="text-xs text-slate-500">
                Kepala dan Admin dapat langsung membekukan akun yang menunggak
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('pembayaran')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Semua Tagihan →
            </button>
          </div>

          {unpaidPayments.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              Semua siswa telah melunasi SPP bulan {activeMonth}.
            </div>
          ) : (
            <div className="space-y-2.5">
              {unpaidPayments.map((payment) => {
                const student = students.find((s) => s.id === payment.studentId);
                const isFrozen = student?.accountStatus === 'dibekukan';

                return (
                  <div
                    key={payment.id}
                    className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{student?.name}</span>
                        <Badge variant={isFrozen ? 'red' : 'yellow'}>
                          {isFrozen ? 'Dibekukan' : 'Belum Lunas'}
                        </Badge>
                      </div>
                      <p className="text-2xs text-slate-500 mt-0.5">
                        Wali: {student?.parentName} • {formatRupiah(payment.amount)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isFrozen ? (
                        <button
                          onClick={() => student && toggleStudentFreeze(student.id, false)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Aktifkan
                        </button>
                      ) : (
                        <button
                          onClick={() => student && toggleStudentFreeze(student.id, true)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Bekukan Akun
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Sesi Terapi Hari Ini */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Sesi Terapi Terjadwal Hari Ini ({todaySessions.length})
              </h3>
              <p className="text-xs text-slate-500">Operasional klinik pada {todayStr}</p>
            </div>
            <button
              onClick={() => onNavigateTab('absensi')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Absensi Harian →
            </button>
          </div>

          {todaySessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              Tidak ada sesi terapi pada tanggal ini (atau hari libur klinik).
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {todaySessions.map((session) => {
                const student = students.find((s) => s.id === session.studentId);
                const teacher = teachers.find((t) => t.id === session.teacherId);

                return (
                  <div
                    key={session.id}
                    className="p-3.5 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{student?.name}</span>
                        <span className="text-2xs font-semibold text-slate-500">
                          ({session.durationHours} Jam)
                        </span>
                      </div>
                      <p className="text-2xs text-slate-500 mt-0.5">
                        Terapis: {teacher?.name} • Pukul {session.startTime} - {session.endTime} WIB
                      </p>
                    </div>

                    <Badge
                      variant={
                        session.attendanceStatus === 'Hadir'
                          ? 'green'
                          : session.attendanceStatus === 'Izin'
                          ? 'blue'
                          : session.attendanceStatus === 'Alpa'
                          ? 'red'
                          : session.attendanceStatus === 'Libur dari sekolah'
                          ? 'purple'
                          : 'gray'
                      }
                    >
                      {session.attendanceStatus}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
