import React, { useState } from 'react';
import {
  CalendarDays,
  List,
  Plus,
  Clock,
  Filter,
  CheckCircle,
  AlertCircle,
  Trash2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { DayOfWeek, ScheduleDaySlot, TherapySession } from '../../types';
import {
  OPERATIONAL_DAYS,
  getAvailableStartTimes,
  calculateEndTime,
} from '../../lib/scheduleHelpers';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

export const JadwalView: React.FC = () => {
  const { currentRole, currentUser } = useAuth();
  const {
    schedules,
    sessions,
    students,
    teachers,
    packages,
    createScheduleWithSessions,
    deleteSchedule,
    activeMonth,
  } = useData();

  const [viewMode, setViewMode] = useState<'kalender' | 'daftar'>('kalender');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('semua');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('semua');

  // Modal Create Schedule
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedDaysConfig, setSelectedDaysConfig] = useState<ScheduleDaySlot[]>([]);

  const canManageSchedule =
    currentRole === 'admin' || currentRole === 'kepala';

  // Daftar siswa yang relevan (jika wali, hanya anak miliknya sendiri)
  const myStudents = currentRole === 'wali'
    ? students.filter(
        (s) =>
          s.parentUserId === currentUser?.id ||
          currentUser?.studentIds?.includes(s.id) ||
          s.parentName === currentUser?.fullName
      )
    : students;
  const myStudentIds = new Set(myStudents.map((s) => s.id));

  // Otomatis isi siswa pertama jika belum dipilih saat buka modal
  const handleOpenModal = () => {
    const defaultStudent = myStudents[0] || students[0];
    setSelectedStudentId(defaultStudent ? defaultStudent.id : '');
    setSelectedDaysConfig([]);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const currentStudent = students.find((s) => s.id === selectedStudentId);
  const currentPkg = packages.find((p) => p.id === currentStudent?.packageId);
  const currentTeacher = teachers.find((t) => t.id === currentStudent?.teacherId);

  // Handle pemilihan hari pada modal
  const handleToggleDay = (day: DayOfWeek) => {
    if (!currentPkg) return;

    const exists = selectedDaysConfig.some((d) => d.day === day);
    if (exists) {
      // Hapus hari
      setSelectedDaysConfig((prev) => prev.filter((d) => d.day !== day));
    } else {
      // Cek apakah sudah melebihi kuota paket
      if (selectedDaysConfig.length >= currentPkg.frequencyPerWeek) {
        setErrorMessage(
          `Kuota terpenuhi! Paket ini mewajibkan memilih tepat ${currentPkg.frequencyPerWeek} hari per minggu.`
        );
        return;
      }
      setErrorMessage(null);
      const defaultTimes = getAvailableStartTimes(day, currentPkg.durationHours);
      const initialStart = defaultTimes[0] || '13:00';
      setSelectedDaysConfig((prev) => [
        ...prev,
        {
          day,
          startTime: initialStart,
          duration: currentPkg.durationHours,
        },
      ]);
    }
  };

  const handleUpdateTime = (day: DayOfWeek, startTime: string) => {
    setSelectedDaysConfig((prev) =>
      prev.map((d) => (d.day === day ? { ...d, startTime } : d))
    );
  };

  const handleSubmitSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent || !currentPkg || !currentTeacher) return;

    if (selectedDaysConfig.length !== currentPkg.frequencyPerWeek) {
      setErrorMessage(
        `Wajib memilih tepat ${currentPkg.frequencyPerWeek} hari per minggu (saat ini terpilih ${selectedDaysConfig.length} hari).`
      );
      return;
    }

    const result = createScheduleWithSessions({
      studentId: currentStudent.id,
      teacherId: currentTeacher.id,
      packageId: currentPkg.id,
      monthYear: activeMonth,
      daysConfig: selectedDaysConfig,
      isActive: true,
    });

    if (result.success) {
      setIsModalOpen(false);
    } else {
      setErrorMessage(result.message || 'Gagal membuat jadwal.');
    }
  };

  // Filter Sesi untuk Tampilan
  const filteredSessions = sessions.filter((s) => {
    const matchMonth = s.sessionDate.startsWith(activeMonth);
    // Khusus wali murid: HANYA bisa melihat jadwal anaknya sendiri
    if (currentRole === 'wali' && !myStudentIds.has(s.studentId)) {
      return false;
    }
    const matchTeacher =
      selectedTeacherFilter === 'semua' || s.teacherId === selectedTeacherFilter;
    const matchStudent =
      selectedStudentFilter === 'semua' || s.studentId === selectedStudentFilter;
    return matchMonth && matchTeacher && matchStudent;
  });

  // Urutkan tanggal sesi
  const sortedSessions = [...filteredSessions].sort(
    (a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
  );

  // Grouping sesi per tanggal untuk tampilan kalender bulanan
  const sessionsByDate: Record<string, TherapySession[]> = {};
  sortedSessions.forEach((session) => {
    if (!sessionsByDate[session.sessionDate]) {
      sessionsByDate[session.sessionDate] = [];
    }
    sessionsByDate[session.sessionDate].push(session);
  });

  // Hitung jumlah hari di bulan aktif untuk kalender
  const [yearStr, monthStr] = activeMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Minggu

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {currentRole === 'wali'
              ? `Jadwal Terapi Ananda (${activeMonth})`
              : `Jadwal Terapi Bulanan (${activeMonth})`}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {currentRole === 'wali'
              ? 'Menampilkan seluruh jadwal sesi terapi khusus untuk ananda Anda.'
              : 'Jam operasional: Sen-Rab & Sab-Min (13-17), Kamis (13-16), Jumat libur.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Switcher Kalender vs Daftar */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('kalender')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'kalender'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Kalender
            </button>
            <button
              onClick={() => setViewMode('daftar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'daftar'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Daftar Sesi
            </button>
          </div>

          {canManageSchedule && (
            <button
              onClick={handleOpenModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Buat Jadwal Baru
            </button>
          )}
        </div>
      </div>

      {currentRole === 'wali' && (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl flex items-center gap-3 text-xs text-emerald-950 shadow-2xs">
          <CalendarDays className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold">Informasi Jadwal Terapi Ananda</p>
            <p className="text-2xs text-emerald-800/90 mt-0.5">
              Jadwal sesi terapi ditentukan dan diinput langsung oleh Kepala Lembaga & Admin saat pendaftaran siswa. Wali murid dapat memantau tanggal, jam, durasi, dan status kehadiran ananda di bawah ini.
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-3">
        {currentRole === 'wali' ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-800">
              {myStudents.length === 1
                ? `Ananda: ${myStudents[0]?.name}`
                : 'Pilih Ananda:'}
            </span>
            {myStudents.length > 1 && (
              <select
                value={selectedStudentFilter}
                onChange={(e) => setSelectedStudentFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-700 font-medium cursor-pointer"
              >
                <option value="semua">Semua Ananda ({myStudents.length})</option>
                {myStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter Sesi:</span>
            </div>

            <select
              value={selectedTeacherFilter}
              onChange={(e) => setSelectedTeacherFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-700 font-medium cursor-pointer"
            >
              <option value="semua">Semua Guru Terapis</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStudentFilter}
              onChange={(e) => setSelectedStudentFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-700 font-medium cursor-pointer"
            >
              <option value="semua">Semua Siswa Terapi</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </>
        )}

        <span className="text-2xs text-slate-400 ml-auto">
          Total Terjadwal: <strong>{sortedSessions.length} sesi</strong>
        </span>
      </div>

      {/* TAMPILAN 1: KALENDER BULANAN */}
      {viewMode === 'kalender' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 overflow-hidden">
          {/* Header Hari Kalender */}
          <div className="grid grid-cols-7 gap-2 mb-3 text-center text-2xs font-bold uppercase tracking-wider text-slate-500">
            <span className="py-2 text-rose-600">Min</span>
            <span className="py-2">Sen</span>
            <span className="py-2">Sel</span>
            <span className="py-2">Rab</span>
            <span className="py-2 text-amber-700">Kam (Tutup 16.00)</span>
            <span className="py-2 text-slate-400 bg-slate-100 rounded-lg">Jum (Libur)</span>
            <span className="py-2">Sab</span>
          </div>

          {/* Grid Tanggal Kalender */}
          <div className="grid grid-cols-7 gap-2">
            {/* Slot kosong sebelum tanggal 1 */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-24 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200/60 p-2 opacity-50" />
            ))}

            {/* Tanggal 1 s/d akhir bulan */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const daySessions = sessionsByDate[dateStr] || [];
              const dayOfWeekIndex = (firstDayIndex + i) % 7;
              const isFriday = dayOfWeekIndex === 5;

              return (
                <div
                  key={dateStr}
                  className={`min-h-24 rounded-2xl border p-2 flex flex-col justify-between transition-colors ${
                    isFriday
                      ? 'bg-slate-100/60 border-slate-200 text-slate-400'
                      : daySessions.length > 0
                      ? 'bg-white border-slate-200 hover:border-emerald-300 shadow-2xs'
                      : 'bg-slate-50/30 border-slate-200/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        dayOfWeekIndex === 0
                          ? 'text-rose-600'
                          : isFriday
                          ? 'text-slate-400'
                          : 'text-slate-800'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {daySessions.length > 0 && (
                      <span className="text-3xs font-extrabold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                        {daySessions.length} sesi
                      </span>
                    )}
                  </div>

                  {/* Daftar sesi mini di dalam kotak tanggal */}
                  <div className="space-y-1 mt-1 overflow-y-auto max-h-20">
                    {isFriday ? (
                      <span className="text-3xs italic text-slate-400 block pt-4 text-center">
                        Libur Klinik
                      </span>
                    ) : (
                      daySessions.map((session) => {
                        const student = students.find((s) => s.id === session.studentId);
                        return (
                          <div
                            key={session.id}
                            className="p-1 rounded-md text-3xs font-medium leading-tight truncate border"
                            style={{
                              backgroundColor:
                                session.attendanceStatus === 'Hadir'
                                  ? '#ecfdf5'
                                  : session.attendanceStatus === 'Izin'
                                  ? '#f0f9ff'
                                  : session.attendanceStatus === 'Libur dari sekolah'
                                  ? '#faf5ff'
                                  : '#f8fafc',
                              borderColor:
                                session.attendanceStatus === 'Hadir'
                                  ? '#a7f3d0'
                                  : session.attendanceStatus === 'Izin'
                                  ? '#bae6fd'
                                  : '#e2e8f0',
                            }}
                          >
                            <span className="font-bold text-slate-900">{session.startTime}</span>{' '}
                            <span>{student?.name}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAMPILAN 2: DAFTAR SESI */}
      {viewMode === 'daftar' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-2xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Hari & Tanggal</th>
                  <th className="px-4 py-3.5">Jam Terapi</th>
                  <th className="px-5 py-3.5">Nama Siswa</th>
                  <th className="px-4 py-3.5">Guru Terapis</th>
                  <th className="px-4 py-3.5 text-center">Durasi</th>
                  <th className="px-5 py-3.5 text-center">Status Absensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {sortedSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      Tidak ada sesi yang terjadwal untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  sortedSessions.map((session) => {
                    const student = students.find((s) => s.id === session.studentId);
                    const teacher = teachers.find((t) => t.id === session.teacherId);
                    return (
                      <tr key={session.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-900">{session.dayName}</span>,{' '}
                          <span className="text-slate-600">{session.sessionDate}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-800">
                            {session.startTime} - {session.endTime} WIB
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900">{student?.name}</td>
                        <td className="px-4 py-3.5 font-medium text-slate-700">{teacher?.name}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-2xs">
                            {session.durationHours} Jam
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
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
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Buat / Atur Jadwal Bulanan Siswa */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buat Jadwal Terapi Bulanan"
        subtitle={`Generate seluruh tanggal sesi terapi untuk bulan ${activeMonth}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitSchedule} className="space-y-5">
          {/* Pilih Siswa */}
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Pilih Siswa Terapi *
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setSelectedDaysConfig([]);
                setErrorMessage(null);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              {myStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.accountStatus === 'dibekukan' ? 'Akun Dibekukan' : 'Aktif'})
                </option>
              ))}
            </select>
          </div>

          {/* Info Paket & Guru Terpilih */}
          {currentStudent && currentPkg && currentTeacher && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-2xs text-slate-400 block uppercase font-bold">Paket Terapi:</span>
                <span className="font-bold text-slate-800">{currentPkg.name}</span>
              </div>
              <div>
                <span className="text-2xs text-slate-400 block uppercase font-bold">
                  Durasi & Kuota:
                </span>
                <span className="font-bold text-emerald-700">
                  {currentPkg.durationHours} Jam • Harus Tepat {currentPkg.frequencyPerWeek} Hari / Minggu
                </span>
              </div>
              <div>
                <span className="text-2xs text-slate-400 block uppercase font-bold">Guru Pembimbing:</span>
                <span className="font-bold text-slate-800">{currentTeacher.name}</span>
              </div>
            </div>
          )}

          {/* Pemilihan Hari & Jam Operasional */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-700">
                Pilih Hari & Jam Sesi ({selectedDaysConfig.length} / {currentPkg?.frequencyPerWeek || 0} Hari Dipilih)
              </label>
              {selectedDaysConfig.length === currentPkg?.frequencyPerWeek ? (
                <Badge variant="green">Kuota Tepat</Badge>
              ) : (
                <Badge variant="yellow">
                  Belum Lengkap ({currentPkg?.frequencyPerWeek ? currentPkg.frequencyPerWeek - selectedDaysConfig.length : 0} lagi)
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {OPERATIONAL_DAYS.map((op) => {
                const isSelected = selectedDaysConfig.some((d) => d.day === op.day);
                const currentSlot = selectedDaysConfig.find((d) => d.day === op.day);
                const availableTimes = currentPkg
                  ? getAvailableStartTimes(op.day, currentPkg.durationHours)
                  : [];

                if (!op.allowed) {
                  return (
                    <div
                      key={op.day}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-100 opacity-60 flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-slate-400">{op.day}</span>
                      <span className="text-2xs font-bold text-rose-500 uppercase">Libur Klinik</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={op.day}
                    className={`p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-emerald-50/60 border-emerald-400 ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleDay(op.day)}
                          className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800">{op.day}</span>
                      </label>
                      <span className="text-3xs text-slate-500">
                        {op.open} - {op.close} {op.day === 'Kamis' ? '(Tutup 16.00)' : ''}
                      </span>
                    </div>

                    {isSelected && currentSlot && (
                      <div className="pl-6 pt-1 flex items-center gap-2">
                        <span className="text-2xs font-semibold text-slate-600">Jam Mulai:</span>
                        <select
                          value={currentSlot.startTime}
                          onChange={(e) => handleUpdateTime(op.day, e.target.value)}
                          className="px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg font-bold text-emerald-800 focus:outline-hidden"
                        >
                          {availableTimes.map((time) => {
                            const endTime = calculateEndTime(time, currentPkg?.durationHours || 1);
                            return (
                              <option key={time} value={time}>
                                {time} - {endTime} WIB
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={selectedDaysConfig.length !== currentPkg?.frequencyPerWeek}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Generate Seluruh Sesi Bulan Ini
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
