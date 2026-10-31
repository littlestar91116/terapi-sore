import React, { useState } from 'react';
import {
  ClipboardCheck,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  FileText,
  Percent,
  Search,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { AttendanceStatus, TherapySession } from '../../types';
import { Badge } from '../common/Badge';

export const AbsensiView: React.FC = () => {
  const { currentRole, currentUser } = useAuth();
  const { sessions, students, teachers, packages, markAttendance, activeMonth } = useData();

  const [activeTab, setActiveTab] = useState<'harian' | 'rekap'>('harian');
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-02');
  const [filterTeacher, setFilterTeacher] = useState<string>('semua');
  const [searchStudent, setSearchStudent] = useState<string>('');

  const canMark =
    currentRole === 'admin' || currentRole === 'kepala' || currentRole === 'guru';

  const myStudents = currentRole === 'wali'
    ? students.filter(
        (s) =>
          s.parentUserId === currentUser?.id ||
          currentUser?.studentIds?.includes(s.id) ||
          s.parentName === currentUser?.fullName
      )
    : students;
  const myStudentIds = new Set(myStudents.map((s) => s.id));

  // Sesi pada tanggal yang dipilih
  const dateSessions = sessions.filter((s) => {
    const matchDate = s.sessionDate === selectedDate;
    if (currentRole === 'wali' && !myStudentIds.has(s.studentId)) {
      return false;
    }
    const matchTeacher = filterTeacher === 'semua' || s.teacherId === filterTeacher;
    const student = students.find((st) => st.id === s.studentId);
    const matchSearch =
      !searchStudent || student?.name.toLowerCase().includes(searchStudent.toLowerCase());
    return matchDate && matchTeacher && matchSearch;
  });

  // Rekap Absensi Bulanan per Siswa
  const studentRecaps = myStudents.map((student) => {
    const studentMonthSessions = sessions.filter(
      (s) => s.studentId === student.id && s.sessionDate.startsWith(activeMonth)
    );

    const totalSessions = studentMonthSessions.length;
    const hadirCount = studentMonthSessions.filter((s) => s.attendanceStatus === 'Hadir').length;
    const izinCount = studentMonthSessions.filter((s) => s.attendanceStatus === 'Izin').length;
    const alpaCount = studentMonthSessions.filter((s) => s.attendanceStatus === 'Alpa').length;
    const liburCount = studentMonthSessions.filter(
      (s) => s.attendanceStatus === 'Libur dari sekolah'
    ).length;

    const evaluatedSessions = hadirCount + izinCount + alpaCount;
    const percentage =
      evaluatedSessions > 0 ? Math.round((hadirCount / evaluatedSessions) * 100) : 100;

    const pkg = packages.find((p) => p.id === student.packageId);
    const teacher = teachers.find((t) => t.id === student.teacherId);

    return {
      student,
      pkg,
      teacher,
      totalSessions,
      hadirCount,
      izinCount,
      alpaCount,
      liburCount,
      percentage,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Absensi Siswa Terapi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tandai kehadiran sesi harian (Hadir, Izin, Alpa, Libur dari sekolah) dan pantau rekap bulanan.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('harian')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'harian'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Absensi Sesi Harian
          </button>
          <button
            onClick={() => setActiveTab('rekap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'rekap'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rekap Bulanan ({activeMonth})
          </button>
        </div>
      </div>

      {/* TAB 1: ABSENSI HARIAN */}
      {activeTab === 'harian' && (
        <div className="space-y-4">
          {/* Controls Harian */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Pilih Tanggal:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-hidden cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Guru:</span>
              <select
                value={filterTeacher}
                onChange={(e) => setFilterTeacher(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="semua">Semua Guru</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto text-2xs text-slate-500">
              Terjadwal pada tanggal ini: <strong>{dateSessions.length} sesi terapi</strong>
            </div>
          </div>

          {/* Banner Saldo Jam Rule */}
          <div className="p-3.5 bg-purple-50/70 border border-purple-200/70 rounded-2xl text-xs text-purple-900 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              <strong>Aturan Khusus:</strong> Jika status ditandai{' '}
              <strong>"Libur dari sekolah"</strong>, jam sesi tersebut otomatis dikonversi menjadi{' '}
              <strong>Saldo Jam</strong> siswa untuk digunakan di sesi pengganti.
            </span>
          </div>

          {/* List Sesi Harian */}
          <div className="space-y-3">
            {dateSessions.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center text-slate-400 text-xs">
                Tidak ada sesi terapi yang terjadwal pada tanggal {selectedDate}.
              </div>
            ) : (
              dateSessions.map((session) => {
                const student = students.find((s) => s.id === session.studentId);
                const teacher = teachers.find((t) => t.id === session.teacherId);
                const pkg = packages.find((p) => p.id === student?.packageId);

                return (
                  <div
                    key={session.id}
                    className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex flex-col items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <span className="text-3xs font-extrabold mt-0.5">{session.durationHours} Jam</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">{student?.name}</h4>
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
                          Pukul {session.startTime} - {session.endTime} WIB • Guru: {teacher?.name} •{' '}
                          {pkg?.name}
                        </p>
                        {session.attendanceNotes && (
                          <p className="text-2xs text-slate-500 italic mt-1 bg-slate-50 px-2 py-0.5 rounded-md inline-block">
                            Catatan: {session.attendanceNotes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tombol Aksi Status */}
                    {canMark && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() =>
                            markAttendance(session.id, 'Hadir', '', currentUser?.fullName)
                          }
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                            session.attendanceStatus === 'Hadir'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200'
                          }`}
                        >
                          Hadir
                        </button>
                        <button
                          onClick={() =>
                            markAttendance(session.id, 'Izin', '', currentUser?.fullName)
                          }
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                            session.attendanceStatus === 'Izin'
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200'
                          }`}
                        >
                          Izin
                        </button>
                        <button
                          onClick={() =>
                            markAttendance(session.id, 'Alpa', '', currentUser?.fullName)
                          }
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                            session.attendanceStatus === 'Alpa'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200'
                          }`}
                        >
                          Alpa
                        </button>
                        <button
                          onClick={() =>
                            markAttendance(
                              session.id,
                              'Libur dari sekolah',
                              'Sekolah meliburkan sesi terapi',
                              currentUser?.fullName
                            )
                          }
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                            session.attendanceStatus === 'Libur dari sekolah'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200'
                          }`}
                        >
                          Libur Sekolah (+Saldo)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REKAP BULANAN */}
      {activeTab === 'rekap' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Rekap Kehadiran Siswa Periode Bulan {activeMonth}
            </h3>
            <span className="text-2xs text-slate-500">
              Persentase dihitung dari sesi yang terlaksana
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-2xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Nama Siswa</th>
                  <th className="px-4 py-3.5">Paket Terapi</th>
                  <th className="px-4 py-3.5 text-center">Total Sesi</th>
                  <th className="px-4 py-3.5 text-center text-emerald-700">Hadir</th>
                  <th className="px-4 py-3.5 text-center text-sky-700">Izin</th>
                  <th className="px-4 py-3.5 text-center text-rose-700">Alpa</th>
                  <th className="px-4 py-3.5 text-center text-purple-700">Libur Sekolah</th>
                  <th className="px-5 py-3.5 text-center">Tingkat Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {studentRecaps.map((item) => (
                  <tr key={item.student.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">{item.student.name}</td>
                    <td className="px-4 py-4 text-slate-600">{item.pkg?.name}</td>
                    <td className="px-4 py-4 text-center font-bold text-slate-800">
                      {item.totalSessions} Sesi
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-emerald-600">
                      {item.hadirCount}
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-sky-600">
                      {item.izinCount}
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-rose-600">
                      {item.alpaCount}
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-purple-600">
                      {item.liburCount}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.percentage >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className="font-extrabold text-slate-800">{item.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
