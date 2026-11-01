import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Clock,
  Phone,
  Calendar,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  CalendarDays,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Student, DayOfWeek, ScheduleDaySlot } from '../../types';
import {
  OPERATIONAL_DAYS,
  getAvailableStartTimes,
  calculateEndTime,
  checkScheduleClash,
} from '../../lib/scheduleHelpers';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { formatRupiah } from '../../lib/numberToIndonesianWords';

export const SiswaView: React.FC = () => {
  const { currentRole, hasPermission, users, syncStudentParentAccount, syncFreezeStudent } =
    useAuth();
  const {
    students,
    teachers,
    packages,
    schedules,
    sessions,
    addStudent,
    updateStudent,
    deleteStudent,
    toggleStudentFreeze,
    createScheduleWithSessions,
    activeMonth,
  } = useData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'aktif' | 'dibekukan'>('semua');
  const [packageFilter, setPackageFilter] = useState<string>('semua');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Auto Account Creation State
  const [autoCreateAccount, setAutoCreateAccount] = useState(true);
  const [parentEmail, setParentEmail] = useState('');
  const [parentPassword, setParentPassword] = useState('123');
  const [accountAlert, setAccountAlert] = useState<{
    studentName: string;
    parentName: string;
    email: string;
    password?: string;
    isEdit: boolean;
  } | null>(null);

  // Jadwal Terapi Integration State (Dikelola oleh Admin & Kepala)
  const [selectedDaysConfig, setSelectedDaysConfig] = useState<ScheduleDaySlot[]>([]);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    birthDate: string;
    parentName: string;
    parentPhone: string;
    address: string;
    packageId: string;
    teacherId: string;
    accountStatus: 'aktif' | 'dibekukan';
    saldoJam: number;
  }>({
    name: '',
    birthDate: '',
    parentName: '',
    parentPhone: '',
    address: '',
    packageId: packages[0]?.id || '',
    teacherId: teachers[0]?.id || '',
    accountStatus: 'aktif',
    saldoJam: 0,
  });

  const canAdd = hasPermission('siswa', 'add');
  const canEdit = hasPermission('siswa', 'edit');
  const canDelete = hasPermission('siswa', 'delete');
  const canManageFreeze = currentRole === 'admin' || currentRole === 'kepala';

  const currentPkg = packages.find((p) => p.id === formData.packageId) || packages[0];
  const currentTeacher = teachers.find((t) => t.id === formData.teacherId) || teachers[0];

  const handleOpenAdd = () => {
    setEditingStudent(null);
    const defaultPkg = packages[0]?.id || '';
    const defaultTeacher = teachers[0]?.id || '';
    setFormData({
      name: '',
      birthDate: '2019-01-01',
      parentName: '',
      parentPhone: '',
      address: '',
      packageId: defaultPkg,
      teacherId: defaultTeacher,
      accountStatus: 'aktif',
      saldoJam: 0,
    });
    setAutoCreateAccount(true);
    setParentEmail('');
    setParentPassword('123');
    setSelectedDaysConfig([]);
    setScheduleError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      birthDate: student.birthDate,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      address: student.address,
      packageId: student.packageId,
      teacherId: student.teacherId,
      accountStatus: student.accountStatus === 'dibekukan' ? 'dibekukan' : 'aktif',
      saldoJam: student.saldoJam,
    });

    const linkedUser = users.find(
      (u) =>
        (student.parentUserId && u.id === student.parentUserId) ||
        u.studentIds?.includes(student.id) ||
        (u.phone && student.parentPhone && u.phone === student.parentPhone) ||
        (u.role === 'wali' && u.fullName.toLowerCase() === student.parentName.toLowerCase())
    );

    setAutoCreateAccount(true);
    setParentEmail(linkedUser?.email || '');
    setParentPassword(linkedUser?.password || '123');

    // Cek apakah siswa sudah memiliki jadwal di bulan aktif
    const existingSchedule = schedules.find(
      (s) => s.studentId === student.id && s.monthYear === activeMonth
    );
    if (existingSchedule && existingSchedule.daysConfig) {
      setSelectedDaysConfig(existingSchedule.daysConfig);
    } else {
      setSelectedDaysConfig([]);
    }

    setScheduleError(null);
    setIsModalOpen(true);
  };

  const handleParentNameChange = (val: string) => {
    setFormData((prev) => ({ ...prev, parentName: val }));
    if (!editingStudent) {
      const clean = val
        .toLowerCase()
        .replace(/^(ibu|bapak|pak|bu)\s+/i, '')
        .replace(/[^a-z0-9]/g, '');
      setParentEmail(clean ? `${clean}@gmail.com` : '');
    }
  };

  // Handler toggle hari jadwal
  const handleToggleScheduleDay = (day: DayOfWeek) => {
    if (!currentPkg) return;

    const exists = selectedDaysConfig.some((d) => d.day === day);
    if (exists) {
      setSelectedDaysConfig((prev) => prev.filter((d) => d.day !== day));
      setScheduleError(null);
    } else {
      if (selectedDaysConfig.length >= currentPkg.frequencyPerWeek) {
        setScheduleError(
          `Kuota terpenuhi! Paket ${currentPkg.name} memerlukan tepat ${currentPkg.frequencyPerWeek} hari per minggu.`
        );
        return;
      }
      setScheduleError(null);
      const availableTimes = getAvailableStartTimes(day, currentPkg.durationHours);
      const startTime = availableTimes[0] || '13:00';
      setSelectedDaysConfig((prev) => [
        ...prev,
        {
          day,
          startTime,
          duration: currentPkg.durationHours,
        },
      ]);
    }
  };

  const handleUpdateScheduleTime = (day: DayOfWeek, startTime: string) => {
    setSelectedDaysConfig((prev) =>
      prev.map((d) => (d.day === day ? { ...d, startTime } : d))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.parentName.trim()) return;

    // Validasi jadwal jika diisi
    if (selectedDaysConfig.length > 0 || !editingStudent) {
      if (selectedDaysConfig.length !== currentPkg.frequencyPerWeek) {
        setScheduleError(
          `Jadwal belum lengkap! Paket ${currentPkg.name} mewajibkan memilih tepat ${currentPkg.frequencyPerWeek} hari per minggu (saat ini terpilih ${selectedDaysConfig.length} hari).`
        );
        return;
      }
    }

    let targetStudentId = editingStudent ? editingStudent.id : `SIS-${Date.now().toString(36).toUpperCase()}`;

    if (editingStudent) {
      let updatedStudent: Student = {
        ...editingStudent,
        ...formData,
      };

      if (autoCreateAccount) {
        const synced = syncStudentParentAccount(updatedStudent, {
          email: parentEmail,
          password: parentPassword,
        });
        updatedStudent.parentUserId = synced.id;
        setAccountAlert({
          studentName: updatedStudent.name,
          parentName: updatedStudent.parentName,
          email: synced.email,
          password: parentPassword || '123',
          isEdit: true,
        });
      }

      updateStudent(updatedStudent);
    } else {
      let newStudent: Student = {
        id: targetStudentId,
        ...formData,
        createdAt: new Date().toISOString().split('T')[0],
      };

      if (autoCreateAccount) {
        const synced = syncStudentParentAccount(newStudent, {
          email: parentEmail,
          password: parentPassword,
        });
        newStudent.parentUserId = synced.id;
        setAccountAlert({
          studentName: newStudent.name,
          parentName: newStudent.parentName,
          email: synced.email,
          password: parentPassword || '123',
          isEdit: false,
        });
      }

      addStudent(newStudent);
    }

    // Buat / perbarui jadwal terapi langsung jika konfigurasi hari lengkap
    if (selectedDaysConfig.length === currentPkg.frequencyPerWeek) {
      const scheduleRes = createScheduleWithSessions({
        studentId: targetStudentId,
        teacherId: formData.teacherId,
        packageId: formData.packageId,
        monthYear: activeMonth,
        daysConfig: selectedDaysConfig,
        isActive: true,
      });

      if (!scheduleRes.success) {
        setScheduleError(scheduleRes.message || 'Gagal menyimpan jadwal terapi.');
        return;
      }
    }

    setIsModalOpen(false);
  };

  const handleToggleFreezeStudent = (student: Student) => {
    const willFreeze = student.accountStatus !== 'dibekukan';
    toggleStudentFreeze(student.id, willFreeze);
    syncFreezeStudent(student.id, willFreeze);
  };

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.parentName.toLowerCase().includes(search.toLowerCase()) ||
      s.parentPhone.includes(search);
    const matchStatus = statusFilter === 'semua' || s.accountStatus === statusFilter;
    const matchPackage = packageFilter === 'semua' || s.packageId === packageFilter;
    return matchSearch && matchStatus && matchPackage;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Data Siswa Terapi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Input profil anak, relasi wali murid, paket terapi, dan jadwal sesi bulanan (Dikelola oleh Kepala & Admin).
          </p>
        </div>

        {canAdd && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Tambah Siswa & Jadwal Baru
          </button>
        )}
      </div>

      {/* Alert Notifikasi Akun Wali Baru Dibuat */}
      {accountAlert && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                {accountAlert.isEdit ? 'Akun Wali Murid Diperbarui' : 'Akun Wali Murid Berhasil Dibuat'}
              </h4>
              <p className="text-xs text-emerald-900 mt-0.5">
                Akun untuk wali dari <strong>{accountAlert.studentName}</strong> ({accountAlert.parentName}) siap digunakan untuk login.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-300/80 text-xs text-slate-800">
                <span>
                  Email Login: <strong className="font-mono text-emerald-800">{accountAlert.email}</strong>
                </span>
                <span>•</span>
                <span>
                  Password: <strong className="font-mono text-emerald-800">{accountAlert.password}</strong>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setAccountAlert(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama siswa, nama wali murid, atau nomor HP..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="semua">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="dibekukan">Dibekukan</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl text-xs">
            <span className="text-slate-500 font-medium">Paket:</span>
            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="semua">Semua Paket</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Data Siswa */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-3xs font-bold">
                <th className="px-5 py-3.5">Nama Siswa</th>
                <th className="px-4 py-3.5">Wali Murid & Kontak</th>
                <th className="px-4 py-3.5">Paket Terapi Aktif</th>
                <th className="px-4 py-3.5">Guru Pembimbing</th>
                <th className="px-4 py-3.5 text-center">Jadwal Sesi</th>
                <th className="px-4 py-3.5 text-center">Status Akun</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Tidak ada data siswa yang cocok dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const pkg = packages.find((p) => p.id === student.packageId);
                  const teacher = teachers.find((t) => t.id === student.teacherId);
                  const isFrozen = student.accountStatus === 'dibekukan';
                  const studentSchedule = schedules.find(
                    (sc) => sc.studentId === student.id && sc.monthYear === activeMonth
                  );

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Nama Siswa & Tgl Lahir */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-xs">{student.name}</div>
                        <div className="text-2xs text-slate-400 mt-0.5">
                          Lahir: {student.birthDate || '-'}
                        </div>
                      </td>

                      {/* Wali Murid */}
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">{student.parentName}</div>
                        <div className="text-2xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{student.parentPhone}</span>
                        </div>
                      </td>

                      {/* Paket */}
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{pkg?.name}</div>
                        <div className="text-2xs text-emerald-600 font-bold mt-0.5">
                          {formatRupiah(pkg?.priceMonthly || 0)}/bln
                        </div>
                      </td>

                      {/* Guru Pembimbing */}
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">{teacher?.name || '-'}</div>
                        <div className="text-2xs text-slate-400">{teacher?.position || 'Guru Terapis'}</div>
                      </td>

                      {/* Ringkasan Jadwal Terapi */}
                      <td className="px-4 py-4 text-center">
                        {studentSchedule && studentSchedule.daysConfig && studentSchedule.daysConfig.length > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-3xs border border-emerald-200">
                              <CalendarDays className="w-3 h-3 text-emerald-600" />
                              {studentSchedule.daysConfig.length} Hari / Minggu
                            </span>
                            <span className="text-3xs text-slate-400 mt-0.5">
                              {studentSchedule.daysConfig.map((d) => d.day.slice(0, 3)).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-3xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-semibold">
                            Belum Ada Jadwal
                          </span>
                        )}
                      </td>

                      {/* Status Akun */}
                      <td className="px-4 py-4 text-center">
                        <Badge variant={isFrozen ? 'red' : 'green'}>
                          {isFrozen ? 'Dibekukan' : 'Aktif'}
                        </Badge>
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Toggle Freeze / Unfreeze (Khusus Admin & Kepala) */}
                          {canManageFreeze && (
                            <button
                              onClick={() => handleToggleFreezeStudent(student)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isFrozen
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-amber-600 hover:bg-amber-50'
                              }`}
                              title={isFrozen ? 'Buka Pembekuan Akun' : 'Bekukan Akun'}
                            >
                              {isFrozen ? (
                                <Unlock className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(student)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Siswa & Jadwal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => setDeleteConfirmId(student.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Siswa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Siswa dengan Integrasi Input Jadwal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? 'Edit Data Siswa & Jadwal' : 'Tambah Siswa & Jadwal Terapi'}
        subtitle="Lengkapi data siswa, akun wali, serta tentukan hari dan jam terapi langsung oleh Kepala/Admin."
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {scheduleError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{scheduleError}</span>
            </div>
          )}

          {/* Data Siswa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nama Lengkap Siswa *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Muhammad Alif"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Data Wali Murid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nama Wali Murid *
              </label>
              <input
                type="text"
                required
                value={formData.parentName}
                onChange={(e) => handleParentNameChange(e.target.value)}
                placeholder="Contoh: Ibu Ratna Dewi"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                No. HP / WhatsApp Wali *
              </label>
              <input
                type="tel"
                required
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                placeholder="Contoh: 081234567890"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Section Pembuatan & Sinkronisasi Akun Wali Murid Otomatis */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-950">
                  Akun Login Wali Murid (Otomatis)
                </span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer text-2xs font-semibold text-emerald-900">
                <input
                  type="checkbox"
                  checked={autoCreateAccount}
                  onChange={(e) => setAutoCreateAccount(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Otomatis Buat Akun</span>
              </label>
            </div>

            {autoCreateAccount && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-3xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                    Email Wali Murid (Login) *
                  </label>
                  <input
                    type="email"
                    required={autoCreateAccount}
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="Contoh: ratna@gmail.com"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                    Kata Sandi / Password *
                  </label>
                  <input
                    type="text"
                    required={autoCreateAccount}
                    value={parentPassword}
                    onChange={(e) => setParentPassword(e.target.value)}
                    placeholder="Password login..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
                  />
                </div>
              </div>
            )}
            <p className="text-3xs text-emerald-700 leading-relaxed">
              Wali murid dapat langsung login untuk melihat jadwal anaknya sendiri dan notifikasi pembayaran SPP.
            </p>
          </div>

          {/* Pemilihan Paket & Guru */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Paket Terapi Aktif *
              </label>
              <select
                value={formData.packageId}
                onChange={(e) => {
                  const newPkgId = e.target.value;
                  setFormData({ ...formData, packageId: newPkgId });
                  setSelectedDaysConfig([]); // Reset config jika paket berubah frekuensinya
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer font-medium text-slate-900"
              >
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} — {formatRupiah(pkg.priceMonthly)} ({pkg.durationHours} Jam)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Guru Pembimbing Terapi *
              </label>
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer font-medium text-slate-900"
              >
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.position || 'Guru Terapis'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ============================================================== */}
          {/* INTEGRASI ATUR JADWAL TERAPI (KEPALA & ADMIN) */}
          {/* ============================================================== */}
          <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-900">
                  Atur Jadwal Terapi ({activeMonth})
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xs text-slate-500">Kuota Wajib Paket:</span>
                <span
                  className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                    selectedDaysConfig.length === currentPkg.frequencyPerWeek
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedDaysConfig.length} / {currentPkg.frequencyPerWeek} Hari Terpilih
                </span>
              </div>
            </div>

            <p className="text-3xs text-slate-500">
              * Jam operasional: <strong>Senin-Rabu (13:00-17:00)</strong>, <strong>Kamis (13:00-16:00)</strong>, <strong>Sabtu-Minggu (13:00-17:00)</strong>. <strong>Jumat libur</strong>.
              Sistem akan otomatis menghasilkan seluruh tanggal sesi terapi selama satu bulan.
            </p>

            {/* Pilihan Hari */}
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Pilih {currentPkg.frequencyPerWeek} Hari Sesi:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
                {OPERATIONAL_DAYS.map((op) => {
                  const isSelected = selectedDaysConfig.some((d) => d.day === op.day);
                  const isFriday = op.day === 'Jumat';

                  return (
                    <button
                      key={op.day}
                      type="button"
                      disabled={isFriday}
                      onClick={() => handleToggleScheduleDay(op.day)}
                      className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isFriday
                          ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'bg-emerald-600 text-white shadow-xs scale-102 ring-2 ring-emerald-500/30'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50'
                      }`}
                    >
                      <span>{op.day}</span>
                      <span className="text-3xs font-normal mt-0.5 opacity-80">
                        {isFriday ? 'Libur' : `${op.open}-${op.close}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Konfigurasi Jam untuk Hari yang Dipilih */}
            {selectedDaysConfig.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-200/80">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                  Pilih Jam Mulai Sesi ({currentPkg.durationHours} Jam per sesi):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedDaysConfig.map((slot) => {
                    const validTimes = getAvailableStartTimes(slot.day, currentPkg.durationHours);
                    const endTime = calculateEndTime(slot.startTime, currentPkg.durationHours);

                    return (
                      <div
                        key={slot.day}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-16 font-bold text-xs text-slate-900">{slot.day}</span>
                          <select
                            value={slot.startTime}
                            onChange={(e) => handleUpdateScheduleTime(slot.day, e.target.value)}
                            className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          >
                            {validTimes.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="text-2xs font-bold text-emerald-700">
                          {slot.startTime} - {endTime} WIB
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Alamat Tempat Tinggal
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Alamat lengkap domisili siswa..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingStudent ? 'Simpan Data & Jadwal' : 'Simpan Siswa & Buat Jadwal'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) deleteStudent(deleteConfirmId);
        }}
        title="Hapus Data Siswa"
        message="Apakah Anda yakin ingin menghapus siswa ini? Seluruh jadwal, absensi, dan tagihan terkait juga akan terhapus."
        confirmLabel="Hapus Permanen"
        isDestructive
      />
    </div>
  );
};
