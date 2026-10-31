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
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Student } from '../../types';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const SiswaView: React.FC = () => {
  const { currentRole, hasPermission, users, syncStudentParentAccount, syncFreezeStudent } =
    useAuth();
  const {
    students,
    teachers,
    packages,
    addStudent,
    updateStudent,
    deleteStudent,
    toggleStudentFreeze,
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
  const [parentUsername, setParentUsername] = useState('');
  const [parentPassword, setParentPassword] = useState('123');
  const [accountAlert, setAccountAlert] = useState<{
    studentName: string;
    parentName: string;
    username: string;
    password?: string;
    isEdit: boolean;
  } | null>(null);

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

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      birthDate: '2019-01-01',
      parentName: '',
      parentPhone: '',
      address: '',
      packageId: packages[0]?.id || '',
      teacherId: teachers[0]?.id || '',
      accountStatus: 'aktif',
      saldoJam: 0,
    });
    setAutoCreateAccount(true);
    setParentUsername('');
    setParentPassword('123');
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
    setParentUsername(linkedUser?.username || '');
    setParentPassword(linkedUser?.password || '123');
    setIsModalOpen(true);
  };

  const handleParentNameChange = (val: string) => {
    setFormData((prev) => ({ ...prev, parentName: val }));
    // Jika menambah siswa baru dan belum mengisi custom username
    if (!editingStudent) {
      const clean = val
        .toLowerCase()
        .replace(/^(ibu|bapak|pak|bu)\s+/i, '')
        .replace(/[^a-z0-9]/g, '');
      setParentUsername(clean ? `wali_${clean}` : '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.parentName.trim()) return;

    if (editingStudent) {
      let updatedStudent: Student = {
        ...editingStudent,
        ...formData,
      };

      if (autoCreateAccount) {
        const synced = syncStudentParentAccount(updatedStudent, {
          username: parentUsername,
          password: parentPassword,
        });
        updatedStudent.parentUserId = synced.id;
        setAccountAlert({
          studentName: updatedStudent.name,
          parentName: updatedStudent.parentName,
          username: synced.username,
          password: parentPassword || '123',
          isEdit: true,
        });
      }

      updateStudent(updatedStudent);
    } else {
      const newId = `SIS-${Date.now().toString(36).toUpperCase()}`;
      let newStudent: Student = {
        id: newId,
        ...formData,
        createdAt: new Date().toISOString().split('T')[0],
      };

      if (autoCreateAccount) {
        const synced = syncStudentParentAccount(newStudent, {
          username: parentUsername,
          password: parentPassword,
        });
        newStudent.parentUserId = synced.id;
        setAccountAlert({
          studentName: newStudent.name,
          parentName: newStudent.parentName,
          username: synced.username,
          password: parentPassword || '123',
          isEdit: false,
        });
      }

      addStudent(newStudent);
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
            Kelola profil anak, relasi wali murid, paket terapi, guru pendamping, dan status akun.
          </p>
        </div>

        {canAdd && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Tambah Siswa Baru
          </button>
        )}
      </div>

      {/* Success Alert: Akun Otomatis Dibuat / Disinkronkan */}
      {accountAlert && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-start justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="text-xs text-emerald-950 space-y-1">
              <h4 className="font-bold text-sm">
                {accountAlert.isEdit
                  ? 'Akun Wali Murid Berhasil Disinkronkan!'
                  : 'Akun Wali Murid Berhasil Dibuat Otomatis!'}
              </h4>
              <p className="text-emerald-800">
                Data ananda <strong>{accountAlert.studentName}</strong> tersimpan. Wali murid{' '}
                <strong>{accountAlert.parentName}</strong> sekarang dapat langsung login dengan:
              </p>
              <div className="inline-flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 font-mono text-xs text-slate-800 mt-1">
                <span>
                  Username: <strong className="text-emerald-700">{accountAlert.username}</strong>
                </span>
                <span>•</span>
                <span>
                  Password: <strong className="text-emerald-700">{accountAlert.password || '123'}</strong>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setAccountAlert(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama siswa, wali murid, atau nomor HP..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-700 font-medium cursor-pointer"
          >
            <option value="semua">Semua Status Akun</option>
            <option value="aktif">Aktif Saja</option>
            <option value="dibekukan">Dibekukan Saja</option>
          </select>

          <select
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden text-slate-700 font-medium cursor-pointer"
          >
            <option value="semua">Semua Paket Terapi</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabel Data Siswa */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-2xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Nama Siswa</th>
                <th className="px-4 py-3.5">Wali & Kontak</th>
                <th className="px-4 py-3.5">Paket Terapi</th>
                <th className="px-4 py-3.5">Guru Pembimbing</th>
                <th className="px-4 py-3.5 text-center">Saldo Jam</th>
                <th className="px-4 py-3.5 text-center">Status Akun</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Tidak ada data siswa yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const pkg = packages.find((p) => p.id === student.packageId);
                  const teacher = teachers.find((t) => t.id === student.teacherId);
                  const isFrozen = student.accountStatus === 'dibekukan';

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isFrozen ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Nama Siswa */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{student.name}</div>
                        <div className="text-2xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>Lahir: {student.birthDate}</span>
                        </div>
                      </td>

                      {/* Wali & Kontak */}
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">{student.parentName}</div>
                        <div className="text-2xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{student.parentPhone}</span>
                        </div>
                        {(() => {
                          const linked = users.find(
                            (u) =>
                              (student.parentUserId && u.id === student.parentUserId) ||
                              u.studentIds?.includes(student.id) ||
                              (u.phone && student.parentPhone && u.phone === student.parentPhone) ||
                              (u.role === 'wali' &&
                                u.fullName.toLowerCase() === student.parentName.toLowerCase())
                          );
                          if (!linked) return null;
                          return (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 text-3xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <KeyRound className="w-2.5 h-2.5" />
                                @{linked.username}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Paket Terapi */}
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">{pkg?.name}</div>
                        <Badge variant={pkg?.durationHours === 2 ? 'green' : 'yellow'} size="sm">
                          {pkg?.durationHours === 2 ? '2 Jam (Bisa Izin)' : '1 Jam'}
                        </Badge>
                      </td>

                      {/* Guru Pembimbing */}
                      <td className="px-4 py-4">
                        <span className="font-medium text-slate-800">{teacher?.name}</span>
                      </td>

                      {/* Saldo Jam */}
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          {student.saldoJam} Jam
                        </span>
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
                          {canManageFreeze && (
                            <button
                              onClick={() => handleToggleFreezeStudent(student)}
                              title={isFrozen ? 'Aktifkan Akun Siswa & Wali' : 'Bekukan Akun Siswa & Wali'}
                              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                isFrozen
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              }`}
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
                              title="Edit Data Siswa"
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

      {/* Modal Add / Edit Siswa */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
        subtitle="Lengkapi data diri siswa, wali murid, dan pemilihan paket terapi"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
                <span>Otomatis Buat & Sinkron Akun</span>
              </label>
            </div>

            {autoCreateAccount && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-3xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                    Username Wali Murid *
                  </label>
                  <input
                    type="text"
                    required={autoCreateAccount}
                    value={parentUsername}
                    onChange={(e) => setParentUsername(e.target.value)}
                    placeholder="Contoh: wali_alif"
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
              Akun login wali murid akan langsung otomatis terdaftar / tersinkronisasi. Wali murid
              dapat langsung masuk ke sistem untuk melihat jadwal anak dan kwitansi.
            </p>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Paket Terapi Aktif *
              </label>
              <select
                value={formData.packageId}
                onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} ({pkg.durationHours} Jam)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Guru Pembimbing *
              </label>
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {editingStudent ? 'Simpan Perubahan' : 'Tambah Siswa'}
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
